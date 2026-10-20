import { sql } from 'drizzle-orm'
import { check, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// drizzle-kit loads this file on its own, so it imports nothing from this repo.
export const notifications = pgSchema('notifications')

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

// One row per mail, written with its job in the business transaction. The id is also the pg-boss job id and
// the Message-ID's local part. Failed rows are the ops list of mail that did not go out (docs/ops/mail.md).
export const sentMail = notifications.table('sent_mail', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  // Null for mail that belongs to no store.
  storeId: uuid('store_id'),
  template: text('template').notNull(),
  language: text('language').notNull(),
  recipient: text('recipient').notNull(),
  status: text('status').$type<'queued' | 'sent' | 'failed'>().notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  // The last failed attempt's error code and SMTP reply code. Never the reply text, which can quote the address.
  lastError: text('last_error'),
  // The server's final reply to the sent message, to trace it with the provider.
  smtpResponse: text('smtp_response'),
  queuedAt: timestamptz('queued_at').notNull(),
  sentAt: timestamptz('sent_at'),
  failedAt: timestamptz('failed_at'),
}, table => [
  check('sent_mail_status_check', sql`${table.status} in ('queued', 'sent', 'failed')`),
  check('sent_mail_language_check', sql`${table.language} in ('en', 'de')`),
])
