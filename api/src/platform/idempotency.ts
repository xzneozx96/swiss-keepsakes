import type { Database, Tx } from './db/client.ts'
import type { StoredResponse } from './db/schema.ts'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { and, eq, gt, lte } from 'drizzle-orm'
import { idempotencyKeys } from './db/schema.ts'

// Idempotency-Key (D11). The HTTP middleware (http/idempotency.ts) checks the key and answers repeats. The
// key itself is claimed by the first statement of the request's first transaction (`claimInTransaction`,
// called by the unit of work), so the claim commits or rolls back with the business change:
// - a command that rolled back leaves no key, and a retry runs it again;
// - a command that committed has its key, so it never runs twice, even when two requests race.
// The response is stored right after the handler. A crash between the commit and that store leaves a key
// without a response, which answers 409 until it expires, and never runs the command again.

export interface IdempotencyScope {
  actorId: string
  key: string
}

export interface IdempotencyRecord {
  requestHash: string
  response: StoredResponse | null
}

export interface PendingClaim extends IdempotencyScope {
  requestHash: string
  now: Date
  expiresAt: Date
  committed: boolean
}

// Another request committed the same key while this one ran. Thrown before the use case's work, so
// that work never runs, and the transaction rolls back.
export class IdempotencyKeyTaken extends Error {}

const pendingClaim = new AsyncLocalStorage<PendingClaim>()

export function hashRequest(method: string, pathAndQuery: string, body: ArrayBuffer): string {
  return createHash('sha256').update(`${method} ${pathAndQuery}\n`).update(new Uint8Array(body)).digest('hex')
}

export function runWithClaim<R>(claim: PendingClaim, next: () => Promise<R>): Promise<R> {
  return pendingClaim.run(claim, next)
}

export async function claimInTransaction(tx: Tx): Promise<PendingClaim | undefined> {
  const claim = pendingClaim.getStore()
  if (!claim || claim.committed)
    return undefined
  const claimed = await tx.insert(idempotencyKeys)
    .values({ actorId: claim.actorId, key: claim.key, requestHash: claim.requestHash, response: null, expiresAt: claim.expiresAt })
    // An expired key is free again. A live one makes this insert wait for the other transaction.
    .onConflictDoUpdate({
      target: [idempotencyKeys.actorId, idempotencyKeys.key],
      set: { requestHash: claim.requestHash, response: null, expiresAt: claim.expiresAt },
      setWhere: lte(idempotencyKeys.expiresAt, claim.now),
    })
    .returning({ key: idempotencyKeys.key })
  if (claimed.length === 0)
    throw new IdempotencyKeyTaken('Idempotency-Key already claimed')
  return claim
}

export async function findIdempotencyRecord(db: Database, scope: IdempotencyScope, now: Date): Promise<IdempotencyRecord | undefined> {
  const [record] = await db.select({ requestHash: idempotencyKeys.requestHash, response: idempotencyKeys.response })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.actorId, scope.actorId), eq(idempotencyKeys.key, scope.key), gt(idempotencyKeys.expiresAt, now)))
  return record
}

export async function saveIdempotentResponse(db: Database, scope: IdempotencyScope, response: StoredResponse): Promise<void> {
  await db.update(idempotencyKeys)
    .set({ response })
    .where(and(eq(idempotencyKeys.actorId, scope.actorId), eq(idempotencyKeys.key, scope.key)))
}
