import type { PlatformAdminRepository, UnitOfWork, UserDirectory } from '../ports.ts'
import { normaliseEmail } from '@sk/domain/identity'

export interface GrantSuperAdminDeps<T> {
  uow: UnitOfWork<T>
  users: UserDirectory<T>
  admins: PlatformAdminRepository<T>
}

export type GrantSuperAdminResult = { ok: true, userId: string } | { ok: false, reason: 'user-not-found' | 'already-admin' }

// The first Super Admin (docs/ops/admin-grant.md). The user must exist, because Better Auth made the row when
// the person first signed in. The row has no granting user, because nobody granted it.
export function makeGrantSuperAdmin<T>({ uow, users, admins }: GrantSuperAdminDeps<T>) {
  return async (email: string): Promise<GrantSuperAdminResult> => uow.run(async (tx) => {
    const user = await users.findByEmail(tx, normaliseEmail(email))
    if (!user)
      return { ok: false, reason: 'user-not-found' }
    if (await admins.has(tx, user.id))
      return { ok: false, reason: 'already-admin' }
    await admins.insertFirst(tx, user.id)
    return { ok: true, userId: user.id }
  })
}
