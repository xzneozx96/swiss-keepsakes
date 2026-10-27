import type { Localized, Pin, PinDate, StayTag, WeeklySpan } from '@sk/domain/content'

// What the content use cases need. Same shapes as the identity module's ports, copied so modules do not import
// each other (backend/architecture.md). The platform's unit of work fits the generic shape structurally.

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

export interface MediaRow {
  id: string
  kind: 'image' | 'audio' | 'pdf'
  status: 'processing' | 'ready' | 'retired'
}

export interface MediaRepository<T> {
  // The rows of this store among the ids. An id of another store has no row.
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaRow[]>
}

// What a pin save may change. `title` and `tip` together form the draft document; the repository stores it with
// the key `name` for `title`, because places_published_fields_check reads published->'name'.
export interface PinChanges {
  title?: Localized
  tip?: Localized
  slug?: Localized | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  weeklyHours?: WeeklySpan[]
  stayTag?: StayTag
  interests?: string[]
  coverMediaId?: string | null
  mainStoryGroupId?: string | null
  categoryIds?: string[]
  dates?: Omit<PinDate, 'id'>[]
}

export interface PinRepository<T> {
  insert: (tx: T, storeId: string, changes: PinChanges, at: Date) => Promise<Pin>
  // Locks the row; dates and category ids come with it. An id of another store has no row.
  findForUpdate: (tx: T, storeId: string, pinId: string) => Promise<Pin | undefined>
  // Writes the typed columns and the draft document, replaces the category and date lists when given, bumps row_version.
  save: (tx: T, pin: Pin, changes: PinChanges, at: Date) => Promise<Pin>
  // draft becomes published and is cleared; first_published_at is kept once set.
  publish: (tx: T, pin: Pin, at: Date) => Promise<Pin>
  hide: (tx: T, pin: Pin, at: Date) => Promise<Pin>
  remove: (tx: T, storeId: string, pinId: string) => Promise<boolean>
}
