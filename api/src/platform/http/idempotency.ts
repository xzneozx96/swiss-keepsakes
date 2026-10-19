import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Clock } from '../clock.ts'
import type { Database } from '../db/client.ts'
import type { StoredResponse } from '../db/schema.ts'
import type { IdempotencyRecord, IdempotencyScope, PendingClaim } from '../idempotency.ts'
import type { AppEnv } from './app.ts'
import { setTimeout as sleep } from 'node:timers/promises'
import { findIdempotencyRecord, hashRequest, IdempotencyKeyTaken, runWithClaim, saveIdempotentResponse } from '../idempotency.ts'
import { problem } from './problem.ts'

const commandMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const keyPattern = /^[\w.:=-]{1,255}$/
const keptFor = 24 * 60 * 60 * 1000
// How long a repeat waits for the first request's response before it answers 409.
const pollEvery = 100
const pollTimes = 10
// Made for each response, or a secret: never stored, so never replayed.
const headersNotStored = new Set(['x-request-id', 'set-cookie', 'content-length'])

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
  const { status, headers, body } = record.response
  return c.body(body, status as ContentfulStatusCode, { ...headers, 'Idempotent-Replayed': 'true' })
}

async function stored(response: Response): Promise<StoredResponse> {
  const headers = Object.fromEntries([...response.headers].filter(([name]) => !headersNotStored.has(name)))
  return { status: response.status, headers, body: await response.clone().text() }
}

// Every command carries an Idempotency-Key (D11). The first request with a key runs. A repeat from the
// same actor with the same method, path and body gets the first response again for 24 hours, a repeat with
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
    const requestHash = hashRequest(c.req.method, url.pathname + url.search, await c.req.arrayBuffer())
    const now = deps.clock.now()
    const lookup = () => findIdempotencyRecord(deps.db, scope, now)

    const earlier = await lookup()
    if (earlier)
      return answer(c, await settled(earlier, requestHash, lookup), requestHash)

    const claim: PendingClaim = { ...scope, requestHash, now, expiresAt: new Date(now.getTime() + keptFor), committed: false }
    await runWithClaim(claim, next)

    if (c.error instanceof IdempotencyKeyTaken) {
      const record = await settled(await lookup(), requestHash, lookup)
      // Drop the 409 that onError made first, so none of its headers carry over to this answer.
      c.res = undefined
      c.res = answer(c, record, requestHash)
    }
    else if (claim.committed) {
      // Whatever the status: the command committed, so a repeat must not run it again.
      try {
        await saveIdempotentResponse(deps.db, scope, await stored(c.res))
      }
      catch (error) {
        // The command did commit, so this client still gets its answer. A repeat gets 409 until the key expires.
        c.get('logger').error({ err: error }, 'idempotent response not stored')
      }
    }
  }
}
