import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import type { Clock } from '../clock.ts'
import type { Database } from '../db/client.ts'
import type { StoredResponse } from '../db/schema.ts'
import type { IdempotencyRecord, IdempotencyScope, PendingClaim } from '../idempotency.ts'
import type { AppEnv } from './app.ts'
import { Buffer } from 'node:buffer'
import { setTimeout as sleep } from 'node:timers/promises'
import { findIdempotencyRecord, hashRequest, IdempotencyKeyTaken, releaseIdempotencyKey, runWithClaim, saveIdempotentResponse } from '../idempotency.ts'
import { problem } from './problem.ts'

const commandMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const keyPattern = /^[\w.:=-]{1,255}$/
const keptFor = 24 * 60 * 60 * 1000
// How long a repeat waits for the first request's response before it answers 409.
const pollEvery = 100
const pollTimes = 10
// Only headers that describe the answer are stored and replayed. Anything else, such as Set-Cookie or a
// header a route adds later, may be secret or belong to one response only.
const headersStored = new Set(['content-type', 'content-language', 'location', 'etag', 'cache-control'])
// The Response constructor refuses any body, even an empty one, with these.
const nullBodyStatuses = new Set([204, 205, 304])

// Who a key belongs to: the signed-in user, or one shared scope for anonymous requests. No anonymous command
// route exists yet. The first one (E6.3, the advice request) must decide whether that shared scope is enough.
export function idempotencyActor(c: Context<AppEnv>): string {
  const actor = c.get('actor')
  return actor.kind === 'anonymous' ? 'anonymous' : actor.userId
}

export function idempotencyKeyInUse(c: Context<AppEnv>): Response {
  const response = problem(c, { type: 'idempotency-key-in-use', status: 409, title: 'A request with this Idempotency-Key has not finished' })
  response.headers.set('Retry-After', '1')
  return response
}

async function settled(record: IdempotencyRecord | undefined, requestHash: string, lookup: () => Promise<IdempotencyRecord | undefined>) {
  for (let poll = 0; record?.requestHash === requestHash && !record.response && poll < pollTimes; poll++) {
    await sleep(pollEvery)
    record = await lookup()
  }
  return record
}

function answer(c: Context<AppEnv>, record: IdempotencyRecord | undefined, requestHash: string): Response {
  if (record && record.requestHash !== requestHash)
    return problem(c, { type: 'idempotency-key-reused', status: 422, title: 'This Idempotency-Key was used for a different request' })
  if (!record?.response)
    return idempotencyKeyInUse(c)
  const { status, headers, base64Body } = record.response
  const replayHeaders = { ...headers, 'Idempotent-Replayed': 'true' }
  if (base64Body === null)
    return c.body(null, status as StatusCode, replayHeaders)
  return c.body(Buffer.from(base64Body, 'base64'), status as ContentfulStatusCode, replayHeaders)
}

// The body is read once. The bytes are put back on the context as a new Response, so the client gets the same
// answer. A clone that is read and dropped is not safe: when it is garbage-collected it can cancel the original body.
async function takeBody(c: Context<AppEnv>): Promise<Buffer | null> {
  const original = c.res
  if (nullBodyStatuses.has(original.status))
    return null
  const bytes = Buffer.from(await original.arrayBuffer())
  c.res = new Response(bytes, original)
  return bytes
}

function stored(response: Response, bytes: Buffer | null): StoredResponse {
  const headers = Object.fromEntries([...response.headers].filter(([name]) => headersStored.has(name)))
  return { status: response.status, headers, base64Body: bytes?.toString('base64') ?? null }
}

// Every command carries an Idempotency-Key (D11). The first request with a key runs. A repeat from the
// same actor with the same method, path, body and If-Match gets the first response again for 24 hours, a repeat with
// anything else gets 422, and a repeat while the first has not finished gets 409. See ../idempotency.ts for
// how the claim joins the command's transaction.
export function idempotency(deps: { db: Database, clock: Clock, actorId: (c: Context<AppEnv>) => string }): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!commandMethods.has(c.req.method))
      return next()
    const key = c.req.header('Idempotency-Key')
    if (!key || !keyPattern.test(key))
      return problem(c, { type: 'idempotency-key-required', status: 400, title: 'A command needs an Idempotency-Key header of up to 255 letters, digits and _ . : = -' })

    const scope: IdempotencyScope = { actorId: deps.actorId(c), key }
    const url = new URL(c.req.url)
    const requestHash = hashRequest(c.req.method, url.pathname + url.search, await c.req.arrayBuffer(), c.req.header('If-Match'))
    const now = deps.clock.now()
    const lookup = () => findIdempotencyRecord(deps.db, scope, now)

    const earlier = await lookup()
    if (earlier)
      return answer(c, await settled(earlier, requestHash, lookup), requestHash)

    const claim: PendingClaim = { ...scope, requestHash, now, expiresAt: new Date(now.getTime() + keptFor), state: 'unclaimed' }
    await runWithClaim(claim, next)
    // The handler may have failed while its claiming unit of work was still open.
    await claim.settled

    if (c.error instanceof IdempotencyKeyTaken) {
      const record = await settled(await lookup(), requestHash, lookup)
      // Drop the 409 that onError made first, so none of its headers carry over to this answer.
      c.res = undefined
      c.res = answer(c, record, requestHash)
    }
    else if (claim.state === 'claimed') {
      // Whatever the status: the command committed, so a repeat must not run it again. A 412 is the exception:
      // it changed nothing, and the retry names a newer version.
      try {
        if (c.res.status === 412) {
          await releaseIdempotencyKey(deps.db, scope)
          return
        }
        const bytes = await takeBody(c)
        await saveIdempotentResponse(deps.db, scope, stored(c.res, bytes))
      }
      catch (error) {
        // The command did commit, so this client still gets its answer. A repeat gets 409 until the key expires.
        c.get('logger').error({ err: error }, 'idempotent response not stored')
      }
    }
  }
}
