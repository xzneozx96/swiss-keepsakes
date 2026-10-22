import type { Clock, ConditionSource, InvitationRepository, StoreRepository, UnitOfWork } from '../ports.ts'
import type { AdminStoreView } from './admin-store-view.ts'
import { adminStoreView } from './admin-store-view.ts'

export interface ListStoresDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  invitations: InvitationRepository<T>
  conditions: ConditionSource<T>
  clock: Clock
}

export interface StorePage {
  items: AdminStoreView[]
  nextCursor: string | null
}

// A01's list: every store with its newest Owner invitation and its payment account state, newest store first,
// a page at a time (D11). It reads across stores, as the Super Admin's `/api/admin/*` routes do (D9).
export function makeListStores<T>({ uow, stores, invitations, conditions, clock }: ListStoresDeps<T>) {
  return async (page: { limit: number, cursor?: string | undefined }): Promise<StorePage> => uow.run(async (tx) => {
    const now = clock.now()
    const found = await stores.list(tx, { limit: page.limit + 1, after: page.cursor })
    const shown = found.slice(0, page.limit)
    const newest = await invitations.newestOwnerInvitations(tx, shown.map(store => store.id))
    // One query at a time, because a transaction runs one statement at once.
    const items: AdminStoreView[] = []
    for (const store of shown)
      items.push(adminStoreView(store, newest.get(store.id), await conditions.laterConditions(tx, store.id), now))
    return { items, nextCursor: found.length > page.limit ? (shown.at(-1)?.id ?? null) : null }
  })
}
