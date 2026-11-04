import type { ContentLanguage } from '@sk/domain/content'
import type { Localized, LocalizedDoc, MediaDirectory, MediaInfo, ProductOption, StockLevel, StockLevels, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { descriptionLanguages, languagesOf } from '@sk/domain/content'
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

export interface PublicKeepsakeReads<T> {
  // Published keepsakes of every store, newest first.
  listPublished: (tx: T) => Promise<PublicKeepsakeSummary[]>
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

interface LanguageNotice {
  language: ContentLanguage
  requestedLanguage: ContentLanguage
  fallback: boolean
  availableLanguages: ContentLanguage[]
}

export interface PublicKeepsakePhoto { url: string, variants: { width: number, url: string }[] }

export interface PublicKeepsakeCard extends LanguageNotice {
  id: string
  slug: string
  name: string
  cover: PublicKeepsakePhoto | null
  soldOut: boolean
}

export interface PublicKeepsakeList { items: PublicKeepsakeCard[] }

export interface PublicKeepsake extends PublicKeepsakeCard {
  description: { type: 'doc', content: { type: string, attrs?: Record<string, unknown>, content?: unknown[], text?: string, marks?: unknown[] }[] }
  photos: PublicKeepsakePhoto[]
  options: { id: string, name: string, values: { id: string, label: string }[] }[]
  variants: { id: string, values: Record<string, string>, photo: PublicKeepsakePhoto | null }[]
  otherSlug: string | null
}

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

// Copied from the content module (ADR-013, modules do not import each other): the requested language when the keepsake
// has it, else the other one, else nothing to show.
function notice(row: PublicKeepsakeSummary, requested: ContentLanguage): LanguageNotice | null {
  const available = languagesOfRow(row)
  const language = available.includes(requested) ? requested : available.find(l => l !== requested)
  return language ? { language, requestedLanguage: requested, fallback: language !== requested, availableLanguages: available } : null
}

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

// Every published keepsake in the language asked for, or the other one with the fallback notice. Each carries a cover and
// a sold-out flag and nothing about price or units.
export function makeListKeepsakes<T>(deps: PublicKeepsakeDeps<T>) {
  return async (requested: ContentLanguage): Promise<PublicKeepsakeList> => deps.uow.run(async (tx) => {
    const rows = await deps.reads.listPublished(tx)
    const shown = rows.flatMap((row) => {
      const language = notice(row, requested)
      return language ? [{ row, language }] : []
    })
    const stock = await stockOf(deps, tx, shown.map(item => item.row))
    const items: PublicKeepsakeCard[] = []
    for (const { row, language } of shown) {
      const first = row.mediaIds[0]
      const cover = first ? (await photosOf(deps.media, tx, row.storeId, [first])).get(first.toLowerCase()) ?? null : null
      items.push(card(row, language, cover, stock))
    }
    return { items }
  })
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
