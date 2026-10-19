import { createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../../src/platform/http/app.ts'
import { createLogger } from '../../../src/platform/logger.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

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

function setup() {
  const logs: Record<string, unknown>[] = []
  const app = createApp(createLogger('info', { write: line => logs.push(JSON.parse(line)) }))
  app.openapi(probeRoute, c => c.json({ ok: true }, 200))
  app.get('/boom', () => {
    throw new Error('connection to db:5432 failed for user admin')
  })
  return { app, logs }
}

const postJson = (body: string) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

describe('[E1.8] HTTP app', () => {
  it('[E1.8] GET /healthz answers ok without a database', async () => {
    const { app } = setup()
    const response = await app.request('/healthz')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('[E1.8] generates a request id, returns it and logs it on the request line', async () => {
    const { app, logs } = setup()
    const response = await app.request('/healthz')
    const id = response.headers.get('X-Request-Id')

    expect(id).toMatch(UUID)
    expect(logs).toEqual([expect.objectContaining({ requestId: id, msg: 'request', method: 'GET', route: '/healthz', status: 200 })])
  })

  it('[E1.8] echoes a sane incoming X-Request-Id', async () => {
    const { app, logs } = setup()
    const response = await app.request('/healthz', { headers: { 'X-Request-Id': 'edge-7f3a_b=' } })

    expect(response.headers.get('X-Request-Id')).toBe('edge-7f3a_b=')
    expect(logs[0]).toMatchObject({ requestId: 'edge-7f3a_b=' })
  })

  it.each([
    ['unsafe characters', 'id with spaces;"quotes"'],
    ['over 255 characters', 'a'.repeat(256)],
  ])('[E1.8] replaces an incoming X-Request-Id with %s', async (_, incoming) => {
    const { app } = setup()
    const response = await app.request('/healthz', { headers: { 'X-Request-Id': incoming } })

    expect(response.headers.get('X-Request-Id')).toMatch(UUID)
  })

  it('[E1.8] an unknown route is a 404 problem+json carrying the request id', async () => {
    const { app } = setup()
    const response = await app.request('/api/nope', { headers: { 'X-Request-Id': 'req-404' } })

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get('X-Request-Id')).toBe('req-404')
    expect(await response.json()).toEqual({ type: 'not-found', status: 404, title: 'Not found', instance: '/api/nope', requestId: 'req-404' })
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

  it('[E1.8] an unexpected error is a 500 problem+json that hides the cause and logs it with the request id', async () => {
    const { app, logs } = setup()
    const response = await app.request('/boom', { headers: { 'X-Request-Id': 'req-500' } })
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get('X-Request-Id')).toBe('req-500')
    expect(JSON.parse(text)).toEqual({ type: 'internal-error', status: 500, title: 'Internal server error', instance: '/boom', requestId: 'req-500' })
    expect(text).not.toContain('db:5432')
    expect(logs).toEqual([
      expect.objectContaining({ level: 50, requestId: 'req-500', msg: 'unhandled error', err: expect.objectContaining({ message: 'connection to db:5432 failed for user admin' }) }),
      expect.objectContaining({ level: 30, requestId: 'req-500', msg: 'request', status: 500 }),
    ])
  })
})
