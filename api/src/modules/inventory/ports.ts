// What the inventory use cases need. UnitOfWork, Clock, AuditLog and MediaDirectory are copied from the catalog's ports so
// modules do not import each other (ADR-013, backend/architecture.md). The platform's unit of work fits the generic shape
// structurally.

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

export interface MediaInfo {
  id: string
  kind: 'image' | 'audio' | 'pdf'
  status: 'processing' | 'ready' | 'retired'
  name: string
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

// A live variant (status not archived) as the catalog knows it. The composition root builds this port from a read of the
// catalog's data, so the use cases never touch a catalog table (ADR-013). Archived variants and keepsakes that are gone
// are never in it.
export interface LiveSku {
  skuId: string
  productId: string
  code: string | null
  keepsakeName: Localized
  // The option values joined by " / " per language. Empty for a keepsake with no option.
  variantTitle: Localized
  // The variant's own photo, and the keepsake's first photo to fall back on. Plain media ids.
  mediaId: string | null
  keepsakePhotoId: string | null
}

export interface SkuDirectory<T> {
  // The live variants of the store. `skuIds` narrows the read. An id of another store is never returned.
  liveSkus: (tx: T, storeId: string, skuIds?: string[]) => Promise<LiveSku[]>
}

export interface StockLevel {
  skuId: string
  onHand: number
  // The units open orders hold (stock_items.held).
  reserved: number
}

export interface Reservation {
  orderId: string
  // The hold's created_at.
  acceptedAt: Date
  quantity: number
}

export interface StockRepository<T> {
  // The stock rows of the store, or of these SKUs. A SKU with no row is left out.
  levels: (tx: T, storeId: string, skuIds?: string[]) => Promise<StockLevel[]>
  // Makes an empty row (0 on hand) for each SKU that has none, then locks the rows of these SKUs in sku_id order and
  // returns them. Holds take the same row lock, so what this reads cannot change until the transaction ends.
  lock: (tx: T, storeId: string, skuIds: string[]) => Promise<StockLevel[]>
  // Inserts the stock row of each new SKU (on_hand = quantity, held 0) and, for a quantity above 0, one `set` adjustment
  // (before 0) with the acting user. One statement per table. A SKU that has a row fails the statement (no ON CONFLICT).
  seed: (tx: T, storeId: string, items: { skuId: string, quantity: number }[], actorUserId: string) => Promise<void>
  // The open holds of one SKU, oldest first.
  openHolds: (tx: T, storeId: string, skuId: string) => Promise<Reservation[]>
  // Sets on_hand and writes one `set` adjustment row (before, after, delta, actor) in the same transaction.
  set: (tx: T, change: { storeId: string, skuId: string, before: number, after: number, actorUserId: string, at: Date }) => Promise<void>
}
