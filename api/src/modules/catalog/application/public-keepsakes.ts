import type { ContentLanguage, LanguageNotice } from '@sk/domain/content'
import type { Localized, LocalizedDoc, MediaDirectory, MediaInfo, PickupPlaceRepository, ProductOption, StockLevel, StockLevels, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { descriptionLanguages, languageNotice, languagesOf } from '@sk/domain/content'
import { fail, ok } from './failure.ts'

// The public reads of keepsakes (E6.4). They take no actor and no store: a published keepsake is public and one list
// covers all stores, as the content module's public reads do. The list and the detail carry no price and no stock
// figure (AC54); only the availability read does. Stock comes through the `stockLevels` port (ADR-013).

// A published keepsake as the repository reads it. `slug` and `name` are the published ones; `skuIds` are the variants
// for sale (status published), in a stable order.
export interface PublicKeepsakeSummary {
  id: string
  storeId: string
  slug: Localized
  name: Localized
  text: LocalizedDoc
  // The published photos in the merchant's order.
  mediaIds: string[]
  skuIds: string[]
}

export interface PublicKeepsakeRow extends PublicKeepsakeSummary {
  options: ProductOption[]
  // The combinations for sale, never a draft or an archived one.
  variants: { id: string, mediaId: string | null, priceRappen: number, values: Record<string, string> }[]
}

// Where a page of keepsakes starts: `created_at` (as text at full precision, UTC) and the product id.
export type KeepsakePageKey = readonly [createdAt: string, id: string]

export interface KeepsakePageQuery {
  // A product category slug; a parent includes its direct sub-categories. Null: no filter. An unknown slug matches nothing.
  category: string | null
  // Without a limit the page is the whole filtered set (ADR-033 section 12, one release).
  limit?: number | undefined
  after?: KeepsakePageKey | undefined
}

// Where a page of search hits starts: the rank (a double as text), the id and the kind of the last hit seen, best first.
export type KeepsakeSearchKey = readonly [score: string, id: string, kind: string]

export interface KeepsakeSearchQuery {
  // The typed text, or null when the search is by interest only (every hit then ranks 0).
  q: string | null
  limit: number
  after?: KeepsakeSearchKey | undefined
}

export interface PublicKeepsakeReads<T> {
  // Published keepsakes whose name matches, best first: `limit + 1` hits after `after` (the extra one says another page
  // follows; none are read when `limit` is 0), and how many match in all. A hit is the id and its rank as text.
  searchPublished: (tx: T, query: KeepsakeSearchQuery) => Promise<{ hits: { id: string, score: string }[], count: number }>
  // Published keepsakes of every store, newest first (`created_at`, then the id). `total` counts the whole filtered set.
  // `next` is the key of the last row when more follow, else null.
  pagePublished: (tx: T, query: KeepsakePageQuery) => Promise<{ rows: PublicKeepsakeSummary[], next: KeepsakePageKey | null, total: number }>
  // The published ones among these ids, in no set order; an id that is no published keepsake has no row.
  listPublishedByIds: (tx: T, ids: string[]) => Promise<PublicKeepsakeSummary[]>
  // The published keepsake that holds this slug in either language, the one that holds it in `language` first. A draft
  // and an archived keepsake have no row.
  findPublishedBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicKeepsakeRow | undefined>
}

export interface PublicKeepsakeDeps<T> {
  uow: UnitOfWork<T>
  reads: PublicKeepsakeReads<T>
  media: MediaDirectory<T>
  // Left out in a test, every figure reads 0 and every keepsake reads sold out.
  stockLevels?: StockLevels<T>
}

// The pickup read lists the store's active points through the pickup repository's own `list` (the same module, ADR-013).
export interface PublicPickupDeps<T> extends PublicKeepsakeDeps<T> {
  pickups: Pick<PickupPlaceRepository<T>, 'list'>
}

export interface PublicKeepsakePhoto { url: string, variants: { width: number, url: string }[] }

export interface PublicKeepsakeCard extends LanguageNotice {
  id: string
  slug: string
  name: string
  cover: PublicKeepsakePhoto | null
  soldOut: boolean
}

// The cards of the by-ids read (a story's keepsakes): no paging.
export interface PublicKeepsakeList { items: PublicKeepsakeCard[] }

// A page of the keepsake list. The route encodes `next` into the opaque `nextCursor` of the contract.
export interface PublicKeepsakePage { items: PublicKeepsakeCard[], total: number, next: KeepsakePageKey | null }

export interface ListKeepsakesQuery {
  language: ContentLanguage
  category?: string | undefined
  limit?: number | undefined
  after?: KeepsakePageKey | undefined
}

export interface PublicKeepsake extends PublicKeepsakeCard {
  description: { type: 'doc', content: { type: string, attrs?: Record<string, unknown>, content?: unknown[], text?: string, marks?: unknown[] }[] }
  photos: PublicKeepsakePhoto[]
  options: { id: string, name: string, values: { id: string, label: string }[] }[]
  variants: { id: string, values: Record<string, string>, photo: PublicKeepsakePhoto | null }[]
  otherSlug: string | null
}

// A point as a guest sees it: the text in one language and nothing the merchant's screens use to manage it.
export interface PublicPickupPoint {
  id: string
  name: string
  address: string
  instructions: string | null
  mapsUrl: string
  hours: { weekday: number, opens: string, closes: string }[]
}

export interface PublicPickupPoints { items: PublicPickupPoint[] }

export interface PublicKeepsakeAvailability {
  items: { variantId: string, priceRappen: number, currency: 'CHF', available: number }[]
}

const other = (language: ContentLanguage): ContentLanguage => (language === 'en' ? 'de' : 'en')

// The languages a guest can read: a name, a text and a slug (ADR-014). The same rule as the publish check.
function languagesOfRow(row: PublicKeepsakeSummary): ContentLanguage[] {
  const named = languagesOf(row.name)
  const written = descriptionLanguages(row.text)
  return (['en', 'de'] as const).filter(language => named.includes(language) && written.includes(language) && !!row.slug[language])
}

// The requested language when the keepsake has it, else the other one, else nothing to show.
const notice = (row: PublicKeepsakeSummary, requested: ContentLanguage): LanguageNotice | null => languageNotice(languagesOfRow(row), requested)

const unitsOf = (level: StockLevel | undefined) => Math.max(0, level ? level.onHand - level.reserved : 0)

// The stock of every SKU, read once per store: the port takes one store at a time.
async function stockOf<T>(deps: PublicKeepsakeDeps<T>, tx: T, rows: { storeId: string, skuIds: string[] }[]): Promise<Map<string, StockLevel>> {
  const byStore = new Map<string, string[]>()
  for (const row of rows)
    byStore.set(row.storeId, [...(byStore.get(row.storeId) ?? []), ...row.skuIds])
  const found = new Map<string, StockLevel>()
  if (!deps.stockLevels)
    return found
  for (const [storeId, skuIds] of byStore) {
    if (skuIds.length === 0)
      continue
    for (const [skuId, level] of await deps.stockLevels.levels(tx, storeId, skuIds))
      found.set(skuId, level)
  }
  return found
}

// The ready photos among the files asked for, by media id. A file that is gone, retired or not an image is left out.
async function photosOf<T>(media: MediaDirectory<T>, tx: T, storeId: string, ids: string[]): Promise<Map<string, PublicKeepsakePhoto>> {
  const files = ids.length > 0 ? await media.find(tx, storeId, ids) : []
  const ready = (file: MediaInfo) => file.status === 'ready' && file.kind === 'image' && file.publicUrl !== null
  return new Map(files.filter(ready).map(file => [file.id.toLowerCase(), { url: file.publicUrl!, variants: file.variants }]))
}

const soldOutOf = (skuIds: string[], stock: Map<string, StockLevel>) => skuIds.every(id => unitsOf(stock.get(id)) === 0)

function card(row: PublicKeepsakeSummary, language: LanguageNotice, cover: PublicKeepsakePhoto | null, stock: Map<string, StockLevel>): PublicKeepsakeCard {
  return {
    id: row.id,
    slug: row.slug[language.language]!,
    name: row.name[language.language]!,
    cover,
    soldOut: soldOutOf(row.skuIds, stock),
    ...language,
  }
}

// The cards of these rows in the language asked for, or the other one with the fallback notice; a row with no readable
// language is left out. Stock is read once per store and covers once per store.
async function cardsOf<T>(deps: PublicKeepsakeDeps<T>, tx: T, rows: PublicKeepsakeSummary[], requested: ContentLanguage): Promise<PublicKeepsakeCard[]> {
  const shown = rows.flatMap((row) => {
    const language = notice(row, requested)
    return language ? [{ row, language }] : []
  })
  const stock = await stockOf(deps, tx, shown.map(item => item.row))
  const coversByStore = new Map<string, string[]>()
  for (const { row } of shown) {
    const first = row.mediaIds[0]
    if (first)
      coversByStore.set(row.storeId, [...(coversByStore.get(row.storeId) ?? []), first])
  }
  const covers = new Map<string, PublicKeepsakePhoto>()
  for (const [storeId, ids] of coversByStore) {
    for (const [id, photo] of await photosOf(deps.media, tx, storeId, ids))
      covers.set(id, photo)
  }
  return shown.map(({ row, language }) => card(row, language, covers.get(row.mediaIds[0]?.toLowerCase() ?? '') ?? null, stock))
}

// A page of the published keepsakes in the language asked for, or the other one with the fallback notice, newest first. Each
// carries a cover and a sold-out flag and nothing about price or units. The filter, the order and the count run in the
// repository (ADR-033).
export function makeListKeepsakes<T>(deps: PublicKeepsakeDeps<T>) {
  return async ({ language, category, limit, after }: ListKeepsakesQuery): Promise<PublicKeepsakePage> => deps.uow.run(async (tx) => {
    const found = await deps.reads.pagePublished(tx, { category: category ?? null, limit, after })
    return { items: await cardsOf(deps, tx, found.rows, language), total: found.total, next: found.next }
  })
}

// The ranked hits of a search among the published keepsakes (the content module's search asks for them through a port, ADR-013).
// A keepsake has no interests: it matches the interest tile "shopping-keepsakes" and no other tile, as the screen always did.
export function makeSearchKeepsakeHits<T>(deps: PublicKeepsakeDeps<T>) {
  return async ({ q, interest, limit, after }: { q: string | null, interest: string | null, limit: number, after?: KeepsakeSearchKey | undefined }) => {
    if (interest !== null && interest !== 'shopping-keepsakes')
      return { hits: [], count: 0 }
    const found = await deps.uow.run(tx => deps.reads.searchPublished(tx, { q, limit, after }))
    return { hits: found.hits.map(hit => ({ kind: 'keepsake' as const, ...hit })), count: found.count }
  }
}

// The same cards for the published keepsakes among `ids`, in the order of `ids` (the story's order). An id that is no
// published keepsake is skipped. A story reads at most a few, so this is not the whole list.
export function makeListKeepsakesByIds<T>(deps: PublicKeepsakeDeps<T>) {
  return async (ids: string[], requested: ContentLanguage): Promise<PublicKeepsakeList> => {
    if (ids.length === 0)
      return { items: [] }
    return deps.uow.run(async (tx) => {
      const byId = new Map((await deps.reads.listPublishedByIds(tx, ids)).map(row => [row.id, row]))
      return { items: await cardsOf(deps, tx, ids.flatMap(id => byId.get(id) ?? []), requested) }
    })
  }
}

const label = (text: Localized, language: ContentLanguage) => text[language] ?? text[other(language)] ?? ''

export function makeGetKeepsake<T>(deps: PublicKeepsakeDeps<T>) {
  return async (slug: string, requested: ContentLanguage): Promise<Result<PublicKeepsake>> => deps.uow.run(async (tx) => {
    const row = await deps.reads.findPublishedBySlug(tx, slug, requested)
    const language = row && notice(row, requested)
    if (!row || !language)
      return fail({ reason: 'not-found' })
    const photos = await photosOf(deps.media, tx, row.storeId, [...row.mediaIds, ...row.variants.flatMap(variant => variant.mediaId ?? [])])
    const stock = await stockOf(deps, tx, [row])
    const shown = row.mediaIds.flatMap(id => photos.get(id.toLowerCase()) ?? [])
    const otherLanguage = other(language.language)
    return ok({
      ...card(row, language, shown[0] ?? null, stock),
      description: row.text[language.language] as PublicKeepsake['description'],
      photos: shown,
      options: row.options.map(option => ({ id: option.id, name: label(option.name, language.language), values: option.values.map(value => ({ id: value.id, label: label(value.label, language.language) })) })),
      variants: row.variants.map(variant => ({ id: variant.id, values: variant.values, photo: variant.mediaId ? photos.get(variant.mediaId.toLowerCase()) ?? null : null })),
      otherSlug: language.availableLanguages.includes(otherLanguage) ? row.slug[otherLanguage] ?? null : null,
    })
  })
}

// The only public read with a price: each combination for sale with its price in CHF and the units a guest can still buy.
export function makeGetAvailability<T>(deps: PublicKeepsakeDeps<T>) {
  return async (slug: string, requested: ContentLanguage): Promise<Result<PublicKeepsakeAvailability>> => deps.uow.run(async (tx) => {
    const row = await deps.reads.findPublishedBySlug(tx, slug, requested)
    if (!row || !notice(row, requested))
      return fail({ reason: 'not-found' })
    const stock = await stockOf(deps, tx, [row])
    return ok({ items: row.variants.map(variant => ({ variantId: variant.id, priceRappen: variant.priceRappen, currency: 'CHF' as const, available: unitsOf(stock.get(variant.id)) })) })
  })
}

// The active pickup points of the store that owns the keepsake, by the merchant's order, in the language asked for with
// the other one as the fallback. An unpublished, archived or unknown keepsake is a 404; a store with no point is an empty list.
export function makeGetPickupPoints<T>(deps: PublicPickupDeps<T>) {
  return async (slug: string, requested: ContentLanguage): Promise<Result<PublicPickupPoints>> => deps.uow.run(async (tx) => {
    const row = await deps.reads.findPublishedBySlug(tx, slug, requested)
    if (!row || !notice(row, requested))
      return fail({ reason: 'not-found' })
    const places = await deps.pickups.list(tx, row.storeId, false)
    return ok({
      items: places.map(place => ({
        id: place.id,
        name: label(place.name, requested),
        address: label(place.address, requested),
        instructions: place.instructions ? label(place.instructions, requested) || null : null,
        mapsUrl: place.mapsLink,
        hours: place.hours.map(span => ({ weekday: span.weekday, opens: span.opens, closes: span.closes })),
      })),
    })
  })
}
