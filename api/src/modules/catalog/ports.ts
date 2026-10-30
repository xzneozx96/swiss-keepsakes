// What the catalog use cases need. Same shapes as the content module's ports, copied so modules do not import each
// other (backend/architecture.md). The platform's unit of work fits the generic shape structurally.

export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export interface Clock {
  now: () => Date
}

export interface AuditEntry {
  storeId: string | null
  actor: string
  entity: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  requestId: string | null
}

export interface AuditLog<T> {
  record: (tx: T, entry: AuditEntry) => Promise<void>
}

export interface Localized { en?: string, de?: string }

// A file in the library, as a keepsake photo shows it. main.ts builds this port from the content module's media
// table (ADR-013: keepsake photos are plain media ids). An id of another store, or one that does not exist, is left out.
export interface MediaInfo {
  id: string
  kind: 'image' | 'audio' | 'pdf'
  status: 'processing' | 'ready' | 'retired'
  contentType: string
  byteSize: number
  width: number | null
  height: number | null
  publicUrl: string | null
  variants: { width: number, url: string }[]
}

export interface MediaDirectory<T> {
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaInfo[]>
}

// The working copy of a keepsake's text and photos: the draft, or what is live.
export interface ProductDoc {
  name: Localized
  text: Localized
  // Media ids in order. The first is the cover.
  media: string[]
}

// `published` is for sale, `draft` is hidden from guests, `archived` stays for old orders and keeps its combination.
export type VariantStatus = 'published' | 'draft' | 'archived'

export interface OptionValue {
  id: string
  label: Localized
  // `#rrggbb` or null (product_option_values_swatch_check).
  swatch: string | null
}

// An option of one keepsake (ADR-027). Its values are in the order guests see them.
export interface ProductOption {
  id: string
  name: Localized
  values: OptionValue[]
}

export interface ProductVariant {
  id: string
  skuCode: string
  priceRappen: number
  status: VariantStatus
  // The value of each option, by option id. A keepsake with no option has an empty map.
  values: Record<string, string>
}

export interface Product {
  id: string
  storeId: string
  status: 'draft' | 'published'
  slug: Localized | null
  // The pending edit, null when there is none. A save writes it, a publish clears it.
  draft: ProductDoc | null
  // What guests see. Null until the first publish. Photos are in `publishedMedia`.
  published: { name: Localized, text: Localized } | null
  publishedMedia: string[]
  commissionRate: number
  options: ProductOption[]
  variants: ProductVariant[]
  rowVersion: number
  createdAt: Date
  updatedAt: Date
}

export interface ProductListRow {
  id: string
  name: Localized
  status: 'draft' | 'published'
  hasUnpublishedEdits: boolean
  coverMediaId: string | null
  variantCount: number
  // Always 0 until stock exists (E6.3, `inventory.stock_items`).
  soldOutCount: number
  updatedAt: Date
}

export interface ProductChanges {
  name?: Localized
  text?: Localized
  media?: string[]
  commissionRate?: number
}

// An option or value as a request names it. `ref` is the id of an existing one, or any key the client picked for a new
// one. Refs only link the parts of one request together; the repository gives new rows their own ids.
export interface ValueInput {
  ref: string
  label: Localized
  swatch: string | null
}

export interface OptionInput {
  ref: string
  name: Localized
  // In the order guests see them.
  values: ValueInput[]
}

// A variant to create. `values` maps an option ref to a value ref.
export interface VariantInput {
  skuCode: string
  priceRappen: number
  status: 'published' | 'draft'
  values: Record<string, string>
}

export interface NewProduct {
  name: Localized
  text: Localized
  media: string[]
  commissionRate: number
  options: OptionInput[]
  variants: VariantInput[]
}

// The options of a keepsake as they should be after the save, with the values that variants get for them. A variant
// keeps the values it has for options that stay, so only new options and changed values are listed.
export interface OptionsSave {
  options: OptionInput[]
  variantValues: { variantId: string, values: Record<string, string> }[]
}

export interface VariantChanges {
  skuCode?: string
  priceRappen?: number
  status?: VariantStatus
  // Every option's value, by option id. Replaces the variant's values.
  values?: Record<string, string>
}

// Why a save is refused, with the numbers a screen needs to say it. `path` names the field in the request.
export type RefusalCode
  = | 'option-name-required'
    | 'value-name-required'
    | 'option-needs-value'
    | 'option-in-use'
    | 'value-in-use'
    | 'values-missing'
    | 'value-unknown'
    | 'combination-taken'
    | 'combination-duplicate'
    | 'no-options-one-variant'
    | 'refs-invalid'
    | 'code-duplicate'
    | 'variant-reserved'
    | 'variant-archived'

export interface Refusal {
  code: RefusalCode
  path: string
  params?: Record<string, string | number>
}

// The units that open orders reserve, by SKU id. E6.3 wires this from the inventory module (ADR-009, ADR-013); until
// then nothing is wired and archiving never finds a reserved unit.
export interface ReservationDirectory<T> {
  reservedBySku: (tx: T, storeId: string, skuIds: string[]) => Promise<Map<string, number>>
}

export interface ProductRepository<T> {
  list: (tx: T, storeId: string) => Promise<ProductListRow[]>
  // An id of another store has no row.
  find: (tx: T, storeId: string, productId: string) => Promise<Product | undefined>
  // Locks the row. An id of another store has no row.
  findForUpdate: (tx: T, storeId: string, productId: string) => Promise<Product | undefined>
  // A draft product with its options and its variants for sale, in one transaction.
  insert: (tx: T, storeId: string, input: NewProduct, at: Date) => Promise<Product>
  // Writes the draft document and the commission, bumps row_version.
  save: (tx: T, product: Product, changes: ProductChanges, at: Date) => Promise<Product>
  // The draft becomes the live text and is cleared, the photos replace product_media, the slug is written in the
  // same statement (products_published_fields_check), row_version moves.
  publish: (tx: T, product: Product, slug: Localized, at: Date) => Promise<Product>
  // status goes back to draft, the live text stays.
  unpublish: (tx: T, product: Product, at: Date) => Promise<Product>
  // The slugs other products hold in this language.
  slugsTaken: (tx: T, language: 'en' | 'de') => Promise<Set<string>>
  // Writes the variant and returns the product. undefined when the variant is not this product's.
  saveVariant: (tx: T, product: Product, skuId: string, changes: VariantChanges, at: Date) => Promise<Product | undefined>
  // Adds one variant. `values` maps option ids to value ids.
  insertVariant: (tx: T, product: Product, input: VariantInput, at: Date) => Promise<Product>
  // Writes the options, their values and order, and the new values of the variants, then bumps row_version.
  replaceOptions: (tx: T, product: Product, input: OptionsSave, at: Date) => Promise<Product>
}

// One keepsake that holds a file as a photo. The content module's media library reads this to count keepsakes as uses
// of a file (E4.11), so a photo that only keepsakes show is never retired. `published` is true when the keepsake is for
// sale and the file is among its live photos; any other holding (a draft photo, or live photos of an unpublished
// keepsake) is a draft-only use.
export interface MediaUse {
  mediaId: string
  productId: string
  name: Localized
  published: boolean
  // The first photo of the keepsake, as the list shows it, for a thumbnail.
  coverMediaId: string | null
}

export interface MediaUses<T> {
  // Every file of this store that a keepsake holds, once per keepsake and file.
  list: (tx: T, storeId: string) => Promise<MediaUse[]>
}
