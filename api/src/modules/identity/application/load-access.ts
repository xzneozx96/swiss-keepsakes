import type { Access } from '@sk/domain/identity'
import type { AccessRepository, UnitOfWork } from '../ports.ts'

export interface LoadAccessDeps<T> {
  uow: UnitOfWork<T>
  access: AccessRepository<T>
}

// What a signed-in user may be: Super Admin, staff of some stores, or only a guest (architecture section 9).
// The HTTP layer builds the actor from this and the guest profile on every authenticated request.
export function makeLoadAccess<T>({ uow, access }: LoadAccessDeps<T>) {
  return async (authUserId: string): Promise<Access> => uow.run(tx => access.find(tx, authUserId))
}
