import type { Database, Tx } from './db/client.ts'
import type { StoredResponse } from './db/schema.ts'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { and, eq, gt, lte, sql } from 'drizzle-orm'
import { idempotencyKeys } from './db/schema.ts'

// Idempotency-Key (D11). The HTTP middleware (http/idempotency.ts) checks the key and answers repeats. The
// key itself is claimed by the first statement of the request's first transaction (`withClaim`, called by the
// unit of work), so the claim commits or rolls back with the business change:
// - a command that rolled back leaves no key, and a retry runs it again;
// - a command that committed has its key, so it never runs twice, even when two requests race.
// A request runs its units of work one after the other: a second unit opened while the claiming one is still
// open is refused. The response is stored right after the handler. A crash between the commit and that store
// leaves a key without a response, which answers 409 until it expires, and never runs the command again.

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
  // 'claiming' while the unit of work that makes the claim is open. A handler can fail while that unit is
  // still running, so the middleware waits for `settled` before it decides what to store.
  state: 'unclaimed' | 'claiming' | 'claimed'
  settled?: Promise<void>
}

// Another request holds or committed the same key. Thrown before the use case's work, so that work never
// runs, and the transaction rolls back.
export class IdempotencyKeyTaken extends Error {}

const lockNotAvailable = '55P03'

const pendingClaim = new AsyncLocalStorage<PendingClaim>()

export function hashRequest(method: string, pathAndQuery: string, body: ArrayBuffer): string {
  return createHash('sha256').update(`${method} ${pathAndQuery}\n`).update(new Uint8Array(body)).digest('hex')
}

export function runWithClaim<R>(claim: PendingClaim, next: () => Promise<R>): Promise<R> {
  return pendingClaim.run(claim, next)
}

// Runs one unit of work's transaction. Inside a command request whose key is not claimed yet, the
// `claimFirst` it passes in claims the key, and the transaction must call it before anything else.
export async function withClaim<R>(transaction: (claimFirst: (tx: Tx) => Promise<void>) => Promise<R>): Promise<R> {
  const claim = pendingClaim.getStore()
  if (!claim || claim.state === 'claimed')
    return transaction(async () => {})
  // Two units at once would both try to claim the key, and the second would wait on the first forever.
  if (claim.state === 'claiming')
    throw new Error('A command request opened a second unit of work while its first was still open. Run them one after the other.')
  claim.state = 'claiming'
  const unit = transaction(tx => insertClaim(tx, claim))
  claim.settled = settle(claim, unit)
  await claim.settled
  return unit
}

async function settle(claim: PendingClaim, unit: Promise<unknown>): Promise<void> {
  try {
    await unit
    claim.state = 'claimed'
  }
  catch {
    claim.state = 'unclaimed'
  }
}

function isLockTimeout(error: unknown): boolean {
  // Drizzle wraps the driver's error in `cause`.
  const cause = error instanceof Error ? error.cause : undefined
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === lockNotAvailable
}

async function insertClaim(tx: Tx, claim: PendingClaim): Promise<void> {
  // A live key makes this insert wait for the transaction that holds it. Bound that wait, for this statement only.
  await tx.execute(sql`set local lock_timeout = '5s'`)
  let claimed: unknown[]
  try {
    claimed = await tx.insert(idempotencyKeys)
      .values({ actorId: claim.actorId, key: claim.key, requestHash: claim.requestHash, response: null, expiresAt: claim.expiresAt })
      // An expired key is free again.
      .onConflictDoUpdate({
        target: [idempotencyKeys.actorId, idempotencyKeys.key],
        set: { requestHash: claim.requestHash, response: null, expiresAt: claim.expiresAt },
        setWhere: lte(idempotencyKeys.expiresAt, claim.now),
      })
      .returning({ key: idempotencyKeys.key })
  }
  catch (error) {
    if (isLockTimeout(error))
      throw new IdempotencyKeyTaken('Idempotency-Key held by another open transaction', { cause: error })
    throw error
  }
  if (claimed.length === 0)
    throw new IdempotencyKeyTaken('Idempotency-Key already claimed')
  await tx.execute(sql`set local lock_timeout to default`)
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
