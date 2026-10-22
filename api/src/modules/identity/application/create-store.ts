import type { StoreLanguage } from '@sk/domain/identity'
import type { MailRequest } from '../../notifications/index.ts'
import type { AuditLog, Clock, ConditionSource, InvitationRepository, StoreRepository, UnitOfWork } from '../ports.ts'
import type { AdminStoreView } from './admin-store-view.ts'
import { invitationLifetimeMs, normaliseEmail } from '@sk/domain/identity'
import { adminStoreView } from './admin-store-view.ts'

export interface CreateStoreDeps<T> {
  uow: UnitOfWork<T>
  stores: StoreRepository<T>
  invitations: InvitationRepository<T>
  conditions: ConditionSource<T>
  queueMail: (tx: T, request: MailRequest) => Promise<string>
  audit: AuditLog<T>
  clock: Clock
}

export interface CreateStoreInput {
  slug: string
  name: string
  defaultLanguage: StoreLanguage
  ownerEmail: string
  // The language of N20. The store's default language when absent.
  language?: StoreLanguage
}

export type CreateStoreResult = { ok: true, store: AdminStoreView } | { ok: false, reason: 'slug-taken' }

// The Super Admin makes a store with its Owner invitation (A01, UX AC03). One transaction writes the store as
// `invited`, the invitation, the audit rows and the N20 job, so nothing is left half made. The job holds the
// invitation id and never the token (section 8).
export function makeCreateStore<T>({ uow, stores, invitations, conditions, queueMail, audit, clock }: CreateStoreDeps<T>) {
  return async (actor: { userId: string }, input: CreateStoreInput, requestId: string | null): Promise<CreateStoreResult> => uow.run(async (tx) => {
    const now = clock.now()
    const store = await stores.insert(tx, { slug: input.slug, name: input.name, defaultLanguage: input.defaultLanguage })
    if (!store)
      return { ok: false, reason: 'slug-taken' }
    const email = normaliseEmail(input.ownerEmail)
    const invitation = await invitations.insert(tx, { storeId: store.id, email, role: 'owner', expiresAt: new Date(now.getTime() + invitationLifetimeMs) })
    await queueMail(tx, { template: 'N20', to: email, language: input.language ?? store.defaultLanguage, storeId: store.id, params: { store: store.name, invitationId: invitation.id } })
    const by = `super_admin:${actor.userId}`
    await audit.record(tx, { storeId: store.id, actor: by, entity: 'store', entityId: store.id, action: 'created', after: { status: store.status }, requestId })
    await audit.record(tx, { storeId: store.id, actor: by, entity: 'store_invitation', entityId: invitation.id, action: 'created', after: { role: 'owner' }, requestId })
    return { ok: true, store: adminStoreView(store, invitation, await conditions.laterConditions(tx, store.id), now) }
  })
}
