import type { MembershipRepository, UnitOfWork } from '../ports.ts'

export interface ListMyStoresDeps<T> {
  uow: UnitOfWork<T>
  memberships: MembershipRepository<T>
}

// The stores the signed-in user belongs to, for `GET /api/me`, in one query. A screen reads it instead of
// remembering a store id in the browser.
export function makeListMyStores<T>({ uow, memberships }: ListMyStoresDeps<T>) {
  return async (userId: string) => uow.run(tx => memberships.listForUser(tx, userId))
}
