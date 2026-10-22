import type { Pool } from 'pg'
import type { IdentityUseCases } from '../../src/modules/identity/adapters/routes.ts'
import type { ConditionSource } from '../../src/modules/identity/ports.ts'
import type { MailRequest } from '../../src/modules/notifications/index.ts'
import type { Clock } from '../../src/platform/clock.ts'
import type { Database, Tx } from '../../src/platform/db/client.ts'
import { createInvitationRepository } from '../../src/modules/identity/adapters/invitation-repository.ts'
import { createMembershipRepository } from '../../src/modules/identity/adapters/membership-repository.ts'
import { createPendingConditions } from '../../src/modules/identity/adapters/pending-conditions.ts'
import { createPlatformAdminRepository } from '../../src/modules/identity/adapters/platform-admin-repository.ts'
import { createStoreRepository } from '../../src/modules/identity/adapters/store-repository.ts'
import { createUserDirectory } from '../../src/modules/identity/adapters/user-directory.ts'
import { makeAcceptInvitation, makeCreateStore, makeGetOnboarding, makeInviteManager, makeListMembers, makeListStores, makeOpenStoreForSale, makeRemoveMember, makeResendManagerInvitation, makeResendOwnerInvitation, makeRevokeInvitation, makeUpdateStoreInformation } from '../../src/modules/identity/index.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'

export interface IdentityWiringOptions {
  db: Database
  queueMail: (tx: Tx, request: MailRequest) => Promise<string>
  conditions?: ConditionSource<Tx>
  clock?: Clock
}

// main.ts's wiring of the identity use cases over the real repositories, for tests on a real database. The
// conditions default to the pending source, so a test can pass doubles for the later stories' conditions.
export function createIdentityWiring({ db, queueMail, conditions = createPendingConditions<Tx>(), clock = systemClock }: IdentityWiringOptions) {
  const uow = createUnitOfWork(db)
  const stores = createStoreRepository()
  const invitations = createInvitationRepository()
  const audit = createAuditLog(clock)
  const users = createUserDirectory()
  const admins = createPlatformAdminRepository()
  const memberships = createMembershipRepository()
  const useCases: IdentityUseCases = {
    createStore: makeCreateStore({ uow, stores, invitations, conditions, users, admins, queueMail, audit, clock }),
    listStores: makeListStores({ uow, stores, invitations, conditions, clock }),
    resendOwnerInvitation: makeResendOwnerInvitation({ uow, stores, invitations, conditions, queueMail, audit, clock }),
    acceptInvitation: makeAcceptInvitation({ uow, invitations, stores, memberships, users, admins, audit, clock }),
    getOnboarding: makeGetOnboarding({ uow, stores, conditions }),
    updateStoreInformation: makeUpdateStoreInformation({ uow, stores, audit, clock }),
    openStoreForSale: makeOpenStoreForSale({ uow, stores, conditions, audit, clock }),
    listMembers: makeListMembers({ uow, memberships, invitations, clock }),
    inviteManager: makeInviteManager({ uow, stores, invitations, memberships, users, admins, queueMail, audit, clock }),
    resendManagerInvitation: makeResendManagerInvitation({ uow, stores, invitations, memberships, users, queueMail, audit, clock }),
    revokeInvitation: makeRevokeInvitation({ uow, invitations, audit, clock }),
    removeMember: makeRemoveMember({ uow, memberships, invitations, audit, clock }),
  }
  return { uow, stores, invitations, useCases }
}

// A store row for a test that needs one: memberships and invitations point at `identity.stores`.
export async function insertStore(pool: Pick<Pool, 'query'>, storeId: string, status = 'invited', name = 'Test store'): Promise<void> {
  await pool.query('insert into identity.stores (id, slug, name, status) values ($1, $2, $3, $4) on conflict (id) do nothing', [storeId, `store-${storeId}`, name, status])
}
