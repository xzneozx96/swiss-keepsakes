import type { StoredResponse } from '../../../src/platform/db/schema.ts'
import type { AppEnv } from '../../../src/platform/http/app.ts'
import { Buffer } from 'node:buffer'
import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { systemClock } from '../../../src/platform/clock.ts'
import { idempotency } from '../../../src/platform/http/idempotency.ts'
import { createLogger } from '../../../src/platform/logger.ts'

const saved: StoredResponse[] = []

vi.mock('../../../src/platform/idempotency.ts', async importOriginal => ({
  ...await importOriginal<typeof import('../../../src/platform/idempotency.ts')>(),
  findIdempotencyRecord: async () => undefined,
  saveIdempotentResponse: async (_db: unknown, _scope: unknown, response: StoredResponse) => {
    saved.push(response)
  },
  runWithClaim: async (claim: { state: string }, next: () => Promise<void>) => {
    claim.state = 'claimed'
    return next()
  },
}))

function setup(respond: () => Response) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('logger', createLogger('silent'))
    await next()
  })
  app.use('*', idempotency({ db: {} as never, clock: systemClock, actorId: () => 'user-1' }))
  app.post('/command', () => respond())
  return app
}

const send = (app: Hono<AppEnv>) => app.request('/command', { method: 'POST', headers: { 'Idempotency-Key': 'key-1' }, body: '{}' })

afterEach(() => {
  saved.length = 0
  vi.restoreAllMocks()
})

describe('[E2.4] the Idempotency-Key middleware stores the answer without cloning it', () => {
  it('[E2.4] reads the body once and never clones the response, so a dropped clone cannot cancel the answer', async () => {
    const clone = vi.spyOn(Response.prototype, 'clone')
    const app = setup(() => new Response('{"ok":"Zürich ✓"}', { status: 201, headers: { 'Content-Type': 'application/json', 'X-Own': 'kept' } }))

    const response = await send(app)

    expect(clone).not.toHaveBeenCalled()
    expect(response.status).toBe(201)
    expect(response.headers.get('X-Own')).toBe('kept')
    expect(await response.text()).toBe('{"ok":"Zürich ✓"}')
    expect(saved).toHaveLength(1)
    expect(Buffer.from(saved[0]!.base64Body!, 'base64').toString()).toBe('{"ok":"Zürich ✓"}')
  })

  it('[E2.4] stores no body for a 204 and keeps the status', async () => {
    const app = setup(() => new Response(null, { status: 204 }))

    const response = await send(app)

    expect(response.status).toBe(204)
    expect(saved).toEqual([{ status: 204, headers: {}, base64Body: null }])
  })
})
