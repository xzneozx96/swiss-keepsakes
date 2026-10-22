import type { Tx } from '../../../platform/db/client.ts'
import type { UserDirectory } from '../ports.ts'
import { eq, sql } from 'drizzle-orm'
import { user } from './schema.ts'

export function createUserDirectory(): UserDirectory<Tx> {
  return {
    async find(tx, userId) {
      const [row] = await tx.select({ email: user.email, emailVerified: user.emailVerified }).from(user).where(eq(user.id, userId))
      return row
    },

    async findByEmail(tx, email) {
      const [row] = await tx.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = lower(${email})`)
      return row
    },
  }
}
