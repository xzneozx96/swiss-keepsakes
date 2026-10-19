import type { Clock } from './clock.ts'
import type { Tx } from './db/client.ts'
import { auditLog } from './db/schema.ts'

export interface AuditEntry {
  storeId: string | null
  actor: string
  entity: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
  // The server's request id, or null when a job made the change.
  requestId: string | null
}

export interface AuditLog<T> {
  record: (tx: T, entry: AuditEntry) => Promise<void>
}

export function createAuditLog(clock: Clock): AuditLog<Tx> {
  return {
    async record(tx, entry) {
      await tx.insert(auditLog).values({ ...entry, at: clock.now() })
    },
  }
}
