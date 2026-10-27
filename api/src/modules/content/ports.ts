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
