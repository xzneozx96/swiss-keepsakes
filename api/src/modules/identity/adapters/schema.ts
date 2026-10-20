import { sql } from 'drizzle-orm'
import { check, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// The identity module's tables (architecture sections 4 and 5). Users and sessions live in Neon Auth's
// neon_auth schema, which no migration of ours touches and the compose Postgres does not have. So user_id is the
// JWT `sub` (neon_auth.user.id) with no foreign key. The `stores` table and its foreign key come with E2.3.
// drizzle-kit loads this file on its own, so it imports nothing from this repo.
export const identity = pgSchema('identity')

export const storeMemberships = identity.table('store_memberships', {
  userId: uuid('user_id').notNull(),
  storeId: uuid('store_id').notNull(),
  role: text('role', { enum: ['owner', 'manager'] }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
}, table => [
  // Also the index that loads one user's memberships on every signed-in request.
  primaryKey({ columns: [table.userId, table.storeId] }),
  check('store_memberships_role_check', sql`${table.role} in ('owner', 'manager')`),
])

// One row per Super Admin (D8).
export const platformAdmins = identity.table('platform_admins', {
  userId: uuid('user_id').primaryKey(),
})
