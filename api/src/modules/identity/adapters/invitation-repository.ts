import type { Tx } from '../../../platform/db/client.ts'
import type { Invitation, InvitationRepository } from '../ports.ts'
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { storeInvitations } from './schema.ts'

const columns = {
  id: storeInvitations.id,
  storeId: storeInvitations.storeId,
  email: storeInvitations.email,
  role: storeInvitations.role,
  tokenHash: storeInvitations.tokenHash,
  expiresAt: storeInvitations.expiresAt,
  acceptedBy: storeInvitations.acceptedBy,
  revokedAt: storeInvitations.revokedAt,
}

// A store's invitations, newest first. UUIDv7 ids sort by creation time.
const newestFirst = desc(storeInvitations.id)

export function createInvitationRepository(): InvitationRepository<Tx> {
  return {
    async insert(tx, invitation) {
      const [row] = await tx.insert(storeInvitations).values(invitation).returning(columns)
      if (!row)
        throw new Error('The invitation was not inserted')
      return row
    },

    async findForUpdate(tx, invitationId) {
      const [row] = await tx.select(columns).from(storeInvitations).where(eq(storeInvitations.id, invitationId)).for('update')
      return row
    },

    async findByTokenHashForUpdate(tx, tokenHash) {
      const [row] = await tx.select(columns).from(storeInvitations).where(eq(storeInvitations.tokenHash, tokenHash)).for('update')
      return row
    },

    async newestOwnerInvitations(tx, storeIds) {
      if (storeIds.length === 0)
        return new Map()
      const rows = await tx.select(columns).from(storeInvitations).where(and(inArray(storeInvitations.storeId, storeIds), eq(storeInvitations.role, 'owner'))).orderBy(newestFirst)
      const newest = new Map<string, Invitation>()
      for (const row of rows) {
        if (!newest.has(row.storeId))
          newest.set(row.storeId, row)
      }
      return newest
    },

    async newestOwnerInvitationForUpdate(tx, storeId) {
      const [row] = await tx.select(columns).from(storeInvitations).where(and(eq(storeInvitations.storeId, storeId), eq(storeInvitations.role, 'owner'))).orderBy(newestFirst).limit(1).for('update')
      return row
    },

    async renew(tx, invitationId, expiresAt) {
      await tx.update(storeInvitations).set({ expiresAt, tokenHash: null }).where(eq(storeInvitations.id, invitationId))
    },

    async setTokenHash(tx, invitationId, tokenHash) {
      await tx.update(storeInvitations).set({ tokenHash }).where(eq(storeInvitations.id, invitationId))
    },

    async markAccepted(tx, invitationId, userId, now) {
      const accepted = await tx.update(storeInvitations).set({ acceptedBy: userId }).where(and(eq(storeInvitations.id, invitationId), isNull(storeInvitations.acceptedBy), isNull(storeInvitations.revokedAt), gt(storeInvitations.expiresAt, now))).returning({ id: storeInvitations.id })
      return accepted.length > 0
    },

    async findManagerInStoreForUpdate(tx, storeId, invitationId) {
      const [row] = await tx.select(columns).from(storeInvitations).where(and(eq(storeInvitations.id, invitationId), eq(storeInvitations.storeId, storeId), eq(storeInvitations.role, 'manager'))).for('update')
      return row
    },

    async listPendingManagers(tx, storeId) {
      return tx.select(columns).from(storeInvitations).where(and(eq(storeInvitations.storeId, storeId), eq(storeInvitations.role, 'manager'), isNull(storeInvitations.acceptedBy), isNull(storeInvitations.revokedAt))).orderBy(newestFirst)
    },

    async findOpenManagerByEmail(tx, storeId, email, now) {
      const [row] = await tx.select(columns).from(storeInvitations).where(and(eq(storeInvitations.storeId, storeId), eq(storeInvitations.role, 'manager'), eq(storeInvitations.email, email), isNull(storeInvitations.acceptedBy), isNull(storeInvitations.revokedAt), gt(storeInvitations.expiresAt, now))).limit(1)
      return row
    },

    async revoke(tx, invitationId, now) {
      await tx.update(storeInvitations).set({ revokedAt: now }).where(eq(storeInvitations.id, invitationId))
    },
  }
}
