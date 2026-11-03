import type { Localized, WeeklySpan } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Tx } from '../src/platform/db/client.ts'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { descriptionFromPlain } from '@sk/domain/content'
import { Pool } from 'pg'
import { createMediaDirectory } from '../src/modules/catalog/adapters/media-directory.ts'
import { createProductRepository } from '../src/modules/catalog/adapters/product-repository.ts'
import { createSkuDirectory } from '../src/modules/catalog/adapters/sku-directory.ts'
import { makeCreateProduct, makePublishProduct } from '../src/modules/catalog/index.ts'
import { createCategoryRepository } from '../src/modules/content/adapters/category-repository.ts'
import { createKeepsakeLinks } from '../src/modules/content/adapters/keepsake-links.ts'
import { createMediaRepository } from '../src/modules/content/adapters/media-repository.ts'
import { mediaView } from '../src/modules/content/adapters/media-view.ts'
import { createPinRepository } from '../src/modules/content/adapters/pin-repository.ts'
import { createS3Storage } from '../src/modules/content/adapters/s3-storage.ts'
import { makeConfirmUpload, makeCreateCategory, makeCreatePin, makeDescribeMedia, makeProcessMedia, makePublishPin, makeRequestUpload } from '../src/modules/content/index.ts'
import { createStockRepository } from '../src/modules/inventory/adapters/stock-repository.ts'
import { makeReservedBySku, makeSeedStock, makeSetStock, makeStockLevels } from '../src/modules/inventory/index.ts'
import { createAuditLog } from '../src/platform/audit.ts'
import { systemClock } from '../src/platform/clock.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'
import { createS3Client } from '../src/platform/storage.ts'
import { isLocalDatabaseUrl } from './seed-guard.ts'
import { applyOpeningStock, describeDecision, loadOpeningStock, openingStockReady, planFromDatabase } from './seed-opening-stock.ts'
import { placeStoriesStep } from './seed-place-stories.ts'

// `pnpm --filter @sk/api db:seed:curated [--dry-run] [--stock-only]` loads the curated places, categories and keepsakes of
// `seed-data/curated/` into one store (owner, 2026-11-02). It only adds: a category, place or keepsake that exists is
// left alone, and nothing is updated or deleted. Everything goes through the content and catalog use cases, so the
// database rules, the audit rows and the publish checks hold. Photos go through the media path (signed PUT, confirm,
// process) and are deduplicated by sha256, so a second run uploads nothing. The guard and the store pick are those of
// `db:seed`: DATABASE_URL only, a remote host needs SEED_ALLOW_REMOTE_DATABASE=1, and the URL is never printed.
// One step is not add-only (standing order 16): the opening stock of `seed-data/curated/opening-stock.json` sets a stock row
// that still holds the migration's 0 with no history, through the inventory set-stock use case, as the store's owner.
// Faults in that plan (an unknown code, a SKU with no row, no owner) stop the run before anything is written.
// The last step adds the stories and editorial reviews of `seed-data/place-stories.ts` (seed-place-stories.ts, standing order 19):
// add-only, and a story becomes the main story of a place that has none. `--replace-legacy-stories` also deletes the 13 old
// stories once, through the Delete story use case. `--stories-only` runs that step alone.

// Its message names a record and a reason, never the connection string, so the entry point may print it.
class SeedError extends Error {
  override name = 'SeedError'
}

const urlLike = /postgres(?:ql)?:\/\/\S+/g

const trailingNumber = /-\d+$/

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, 'seed-data', 'curated')
const mediaDir = resolve(here, '..', '..', '.factory', 'runs', '20261029-sprint7-release1', 'seed-media')

export interface PlaceRecord {
  key: string
  title: Required<Localized>
  tip: Required<Localized>
  localTip: Required<Localized>
  latitude: number
  longitude: number
  address: string | null
  mapsLink: string | null
  weeklyHours: WeeklySpan[] | null
  stayTag: 'short_stay' | 'multi_day' | 'both'
  interests: string[]
  mustVisit: boolean
  outboundUrl: string | null
  categories: string[]
  dates: { firstDay: string, lastDay: string, startTime: string | null, endTime: string | null }[]
  photos: { file: string, alt: Required<Localized>, author?: string, licence?: string, sourcePage?: string }[]
}

export interface KeepsakeRecord {
  key: string
  skuCode: string
  name: Required<Localized>
  description: { en: string[], de: string[] }
  priceChf: number
  photos: { file: string, alt: Required<Localized> }[]
}

export interface CategorySpec {
  slug: string
  name: Required<Localized>
  parent: string | null
  showOnHome: boolean
}

// The category table of SEED-common.md. A category that the store has (same slug, or the same English name) is reused
// as it is; only the missing ones are created, parents first.
export const categorySpecs: CategorySpec[] = [
  { slug: 'sights', name: { en: 'Sights', de: 'Sehenswürdigkeiten' }, parent: null, showOnHome: false },
  { slug: 'bridges', name: { en: 'Bridges', de: 'Brücken' }, parent: 'sights', showOnHome: false },
  { slug: 'churches', name: { en: 'Churches', de: 'Kirchen' }, parent: 'sights', showOnHome: false },
  { slug: 'historic-buildings', name: { en: 'Historic buildings', de: 'Historische Bauten' }, parent: 'sights', showOnHome: false },
  { slug: 'squares', name: { en: 'Squares', de: 'Plätze' }, parent: 'sights', showOnHome: false },
  { slug: 'monuments', name: { en: 'Monuments', de: 'Denkmäler' }, parent: 'sights', showOnHome: false },
  { slug: 'viewpoints', name: { en: 'Viewpoints', de: 'Aussichtspunkte' }, parent: 'sights', showOnHome: false },
  { slug: 'food-and-drink', name: { en: 'Food and drink', de: 'Essen und Trinken' }, parent: null, showOnHome: false },
  { slug: 'chocolate', name: { en: 'Chocolate', de: 'Schokolade' }, parent: 'food-and-drink', showOnHome: false },
  { slug: 'cafes', name: { en: 'Cafés and bakeries', de: 'Cafés und Bäckereien' }, parent: 'food-and-drink', showOnHome: false },
  { slug: 'supermarkets', name: { en: 'Supermarkets', de: 'Supermärkte' }, parent: 'food-and-drink', showOnHome: false },
  { slug: 'shopping', name: { en: 'Shopping', de: 'Einkaufen' }, parent: null, showOnHome: false },
  { slug: 'department-stores', name: { en: 'Department stores', de: 'Warenhäuser' }, parent: 'shopping', showOnHome: false },
  { slug: 'free-essentials', name: { en: 'Free essentials', de: 'Gratis und praktisch' }, parent: null, showOnHome: false },
  { slug: 'toilets', name: { en: 'Toilets', de: 'Toiletten' }, parent: 'free-essentials', showOnHome: true },
  { slug: 'water', name: { en: 'Drinking water', de: 'Trinkwasser' }, parent: 'free-essentials', showOnHome: true },
  { slug: 'useful-info', name: { en: 'Useful info', de: 'Gut zu wissen' }, parent: null, showOnHome: false },
  { slug: 'holidays', name: { en: 'Public holidays', de: 'Feiertage' }, parent: 'useful-info', showOnHome: false },
  { slug: 'emergency', name: { en: 'Emergency', de: 'Notfall' }, parent: 'useful-info', showOnHome: false },
  { slug: 'boats-and-mountains', name: { en: 'Boats and mountains', de: 'Schiff und Berge' }, parent: 'useful-info', showOnHome: false },
]

export interface Snapshot {
  categories: { id: string, slug: string, nameEn: string | null }[]
  placeTitles: Set<string>
  keepsakeNames: Set<string>
  hashes: Set<string>
}

export interface Data {
  places: { group: string, record: PlaceRecord }[]
  keepsakes: KeepsakeRecord[]
}

export interface Plan {
  categoriesToCreate: CategorySpec[]
  placesToCreate: { group: string, record: PlaceRecord }[]
  placesSkipped: string[]
  keepsakesToCreate: KeepsakeRecord[]
  keepsakesSkipped: string[]
}

// A plain English title decides "exists", as the brief says: the same title in the same store.
export function buildPlan(data: Data, snapshot: Snapshot): Plan {
  const has = (spec: CategorySpec) => snapshot.categories.some(row => row.slug === spec.slug || row.nameEn === spec.name.en)
  const places = data.places.map(entry => ({ entry, exists: snapshot.placeTitles.has(entry.record.title.en) }))
  const keepsakes = data.keepsakes.map(record => ({ record, exists: snapshot.keepsakeNames.has(record.name.en) }))
  return {
    categoriesToCreate: categorySpecs.filter(spec => !has(spec)),
    placesToCreate: places.filter(p => !p.exists).map(p => p.entry),
    placesSkipped: places.filter(p => p.exists).map(p => p.entry.record.title.en),
    keepsakesToCreate: keepsakes.filter(k => !k.exists).map(k => k.record),
    keepsakesSkipped: keepsakes.filter(k => k.exists).map(k => k.record.name.en),
  }
}

// The draft of a place with every field of the record. The first photo is the cover, the others are its extra photos.
// A closing time before the opening time runs past midnight, which the pin model keeps as it is. Null opening hours
// mean none are known, which the pin stores as an empty list.
export function placeChanges(record: PlaceRecord, categoryIds: string[], mediaIds: string[]) {
  const [cover, ...rest] = record.photos
  return {
    title: { ...record.title },
    tip: { ...record.tip },
    localTip: { ...record.localTip },
    latitude: record.latitude,
    longitude: record.longitude,
    address: record.address,
    mapsLink: record.mapsLink,
    weeklyHours: (record.weeklyHours ?? []).map(span => ({ ...span })),
    stayTag: record.stayTag,
    interests: record.interests,
    mustVisit: record.mustVisit,
    outboundUrl: record.outboundUrl,
    categoryIds,
    dates: record.dates,
    coverMediaId: cover ? mediaIds[0]! : null,
    coverAlt: cover ? { ...cover.alt } : {},
    photos: rest.map((photo, index) => ({ mediaId: mediaIds[index + 1]!, alt: { ...photo.alt } })),
  }
}

// One keepsake with one variant and no options, in Rappen. The paragraphs become the Tiptap document of each language.
export function productInput(record: KeepsakeRecord, photoIds: string[]) {
  const text: Record<'en' | 'de', NonNullable<ReturnType<typeof descriptionFromPlain>>> = {} as never
  for (const language of ['en', 'de'] as const) {
    const doc = descriptionFromPlain(record.description[language].join('\n\n'))
    if (!doc)
      throw new SeedError(`Keepsake ${record.key} has no ${language} description`)
    text[language] = doc
  }
  return {
    name: { ...record.name },
    text,
    photoIds,
    commissionRate: 0,
    options: [],
    variants: [{ skuCode: record.skuCode, mediaId: null, priceRappen: Math.round(record.priceChf * 100), status: 'published' as const, values: {} }],
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as T
}

export function loadData(): Data {
  const groups = [['places-sights.json', 'sights'], ['places-shops-toilets.json', 'shops-toilets'], ['places-useful-info.json', 'useful-info']] as const
  return {
    places: groups.flatMap(([file, group]) => readJson<PlaceRecord[]>(file).map(record => ({ group, record }))),
    keepsakes: readJson<KeepsakeRecord[]>('keepsakes.json'),
  }
}

async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function pickStore(pool: Pool): Promise<string | undefined> {
  const wanted = process.env.SEED_STORE_ID
  if (wanted) {
    const { rows } = await pool.query<{ id: string }>('select id from identity.stores where id::text = $1', [wanted])
    if (!rows[0])
      process.stderr.write('SEED_STORE_ID names no store. Nothing was written.\n')
    return rows[0]?.id
  }
  const { rows } = await pool.query<{ id: string }>('select id from identity.stores limit 2')
  if (rows.length !== 1)
    process.stderr.write(`${rows.length === 0 ? 'There is no store' : 'There is more than one store'}. Set SEED_STORE_ID to the store to seed. Nothing was written.\n`)
  return rows.length === 1 ? rows[0]!.id : undefined
}

// Four plain reads, valid before and after migration 0016, so a dry run works on any state.
async function readSnapshot(pool: Pool, storeId: string): Promise<Snapshot> {
  const [categories, places, products, media] = await Promise.all([
    pool.query<{ id: string, slug: string, name_en: string | null }>(`select id, slug, name->>'en' as name_en from content.map_categories where store_id = $1`, [storeId]),
    pool.query<{ t: string | null }>(`select coalesce(draft->'name'->>'en', published->'name'->>'en') as t from content.places where store_id = $1`, [storeId]),
    pool.query<{ t: string | null }>(`select coalesce(draft->'name'->>'en', published->'name'->>'en') as t from catalog.products where store_id = $1`, [storeId]),
    pool.query<{ sha256: string }>(`select sha256 from content.media where store_id = $1 and status = 'ready'`, [storeId]),
  ])
  return {
    categories: categories.rows.map(row => ({ id: row.id, slug: row.slug, nameEn: row.name_en })),
    placeTitles: new Set(places.rows.flatMap(row => (row.t ? [row.t] : []))),
    keepsakeNames: new Set(products.rows.flatMap(row => (row.t ? [row.t] : []))),
    hashes: new Set(media.rows.map(row => row.sha256)),
  }
}

async function hasHomeColumn(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'content' and table_name = 'map_categories' and column_name = 'show_on_home'`)
  return rows.length === 1
}

interface Photo { dir: string, file: string, alt: Required<Localized> }

function photosOf(group: string, photos: { file: string, alt: Required<Localized> }[]): Photo[] {
  return photos.map(photo => ({ dir: group, file: photo.file, alt: photo.alt }))
}

function printPlan(plan: Plan, snapshot: Snapshot, photos: Map<string, Uint8Array>, dry: boolean) {
  const lines = [
    `${dry ? 'Would create' : 'Creating'} ${plan.categoriesToCreate.length} categories: ${plan.categoriesToCreate.map(c => c.slug).join(', ') || '-'}`,
    `${dry ? 'Would create' : 'Creating'} ${plan.placesToCreate.length} places, skipping ${plan.placesSkipped.length}${plan.placesSkipped.length ? ` (${plan.placesSkipped.join('; ')})` : ''}`,
    `${dry ? 'Would create' : 'Creating'} ${plan.keepsakesToCreate.length} keepsakes, skipping ${plan.keepsakesSkipped.length}${plan.keepsakesSkipped.length ? ` (${plan.keepsakesSkipped.join('; ')})` : ''}`,
  ]
  const newFiles = [...photos.values()].filter(bytes => !snapshot.hashes.has(createHash('sha256').update(bytes).digest('hex'))).length
  lines.push(`Photos: ${photos.size} files named, ${newFiles} not in the library yet`)
  process.stdout.write(`${lines.join('\n')}\n`)
}

// `--stock-only` runs the opening-stock step alone: no category, place or keepsake is planned or created (owner, 2026-11-03).
// `--stories-only` does the same for the stories step, and `--replace-legacy-stories` adds the one-time delete of the old stories to it.
// A flag that is not known stops the run, so a typo cannot start the full seed.
const knownFlags = ['--dry-run', '--stock-only', '--stories-only', '--replace-legacy-stories']
export function parseFlags(argv: readonly string[]) {
  return {
    dry: argv.includes('--dry-run'),
    stockOnly: argv.includes('--stock-only'),
    storiesOnly: argv.includes('--stories-only'),
    replaceLegacyStories: argv.includes('--replace-legacy-stories'),
    unknown: argv.filter(arg => !knownFlags.includes(arg)),
  }
}

// Prints the opening-stock plan. Returns 1 when it has faults (nothing is written then), otherwise undefined.
function reportStockPlan(plan: Awaited<ReturnType<typeof planFromDatabase>>): 1 | undefined {
  process.stdout.write(`Opening stock, acting as owner ${plan.ownerUserId ?? '(none)'}:\n${plan.decisions.map(decision => `  ${describeDecision(decision)}`).join('\n')}\n`)
  if (plan.faults.length === 0)
    return undefined
  process.stderr.write(`${plan.faults.join('\n')}\nNothing was written.\n`)
  return 1
}

// Exported for the integration test of the dry run.
export async function stockOnly(pool: Pool, storeId: string, dry: boolean): Promise<number> {
  const quantities = loadOpeningStock()
  const inventoryReady = await openingStockReady(pool)
  process.stdout.write(`Inventory tables (migration 0021): ${inventoryReady ? 'present' : 'missing'}\n`)
  const stockPlan = inventoryReady ? await planFromDatabase(pool, storeId, quantities) : undefined
  if (stockPlan && reportStockPlan(stockPlan))
    return 1
  if (dry)
    return 0
  if (!inventoryReady) {
    process.stderr.write('Migration 0021 is not applied to this database. Nothing was written.\n')
    return 3
  }
  return await openingStock(pool, storeId, quantities)
}

async function main(): Promise<number> {
  const { dry, stockOnly: onlyStock, storiesOnly, replaceLegacyStories, unknown } = parseFlags(process.argv.slice(2))
  if (unknown.length > 0) {
    process.stderr.write(`Unknown flag: ${unknown.join(' ')}. Known: ${knownFlags.join(', ')}. Nothing was written.\n`)
    return 2
  }
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write('DATABASE_URL is not set.\n')
    return 2
  }
  if (!isLocalDatabaseUrl(url) && process.env.SEED_ALLOW_REMOTE_DATABASE !== '1') {
    process.stderr.write('Refused: host is not local. Set SEED_ALLOW_REMOTE_DATABASE=1 to seed a remote database. Nothing was written.\n')
    return 2
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 })
  try {
    const storeId = await pickStore(pool)
    if (!storeId)
      return 1
    if (onlyStock)
      return await stockOnly(pool, storeId, dry)
    if (storiesOnly)
      return await placeStoriesStep(pool, storeId, { dry, replaceLegacy: replaceLegacyStories })
    const data = loadData()
    const snapshot = await readSnapshot(pool, storeId)
    const plan = buildPlan(data, snapshot)
    const files = new Map<string, Uint8Array>()
    const wanted: Photo[] = [...plan.placesToCreate.flatMap(p => photosOf(p.group, p.record.photos)), ...plan.keepsakesToCreate.flatMap(k => photosOf('keepsakes', k.photos))]
    for (const photo of wanted) {
      const key = `${photo.dir}/${photo.file}`
      if (!files.has(key))
        files.set(key, readFileSync(join(mediaDir, photo.dir, photo.file)))
    }
    const homeColumn = await hasHomeColumn(pool)
    printPlan(plan, snapshot, files, dry)
    process.stdout.write(`Home column (migration 0016): ${homeColumn ? 'present' : 'missing'}\n`)
    const quantities = loadOpeningStock()
    const inventoryReady = await openingStockReady(pool)
    process.stdout.write(`Inventory tables (migration 0021): ${inventoryReady ? 'present' : 'missing'}\n`)
    // Planned before any write, with the keepsakes still to be created counted as 0 to their quantity.
    const stockPlan = inventoryReady ? await planFromDatabase(pool, storeId, quantities, new Set(plan.keepsakesToCreate.map(record => record.skuCode))) : undefined
    if (stockPlan && reportStockPlan(stockPlan))
      return 1
    if (dry) {
      // The stories need their places; on a database that has none yet they are planned after the places exist.
      if (plan.placesToCreate.length > 0) {
        process.stdout.write('Stories: planned after the places exist.\n')
        return 0
      }
      return await placeStoriesStep(pool, storeId, { dry, replaceLegacy: replaceLegacyStories })
    }
    // The content use cases read the home column, so nothing can be written until migration 0016 is applied.
    if (!homeColumn) {
      process.stderr.write('Migration 0016 is not applied to this database. Nothing was written.\n')
      return 3
    }
    if (!inventoryReady) {
      process.stderr.write('Migration 0021 is not applied to this database. Nothing was written.\n')
      return 3
    }
    if (plan.categoriesToCreate.length + plan.placesToCreate.length + plan.keepsakesToCreate.length === 0)
      process.stdout.write('Nothing to create.\n')
    else if (await run(pool, storeId, data, plan, snapshot, files) !== 0)
      return 1
    const stockCode = await openingStock(pool, storeId, quantities)
    return stockCode !== 0 ? stockCode : await placeStoriesStep(pool, storeId, { dry, replaceLegacy: replaceLegacyStories })
  }
  finally {
    await pool.end()
  }
}

// Runs after the keepsakes exist, also on a second run. The plan is read again from the database, so a row that a person
// set in between is skipped.
export async function openingStock(pool: Pool, storeId: string, quantities: Record<string, number>): Promise<number> {
  const plan = await planFromDatabase(pool, storeId, quantities)
  if (plan.faults.length > 0 || !plan.ownerUserId) {
    process.stderr.write(`${plan.faults.join('\n')}\nNo opening stock was written.\n`)
    return 1
  }
  const stock = createStockRepository()
  const inventoryDeps = { uow: createUnitOfWork(createDatabase(pool)), stock, skus: createSkuDirectory(), media: { find: async () => [] }, audit: createAuditLog(systemClock), clock: systemClock }
  const changed = await applyOpeningStock(makeSetStock(inventoryDeps), storeId, plan.ownerUserId, plan.decisions)
  process.stdout.write(`Opening stock: ${changed} set, ${plan.decisions.length - changed} skipped.${changed === 0 ? ' Nothing was changed.' : ''}\n`)
  return 0
}

async function run(pool: Pool, storeId: string, data: Data, plan: Plan, snapshot: Snapshot, files: Map<string, Uint8Array>): Promise<number> {
  const { AWS_ENDPOINT_URL_S3: endpoint, AWS_REGION: region, AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey } = process.env
  if (files.size > 0 && !(endpoint && region && accessKeyId && secretAccessKey)) {
    process.stderr.write('AWS_* object storage settings are not set. Nothing was written.\n')
    return 2
  }
  const db = createDatabase(pool)
  const uow = createUnitOfWork(db)
  const audit = createAuditLog(systemClock)
  const storage = createS3Storage(createS3Client({ endpoint: endpoint ?? '', region: region ?? '', accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' }), endpoint ?? '')
  // The seed acts as an owner of the store, so the use cases' own access rule passes.
  const actor: Actor = { kind: 'staff', userId: 'seed-curated', guestId: 'seed-curated', stores: new Map([[storeId, 'owner' as const]]) }
  const media = createMediaRepository()
  const pins = createPinRepository()
  const pinDeps = { uow, pins, media, audit, clock: systemClock }
  const createCategory = makeCreateCategory({ uow, categories: createCategoryRepository(), audit, clock: systemClock })
  const requestUpload = makeRequestUpload({ storage, clock: systemClock, newId: () => crypto.randomUUID() })
  // The seed runs the media job itself right after the confirm, so no queue is needed: the job is not sent.
  const confirmUpload = makeConfirmUpload({ uow, media, storage, jobs: { send: async () => {} }, audit, clock: systemClock, newId: () => crypto.randomUUID() })
  const processMedia = makeProcessMedia({ uow, media, storage, clock: systemClock })
  const describeMedia = makeDescribeMedia({ uow, media, audit, clock: systemClock })
  const createPin = makeCreatePin(pinDeps)
  const publishPin = makePublishPin(pinDeps)
  const stockRepository = createStockRepository()
  const catalogDeps = {
    uow,
    products: createProductRepository(),
    media: createMediaDirectory({ findById: (tx: Tx, id: string, mediaId: string) => media.findById(tx, id, mediaId), view: row => mediaView(row, storage.publicUrl) }),
    audit,
    clock: systemClock,
    keepsakeLinks: createKeepsakeLinks(),
    // A new keepsake gets its stock row of 0 in its own write (ADR-013); the opening stock is set afterwards.
    stock: { seed: makeSeedStock({ stock: stockRepository }) },
    reservations: { reservedBySku: makeReservedBySku({ stock: stockRepository }) },
    stockLevels: { levels: makeStockLevels({ stock: stockRepository }) },
  }
  const createProduct = makeCreateProduct(catalogDeps)
  const publishProduct = makePublishProduct(catalogDeps)

  // Categories: each create takes the list lock and numbers itself after its siblings, so they go one at a time,
  // parents first (the spec table is in that order). The ids of the categories that exist are read once.
  const ids = new Map(snapshot.categories.map(row => [row.slug, row.id]))
  for (const spec of categorySpecs) {
    const existing = snapshot.categories.find(row => row.slug === spec.slug || row.nameEn === spec.name.en)
    if (existing) {
      ids.set(spec.slug, existing.id)
      continue
    }
    const created = await createCategory(actor, storeId, 'map', { name: spec.name, parentId: spec.parent ? ids.get(spec.parent) ?? null : null, showOnHome: spec.showOnHome }, null)
    if (!created.ok)
      throw new SeedError(`Category ${spec.slug} was refused: ${created.reason}`)
    ids.set(spec.slug, created.value.id)
  }

  // Photos: one upload per distinct file, 4 at a time. A file whose bytes are in the library already is reused.
  const known = new Map<string, string>()
  const library = await pool.query<{ id: string, sha256: string }>(`select distinct on (sha256) id, sha256 from content.media where store_id = $1 and status = 'ready' order by sha256, created_at, id`, [storeId])
  for (const row of library.rows)
    known.set(row.sha256, row.id)
  const altByFile = new Map<string, Required<Localized>>()
  for (const place of plan.placesToCreate) {
    for (const photo of place.record.photos)
      altByFile.set(`${place.group}/${photo.file}`, altByFile.get(`${place.group}/${photo.file}`) ?? photo.alt)
  }
  for (const keepsake of plan.keepsakesToCreate) {
    for (const photo of keepsake.photos)
      altByFile.set(`keepsakes/${photo.file}`, altByFile.get(`keepsakes/${photo.file}`) ?? photo.alt)
  }
  const mediaIdByFile = new Map<string, string>()
  const counts = { uploaded: 0, reused: 0 }
  const distinct = [...files.entries()]
  // Two files with the same bytes upload once: the first to finish records its hash.
  const bySha = new Map<string, Promise<string>>()
  await mapLimit(distinct, 4, async ([key, bytes]) => {
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = known.get(sha256)
    if (existing) {
      counts.reused += 1
      mediaIdByFile.set(key, existing)
      return
    }
    let pending = bySha.get(sha256)
    if (!pending) {
      pending = upload(key, bytes)
      bySha.set(sha256, pending)
    }
    mediaIdByFile.set(key, await pending)
  })

  async function upload(key: string, bytes: Uint8Array): Promise<string> {
    const name = key.slice(key.lastIndexOf('/') + 1)
    const contentType = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    const grant = await requestUpload(actor, storeId, { contentType, byteSize: bytes.byteLength })
    if (!grant.ok)
      throw new SeedError(`Upload of ${key} was refused: ${grant.reason}`)
    const put = await fetch(grant.value.url, { method: grant.value.method, headers: grant.value.headers, body: bytes })
    if (!put.ok)
      throw new SeedError(`The storage refused the PUT of ${key}: ${put.status}`)
    const confirmed = await confirmUpload(actor, storeId, { uploadKey: grant.value.uploadKey, fileName: name }, null)
    if (!confirmed.ok)
      throw new SeedError(`Confirm of ${key} was refused: ${confirmed.reason}`)
    await processMedia({ storeId, mediaId: confirmed.value.id })
    const alt = altByFile.get(key)
    if (alt) {
      const described = await describeMedia(actor, storeId, confirmed.value.id, { alt }, null)
      if (!described.ok)
        throw new SeedError(`Alt text of ${key} was refused: ${described.reason}`)
    }
    counts.uploaded += 1
    return confirmed.value.id
  }

  const mediaIdsOf = (group: string, photos: { file: string }[]) => photos.map(photo => mediaIdByFile.get(`${group}/${photo.file}`)!)

  // Places: one at a time. Four at a time failed once on dev with a bare error that left two drafts unpublished, and
  // each create and publish takes the platform-wide slug lock anyway, so there is little to gain.
  const created = { places: 0, keepsakes: 0 }
  const suffixed: string[] = []
  await mapLimit(plan.placesToCreate, 1, async ({ group, record }) => {
    const categoryIds = record.categories.map((slug) => {
      const id = ids.get(slug)
      if (!id)
        throw new SeedError(`Place ${record.key} names the unknown category ${slug}`)
      return id
    })
    const draft = await createPin(actor, storeId, placeChanges(record, categoryIds, mediaIdsOf(group, record.photos)), null)
    if (!draft.ok)
      throw new SeedError(`Place ${record.key} was refused: ${draft.reason}${'gaps' in draft ? ` ${draft.gaps.join(',')}` : ''}`)
    const live = await publishPin(actor, storeId, draft.value.id, draft.value.rowVersion, null)
    if (!live.ok)
      throw new SeedError(`Place ${record.key} was not published: ${live.reason}${'gaps' in live ? ` ${live.gaps.join(',')}` : ''}`)
    created.places += 1
    if (Object.values(live.value.slug ?? {}).some(slug => trailingNumber.test(slug)))
      suffixed.push(`${record.key} -> ${JSON.stringify(live.value.slug)}`)
  })

  // Keepsakes: five rows, one after the other, because publishing reads the slugs that the earlier ones took.
  for (const record of plan.keepsakesToCreate) {
    const draft = await createProduct(actor, storeId, productInput(record, mediaIdsOf('keepsakes', record.photos)), null)
    if (!draft.ok)
      throw new SeedError(`Keepsake ${record.key} was refused: ${draft.reason}`)
    const live = await publishProduct(actor, storeId, draft.value.product.id, draft.value.product.rowVersion, null)
    if (!live.ok)
      throw new SeedError(`Keepsake ${record.key} was not published: ${live.reason}${'gaps' in live ? ` ${live.gaps.join(',')}` : ''}`)
    created.keepsakes += 1
  }

  process.stdout.write(`Created ${plan.categoriesToCreate.length} categories, ${created.places} places (published), ${created.keepsakes} keepsakes (published); ${counts.uploaded} photos uploaded, ${counts.reused} reused. Places in the data: ${data.places.length}.\n`)
  if (suffixed.length > 0)
    process.stdout.write(`Slugs with a number: ${suffixed.join('; ')}\n`)
  return 0
}

// The tests import the mapping above, so the run starts only when the file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => {
      process.exitCode = code
    },
    (error) => {
      // The error's message can quote the connection string, so only its type and code are printed.
      const { name, code, message } = error as { name?: string, code?: string, message?: string }
      const own = error instanceof SeedError ? ` ${message}` : ` ${(message ?? '').replace(urlLike, '<url>').slice(0, 400)}${(error as { cause?: { message?: string } }).cause?.message ? ` cause: ${(error as { cause: { message: string } }).cause.message.replace(urlLike, '<url>').slice(0, 300)}` : ''}`
      process.stderr.write(`The seed failed: ${name ?? 'Error'}${code ? ` ${code}` : ''}${own}\n`)
      process.exitCode = 1
    },
  )
}
