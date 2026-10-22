import { sql } from 'drizzle-orm'
import { jsonb, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// The shared infrastructure tables (architecture section 4 and the table list in section 5).
// drizzle-kit loads this file on its own, so it imports nothing from this repo.
export const platform = pgSchema('platform')

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

// One row per money or status change (D10). Order and booking timelines will be views over it.
export const auditLog = platform.table('audit_log', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  // Null only for an action that belongs to no store.
  storeId: uuid('store_id'),
  actor: text('actor').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  reason: text('reason'),
  at: timestamptz('at').notNull(),
  // Null when a job made the change.
  requestId: uuid('request_id'),
})

export interface StoredResponse {
  status: number
  headers: Record<string, string>
  // Base64 of the exact bytes, so any body replays unchanged. Null for a status that has no body (204, 205, 304).
  base64Body: string | null
}

export const idempotencyKeys = platform.table('idempotency_keys', {
  actorId: text('actor_id').notNull(),
  key: text('key').notNull(),
  requestHash: text('request_hash').notNull(),
  // Null from the commit that claimed the key until the response is stored.
  response: jsonb('response').$type<StoredResponse>(),
  expiresAt: timestamptz('expires_at').notNull(),
}, table => [primaryKey({ columns: [table.actorId, table.key] })])

export const webhookEvents = platform.table('webhook_events', {
  provider: text('provider').notNull(),
  eventId: text('event_id').notNull(),
  receivedAt: timestamptz('received_at').notNull(),
  processedAt: timestamptz('processed_at'),
  payload: jsonb('payload').notNull(),
}, table => [primaryKey({ columns: [table.provider, table.eventId] })])
