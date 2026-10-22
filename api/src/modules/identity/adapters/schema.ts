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
  uniqueIndex,
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

// A store, the tenant every other table scopes by (D9, section 5). The Super Admin creates it as `invited`, the
// Owner's acceptance moves it to `onboarding`, and A02's conditions let the Owner make it `live`. Only a live store
// sells. `stripe_account_id` is null until the pilot store's account is set (D6). The Stripe columns and
// `twint_capability` are filled by E4.12, which decides what a verified account is. `twint_capability` holds the
// provider's capability status as text, with no values fixed here.
export const stores = identitySchema.table('stores', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status', { enum: ['invited', 'onboarding', 'live', 'suspended'] }).notNull().default('invited'),
  stripeAccountId: text('stripe_account_id'),
  stripeChargesEnabled: boolean('stripe_charges_enabled').notNull().default(false),
  stripePayoutsEnabled: boolean('stripe_payouts_enabled').notNull().default(false),
  twintCapability: text('twint_capability'),
  defaultLanguage: text('default_language', { enum: ['en', 'de'] }).notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('stores_status_check', sql`${table.status} in ('invited', 'onboarding', 'live', 'suspended')`),
  check('stores_default_language_check', sql`${table.defaultLanguage} in ('en', 'de')`),
  check('stores_name_check', sql`btrim(${table.name}) <> ''`),
  check('stores_slug_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
])

// Roles live in our own table, not in Better Auth (D8). `user_id` is Better Auth's user id as a plain value,
// like the guest profile's (section 5). `store_id` points at `stores`. The unique key is also the index that loads
// one user's memberships on every signed-in request.
export const storeMemberships = identitySchema.table('store_memberships', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  userId: uuid('user_id').notNull(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  role: text('role', { enum: ['owner', 'manager'] }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
}, table => [
  unique('store_memberships_user_id_store_id_unique').on(table.userId, table.storeId),
  index('store_memberships_store_id_idx').on(table.storeId),
  check('store_memberships_role_check', sql`${table.role} in ('owner', 'manager')`),
])

// A staff invitation, for an Owner or a Store Manager (section 8). The email is kept trimmed and in lower case,
// which a CHECK enforces, so the comparison at acceptance is an equality. `token_hash` is the SHA-256 of the
// newest link's token, null until the first mail is sent and again after a resend. The raw token is never stored.
// `revoked_at` marks a revoked invitation, which is not open: no link is minted, accepting and resending are
// refused. `accepted_by` is the accepting user's id as a plain value, like `store_memberships.user_id`. A store has
// at most one open Owner invitation, which a partial unique index enforces.
export const storeInvitations = identitySchema.table('store_invitations', {
  id: uuid('id')
    .default(sql`uuidv7()`)
    .primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'manager'] }).notNull(),
  tokenHash: text('token_hash').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedBy: uuid('accepted_by'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('store_invitations_store_id_idx').on(table.storeId),
  uniqueIndex('store_invitations_one_open_owner_idx').on(table.storeId).where(sql`${table.role} = 'owner' and ${table.acceptedBy} is null and ${table.revokedAt} is null`),
  check('store_invitations_role_check', sql`${table.role} in ('owner', 'manager')`),
  check('store_invitations_email_check', sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`),
])

// One row per Super Admin (D8). The admin-only rule is an owner decision of 20.10.2026: a Super Admin holds no
// store role, so the operator uses a second account for store work. No screen writes this table, so a Super Admin
// is added with an insert (architecture section 9). `granted_by` is the granting user's id as a plain value, and
// stays null for the first grant, which `pnpm --filter @sk/api admin:grant` makes (docs/ops/admin-grant.md).
export const platformAdmins = identitySchema.table('platform_admins', {
  userId: uuid('user_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  grantedBy: uuid('granted_by'),
})
