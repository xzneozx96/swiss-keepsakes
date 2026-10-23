import type { Store } from '@sk/domain/identity'
import type { AuditEntry, ConditionSource, Invitation, InvitationRepository, InvitationRole, LaterConditions, MembershipRepository, PlatformAdminRepository, StoreRepository, UnitOfWork, UserDirectory } from '../../src/modules/identity/ports.ts'
import type { MailRequest } from '../../src/modules/notifications/index.ts'

// The identity ports over memory, for use case tests. `uow.run` keeps the state when the work returns and puts
// it back when the work throws, as a transaction would.
export interface FakeTx { readonly id: number }

interface State {
  stores: Map<string, Store>
  invitations: Map<string, Invitation>
  memberships: { id: string, userId: string, storeId: string, role: InvitationRole, acceptedAt: Date }[]
  users: Map<string, { email: string, name: string, emailVerified: boolean }>
  admins: { userId: string, grantedBy: null }[]
  audit: AuditEntry[]
  mail: MailRequest[]
  counter: number
}

const uuid = (n: number) => `0190f0c2-0000-7000-8000-${n.toString(16).padStart(12, '0')}`

export function createFakeIdentity(later: LaterConditions = { 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' }) {
  let state: State = { stores: new Map(), invitations: new Map(), memberships: [], users: new Map(), admins: [], audit: [], mail: [], counter: 0 }
  const nextId = () => uuid(++state.counter)
  const snapshot = (): State => ({
    ...state,
    stores: new Map(Array.from(state.stores, ([key, value]) => [key, { ...value }])),
    invitations: new Map(Array.from(state.invitations, ([key, value]) => [key, { ...value }])),
    memberships: state.memberships.map(row => ({ ...row })),
    admins: [...state.admins],
    audit: [...state.audit],
    mail: [...state.mail],
  })

  const uow: UnitOfWork<FakeTx> = {
    async run(work) {
      const before = snapshot()
      try {
        return await work({ id: 0 })
      }
      catch (error) {
        state = before
        throw error
      }
    },
  }

  const stores: StoreRepository<FakeTx> = {
    async insert(_tx, store) {
      if ([...state.stores.values()].some(row => row.slug === store.slug))
        return undefined
      const row: Store = { id: nextId(), status: 'invited', createdAt: new Date('2026-10-20T08:00:00Z'), ...store }
      state.stores.set(row.id, row)
      return { ...row }
    },
    async find(_tx, storeId) {
      const row = state.stores.get(storeId)
      return row && { ...row }
    },
    async findForUpdate(_tx, storeId) {
      const row = state.stores.get(storeId)
      return row && { ...row }
    },
    async list(_tx, { limit, after }) {
      return [...state.stores.values()].filter(row => after === undefined || row.id < after).sort((a, b) => b.id.localeCompare(a.id)).slice(0, limit).map(row => ({ ...row }))
    },
    async updateInformation(_tx, storeId, changes) {
      const row = state.stores.get(storeId)
      if (!row)
        return undefined
      Object.assign(row, changes)
      return { ...row }
    },
    async moveStatus(_tx, storeId, from, to) {
      const row = state.stores.get(storeId)
      if (row?.status !== from)
        return false
      row.status = to
      return true
    },
  }

  const invitations: InvitationRepository<FakeTx> = {
    async insert(_tx, invitation) {
      const row: Invitation = { id: nextId(), tokenHash: null, acceptedBy: null, revokedAt: null, ...invitation }
      state.invitations.set(row.id, row)
      return { ...row }
    },
    async findForUpdate(_tx, invitationId) {
      const row = state.invitations.get(invitationId)
      return row && { ...row }
    },
    async findByTokenHashForUpdate(_tx, tokenHash) {
      const row = [...state.invitations.values()].find(candidate => candidate.tokenHash === tokenHash)
      return row && { ...row }
    },
    async newestOwnerInvitations(_tx, storeIds) {
      const newest = new Map<string, Invitation>()
      for (const row of [...state.invitations.values()].filter(candidate => candidate.role === 'owner' && storeIds.includes(candidate.storeId)).sort((a, b) => b.id.localeCompare(a.id))) {
        if (!newest.has(row.storeId))
          newest.set(row.storeId, { ...row })
      }
      return newest
    },
    async newestOwnerInvitationForUpdate(_tx, storeId) {
      return (await this.newestOwnerInvitations(_tx, [storeId])).get(storeId)
    },
    async renew(_tx, storeId, invitationId, expiresAt, invitedBy) {
      const row = state.invitations.get(invitationId)
      if (row?.storeId === storeId)
        Object.assign(row, { expiresAt, tokenHash: null, invitedBy })
    },
    async findPreviewByTokenHash(_tx, tokenHash) {
      const row = [...state.invitations.values()].find(candidate => candidate.tokenHash === tokenHash)
      const store = row && state.stores.get(row.storeId)
      if (!row || !store)
        return undefined
      return { role: row.role, expiresAt: row.expiresAt, acceptedBy: row.acceptedBy, revokedAt: row.revokedAt, storeName: store.name, inviterName: (row.invitedBy && state.users.get(row.invitedBy)?.name) ?? null }
    },
    async setTokenHash(_tx, invitationId, tokenHash) {
      const row = state.invitations.get(invitationId)
      if (row)
        row.tokenHash = tokenHash
    },
    async findManagerInStoreForUpdate(_tx, storeId, invitationId) {
      const row = state.invitations.get(invitationId)
      return row && row.storeId === storeId && row.role === 'manager' ? { ...row } : undefined
    },
    async listPendingManagers(_tx, storeId) {
      return [...state.invitations.values()].filter(row => row.storeId === storeId && row.role === 'manager' && row.acceptedBy === null && row.revokedAt === null).sort((a, b) => b.id.localeCompare(a.id)).map(row => ({ ...row }))
    },
    async findOpenManagerByEmail(_tx, storeId, email) {
      const row = [...state.invitations.values()].find(candidate => candidate.storeId === storeId && candidate.role === 'manager' && candidate.email === email && candidate.acceptedBy === null && candidate.revokedAt === null)
      return row && { ...row }
    },
    async revoke(_tx, storeId, invitationId, now) {
      const row = state.invitations.get(invitationId)
      if (row?.storeId === storeId)
        row.revokedAt = now
    },
    async revokeOpenManagersByEmail(_tx, storeId, email, now) {
      for (const row of state.invitations.values()) {
        if (row.storeId === storeId && row.role === 'manager' && row.email === email && row.acceptedBy === null && row.revokedAt === null)
          row.revokedAt = now
      }
    },
    async markAccepted(_tx, invitationId, userId, now) {
      const row = state.invitations.get(invitationId)
      if (!row || row.acceptedBy !== null || row.revokedAt !== null || row.expiresAt.getTime() <= now.getTime())
        return false
      row.acceptedBy = userId
      return true
    },
  }

  const memberships: MembershipRepository<FakeTx> = {
    async insertIfAbsent(_tx, membership) {
      if (state.memberships.some(row => row.userId === membership.userId && row.storeId === membership.storeId))
        return false
      state.memberships.push({ id: nextId(), ...membership })
      return true
    },
    async list(_tx, storeId) {
      return state.memberships.filter(row => row.storeId === storeId).map(row => ({ id: row.id, userId: row.userId, email: state.users.get(row.userId)?.email ?? '', role: row.role, acceptedAt: row.acceptedAt }))
    },
    async listForUser(_tx, userId) {
      return state.memberships.filter(row => row.userId === userId).map(row => ({ storeId: row.storeId, role: row.role, status: state.stores.get(row.storeId)?.status ?? 'invited' }))
    },
    async has(_tx, storeId, userId) {
      return state.memberships.some(row => row.storeId === storeId && row.userId === userId)
    },
    async findInStoreForUpdate(_tx, storeId, memberId) {
      const row = state.memberships.find(candidate => candidate.id === memberId && candidate.storeId === storeId)
      return row && { id: row.id, userId: row.userId, email: state.users.get(row.userId)?.email ?? '', role: row.role, acceptedAt: row.acceptedAt }
    },
    async remove(_tx, storeId, memberId) {
      state.memberships = state.memberships.filter(row => !(row.id === memberId && row.storeId === storeId))
    },
  }

  const users: UserDirectory<FakeTx> = {
    async find(_tx, userId) {
      return state.users.get(userId)
    },
    async findByEmail(_tx, email) {
      const found = [...state.users].find(([, user]) => user.email.toLowerCase() === email.toLowerCase())
      return found && { id: found[0] }
    },
  }

  const admins: PlatformAdminRepository<FakeTx> = {
    async has(_tx, userId) {
      return state.admins.some(row => row.userId === userId)
    },
    async insertFirst(_tx, userId) {
      state.admins.push({ userId, grantedBy: null })
    },
  }

  const conditions: ConditionSource<FakeTx> = { laterConditions: async () => ({ ...later }) }

  return {
    uow,
    stores,
    invitations,
    memberships,
    users,
    admins,
    conditions,
    audit: { record: async (_tx: FakeTx, entry: AuditEntry) => void state.audit.push(entry) },
    queueMail: async (_tx: FakeTx, request: MailRequest) => {
      state.mail.push(request)
      return nextId()
    },
    setLater(next: Partial<LaterConditions>) {
      Object.assign(later, next)
    },
    addUser(userId: string, email: string, emailVerified = true, name = '') {
      state.users.set(userId, { email, name, emailVerified })
    },
    addStore(row: Partial<Store> & { slug: string }): Store {
      const store: Store = { id: nextId(), name: 'Zürich Andenken', status: 'invited', defaultLanguage: 'en', createdAt: new Date('2026-10-20T08:00:00Z'), ...row }
      state.stores.set(store.id, store)
      return store
    },
    get state() {
      return state
    },
  }
}
