import { timestamp } from 'drizzle-orm/pg-core'

// `created_at` and `updated_at` for every mutable table of ours (architecture section 5). The application keeps
// `updated_at` current on each Drizzle update, so there is no trigger. Better Auth's tables are generated and do not use it.
export function timestamps() {
  return {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }
}
