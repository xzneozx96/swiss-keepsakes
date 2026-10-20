import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const identitySchema = pgSchema('identity')

export const user = identitySchema.table('user', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const session = identitySchema.table(
  'session',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  table => [index('session_userId_idx').on(table.userId)],
)

export const account = identitySchema.table(
  'account',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [index('account_userId_idx').on(table.userId)],
)

export const verification = identitySchema.table(
  'verification',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [index('verification_identifier_idx').on(table.identifier)],
)

export const rateLimit = identitySchema.table('rate_limit', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

// Everything above this line is the output of `auth generate --adapter drizzle` (docs/architecture/backend.md
// section 4), kept as generated. The guest profile below is ours.

// The row that guest-owned rows point at (section 5). `auth_user_id` is Better Auth's user id as a plain value,
// with no foreign key, so Better Auth can delete its user row. Account deletion clears it (E6.7). It is unique,
// so two parallel first calls insert one profile.
export const guestProfiles = identitySchema.table('guest_profiles', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  authUserId: uuid('auth_user_id').unique(),
})

// Roles live in our own table, not in Better Auth (D8). `user_id` is Better Auth's user id as a plain value,
// like the guest profile's (section 5). `store_id` has no foreign key yet, because `stores` comes with E2.3,
// which adds it. The unique key is also the index that loads one user's memberships on every signed-in request.
export const storeMemberships = identitySchema.table('store_memberships', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  userId: uuid('user_id').notNull(),
  storeId: uuid('store_id').notNull(),
  role: text('role', { enum: ['owner', 'manager'] }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
}, table => [
  unique('store_memberships_user_id_store_id_unique').on(table.userId, table.storeId),
  check('store_memberships_role_check', sql`${table.role} in ('owner', 'manager')`),
])

// One row per Super Admin (D8). No screen writes it, so a Super Admin is added with an insert (architecture section 9).
export const platformAdmins = identitySchema.table('platform_admins', {
  userId: uuid('user_id').primaryKey(),
})
