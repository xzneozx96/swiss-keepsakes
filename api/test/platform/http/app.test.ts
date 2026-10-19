import type { HealthReport } from '../../../src/platform/health.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { problemSchema } from '@sk/api-contract'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../../src/platform/http/app.ts'
import { createLogger } from '../../../src/platform/logger.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// The shape of a node-postgres DatabaseError: its message and `detail` quote the row that failed.
class DatabaseError extends Error {
  code = '23505'
  constraint = 'guests_email_key'
  table = 'guests'
  detail = 'Key (email)=(anna@example.ch) already exists.'
}

const partnerRoute = createRoute({
  method: 'get',
  path: '/partner/{token}',
  request: { params: z.object({ token: z.string() }) },
  responses: { 200: { description: 'Partner entry', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } } },
})

const probeRoute = createRoute({
  method: 'post',
  path: '/probe',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: z.object({ name: z.string().min(1), seats: z.number().int() }) } },
    },
  },
  responses: { 200: { description: 'Valid', content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } } } },
})

function setup(health: HealthReport = { database: true, jobs: true }) {
  const logs: Record<string, unknown>[] = []
  const app = createApp(createLogger('info', { write: line => logs.push(JSON.parse(line)) }), async () => health)
  app.openapi(probeRoute, c => c.json({ ok: true }, 200))
  app.openapi(partnerRoute, c => c.json({ ok: true }, 200))
  app.get('/boom', () => {
    throw new DatabaseError('duplicate key value violates unique constraint, params: anna@example.ch,For Anna')
  })
  app.get('/limited', () => {
    throw new HTTPException(429, { res: new Response(null, { headers: { 'Retry-After': '30' } }) })
  })
  app.get('/private', () => {
    throw new HTTPException(401, { res: new Response(null, { headers: { 'WWW-Authenticate': 'Bearer realm="api"' } }) })
  })
  app.get('/unavailable', () => {
    throw new HTTPException(503, { message: 'pool exhausted while saving anna@example.ch', cause: new DatabaseError('params: anna@example.ch') })
  })
  app.post('/api/size', async c => c.json({ bytes: (await c.req.arrayBuffer()).byteLength }, 200))
  return { app, logs }
}

const mebibyte = 1024 * 1024

// A body the client streams, so it has no Content-Length and the limit has to count it.
function streamed(bytes: number) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let sent = 0; sent < bytes; sent += 64 * 1024)
        controller.enqueue(new Uint8Array(Math.min(64 * 1024, bytes - sent)))
      controller.close()
    },
  })
}

const postJson = (body: string) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

describe('[E1.9] the /api/* body limit', () => {
  it('[E1.9] a body of exactly 1 MiB is read', async () => {
    const { app } = setup()
    const response = await app.request('/api/size', { method: 'POST', body: new Uint8Array(mebibyte) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ bytes: mebibyte })
  })

  it.each([
    ['declared in Content-Length', () => ({ method: 'POST', headers: { 'Content-Length': String(mebibyte + 1) }, body: new Uint8Array(mebibyte + 1) })],
    ['streamed without a length', () => ({ method: 'POST', body: streamed(mebibyte + 1), duplex: 'half' })],
  ])('[E1.9] a body over 1 MiB, %s, is a 413 problem+json', async (_, init) => {
    const { app } = setup()
    const response = await app.request('/api/size', init() as RequestInit)

    expect(response.status).toBe(413)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'body-too-large', status: 413, instance: '/api/size' })
  })
})

describe('[E1.8] HTTP app', () => {
  it('[E1.9] GET /healthz answers 200 ok when the database and pg-boss checks pass', async () => {
    const { app } = setup()
    const response = await app.request('/healthz')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it.each([
    [{ database: false, jobs: true }, { database: 'failed', jobs: 'ok' }],
    [{ database: true, jobs: false }, { database: 'ok', jobs: 'failed' }],
  ])('[E1.9] GET /healthz answers 503 problem+json naming the failed check (%j)', async (health, checks) => {
    const { app } = setup(health)
    const response = await app.request('/healthz')

    expect(response.status).toBe(503)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'unhealthy', status: 503, checks })
  })

  it('[E1.8] generates a request id, returns it and logs it on the request line', async () => {
    const { app, logs } = setup()
    const response = await app.request('/healthz')
    const id = response.headers.get('X-Request-Id')

    expect(id).toMatch(UUID)
    expect(logs).toEqual([expect.objectContaining({ requestId: id, msg: 'request', method: 'GET', route: '/healthz', status: 200 })])
  })

  it('[E1.9] a sane incoming X-Request-Id is logged as clientRequestId, and the server still makes its own id', async () => {
    const { app, logs } = setup()
    const response = await app.request('/healthz', { headers: { 'X-Request-Id': 'edge-7f3a_b=' } })
    const id = response.headers.get('X-Request-Id')

    expect(id).toMatch(UUID)
    expect(logs).toEqual([expect.objectContaining({ requestId: id, clientRequestId: 'edge-7f3a_b=', msg: 'request' })])
  })

  it.each([
    ['unsafe characters', 'id with spaces;"quotes"'],
    ['over 255 characters', 'a'.repeat(256)],
  ])('[E1.9] an incoming X-Request-Id with %s is neither used nor logged', async (_, incoming) => {
    const { app, logs } = setup()
    const response = await app.request('/healthz', { headers: { 'X-Request-Id': incoming } })

    expect(response.headers.get('X-Request-Id')).toMatch(UUID)
    expect(logs[0]).not.toHaveProperty('clientRequestId')
    expect(JSON.stringify(logs)).not.toContain(incoming)
  })

  it('[E1.8] an unknown route is a 404 problem+json carrying the request id', async () => {
    const { app } = setup()
    const response = await app.request('/api/nope', { headers: { 'X-Request-Id': 'req-404' } })
    const id = response.headers.get('X-Request-Id')

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(id).toMatch(UUID)
    expect(await response.json()).toEqual({ type: 'not-found', status: 404, title: 'Not found', instance: '/api/nope', requestId: id })
  })

  it('[E1.8] a validation failure is a 400 problem+json listing each bad field', async () => {
    const { app } = setup()
    const response = await app.request('/probe', postJson('{"name":"","seats":"two"}'))
    const id = response.headers.get('X-Request-Id')

    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(id).toMatch(UUID)
    expect(await response.json()).toEqual({
      type: 'validation-failed',
      status: 400,
      title: 'The request is not valid',
      instance: '/probe',
      requestId: id,
      errors: [
        { in: 'json', path: 'name', message: expect.any(String) },
        { in: 'json', path: 'seats', message: expect.any(String) },
      ],
    })
  })

  it('[E1.8] malformed JSON is a 400 problem+json', async () => {
    const { app } = setup()
    const response = await app.request('/probe', postJson('{"name":'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get('X-Request-Id')).toMatch(UUID)
    expect(await response.json()).toMatchObject({ type: 'about:blank', status: 400, title: 'Bad Request' })
  })

  it('[E1.8] an unexpected error is a 500 problem+json that hides the cause, and the log keeps the error type and code but not the guest data in it', async () => {
    const { app, logs } = setup()
    const response = await app.request('/boom')
    const id = response.headers.get('X-Request-Id')
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(id).toMatch(UUID)
    expect(JSON.parse(text)).toEqual({ type: 'internal-error', status: 500, title: 'Internal server error', instance: '/boom', requestId: id })
    expect(text).not.toContain('anna@example.ch')
    expect(logs).toEqual([
      expect.objectContaining({ level: 50, requestId: id, msg: 'unhandled error', err: expect.objectContaining({ type: 'DatabaseError', code: '23505', table: 'guests' }) }),
      expect.objectContaining({ level: 30, requestId: id, msg: 'request', status: 500 }),
    ])
    const logText = JSON.stringify(logs)
    for (const guestData of ['anna@example.ch', 'For Anna', 'Key (email)'])
      expect(logText).not.toContain(guestData)
  })

  it('[E1.8] the request line logs the route pattern, not the token in the path', async () => {
    const { app, logs } = setup()
    const response = await app.request('/partner/tok_s3cr3t_partner')

    expect(response.status).toBe(200)
    expect(logs).toEqual([expect.objectContaining({ msg: 'request', route: '/partner/:token', status: 200 })])
    expect(JSON.stringify(logs)).not.toContain('tok_s3cr3t_partner')
  })

  it.each([
    ['/limited', 429, 'Too Many Requests', 'Retry-After', '30'],
    ['/private', 401, 'Unauthorized', 'WWW-Authenticate', 'Bearer realm="api"'],
  ])('[E1.8] an HTTPException on %s keeps its headers on the problem+json response', async (path, status, title, header, value) => {
    const { app, logs } = setup()
    const response = await app.request(path)

    expect(response.status).toBe(status)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get(header)).toBe(value)
    expect(await response.json()).toMatchObject({ type: 'about:blank', status, title })
    expect(logs.map(line => line.msg)).toEqual(['request'])
  })

  it('[E1.8] a 5xx HTTPException logs its cause at error level through the allow-list', async () => {
    const { app, logs } = setup()
    const response = await app.request('/unavailable')

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ type: 'about:blank', status: 503, title: 'Service Unavailable' })
    expect(logs[0]).toMatchObject({ level: 50, requestId: response.headers.get('X-Request-Id'), msg: 'http exception', err: { type: 'HTTPException', cause: { type: 'DatabaseError', code: '23505' } } })
    expect(JSON.stringify(logs)).not.toContain('anna@example.ch')
  })

  it.each([
    ['validation-failed', '/probe', postJson('{"name":"","seats":"two"}'), { database: true, jobs: true }],
    ['about:blank', '/probe', postJson('{"name":'), { database: true, jobs: true }],
    ['not-found', '/api/nope', undefined, { database: true, jobs: true }],
    ['internal-error', '/boom', undefined, { database: true, jobs: true }],
    ['unhealthy', '/healthz', undefined, { database: false, jobs: true }],
  ])('[E1.10] the %s problem matches the contract\'s problem schema with no extra field', async (type, path, init, health) => {
    const { app } = setup(health)
    const body = await (await app.request(path, init)).json()

    expect(body).toMatchObject({ type })
    expect(problemSchema.parse(body)).toEqual(body)
  })
})
