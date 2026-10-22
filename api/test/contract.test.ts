import type { Problem } from '@sk/api-contract'
import type { HealthReport } from '../src/platform/health.ts'
import type { HttpServer } from '../src/platform/http/server.ts'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRoute, z } from '@hono/zod-openapi'
import { createApiClient, problemSchema, problemTypes } from '@sk/api-contract'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'
import { contractApp, generateContract, generatedDir, openApiDocument } from '../scripts/contract.ts'
import { createApp } from '../src/platform/http/app.ts'
import { startHttpServer } from '../src/platform/http/server.ts'
import { createLogger } from '../src/platform/logger.ts'
import { noCommands } from './support/commands.ts'
import { noSessions } from './support/identity.ts'

const servers: HttpServer[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()))
})

// The real app on a free port, reached over HTTP.
async function serve(health: HealthReport) {
  const logs: Record<string, unknown>[] = []
  const logger = createLogger('info', { write: line => logs.push(JSON.parse(line)) })
  servers.push(await startHttpServer(createApp(logger, async () => health, noSessions, noCommands).fetch, '127.0.0.1', 0, logger))
  const listening = logs.find(line => line.msg === 'api listening')
  return `http://127.0.0.1:${listening?.port}`
}

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])

// `GET /partner/{token}` for each method and path the app answers. Middleware is registered as method ALL.
function servedRoutes(app: ReturnType<typeof contractApp>) {
  const routes = app.routes.filter(route => route.method !== 'ALL').map(route => `${route.method} ${route.path.replace(/:(\w+)(\{[^}]*\})?/g, '{$1}')}`)
  return [...new Set(routes)].sort()
}

function operations(document: ReturnType<typeof openApiDocument>) {
  return Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
    Object.entries(item).filter(([method]) => httpMethods.has(method)).map(([method, operation]) => ({ route: `${method.toUpperCase()} ${path}`, operation })))
}

describe('[E1.10] API contract', () => {
  // The contract diff gate. Importing TypeScript and Redocly makes the first build slow.
  it('[E1.10] the committed packages/api-contract/generated/ files equal a fresh build from the API routes', { timeout: 30_000 }, async () => {
    const fresh = await generateContract()

    expect((await readdir(generatedDir)).sort(), 'packages/api-contract/generated/ holds other files. Run `pnpm contract:build`').toEqual(Object.keys(fresh).sort())
    for (const [name, contents] of Object.entries(fresh)) {
      const committed = await readFile(join(generatedDir, name), 'utf8')
      expect(committed, `packages/api-contract/generated/${name} differs from a fresh build. Run \`pnpm contract:build\` and commit the result`).toBe(contents)
    }
  })

  it('[E1.10] the generated client calls GET /healthz on the real app and gets the typed body', async () => {
    const client = createApiClient(await serve({ database: true, jobs: true }))
    const { data, error, response } = await client.GET('/healthz')

    expectTypeOf(data).toEqualTypeOf<{ status: 'ok' } | undefined>()
    expect(response.status).toBe(200)
    expect(error).toBeUndefined()
    expect(data).toEqual({ status: 'ok' })
  })

  it('[E1.10] a 503 from /healthz reaches the client as a problem typed by the contract schema', async () => {
    const client = createApiClient(await serve({ database: false, jobs: true }))
    const { data, error, response } = await client.GET('/healthz')

    // The generated type and z.infer of the Zod schema are the same type.
    expectTypeOf(error).toEqualTypeOf<Problem | undefined>()
    expect(response.status).toBe(503)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(data).toBeUndefined()
    expect(problemSchema.parse(error)).toEqual(error)
    expect(error).toMatchObject({ type: 'unhealthy', status: 503, checks: { database: 'failed', jobs: 'ok' } })
  })

  it('[E1.10] an unknown path is a 404 problem+json that the contract\'s problem schema parses without losing a field', async () => {
    const response = await fetch(`${await serve({ database: true, jobs: true })}/api/stores/lucerne`)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(problemSchema.parse(body)).toEqual(body)
    expect(body).toMatchObject({ type: 'not-found', status: 404, instance: '/api/stores/lucerne' })
  })

  it('[E1.10] a problem whose code this client does not know still parses, so an older page can show generic copy', () => {
    const later = { type: 'departure-sold-out', status: 409, title: 'Sold out', instance: '/api/me/bookings', requestId: 'r-1' }

    expect(problemTypes).not.toContain(later.type)
    expect(problemSchema.parse(later)).toEqual(later)
  })

  it('[E1.10] generation fails when two different schemas share one .meta id, which zod-to-openapi would merge silently', async () => {
    const app = contractApp()
    const first = z.object({ seats: z.int() }).meta({ id: 'Clash' })
    const second = z.object({ email: z.string() }).meta({ id: 'Clash' })
    app.openapi(createRoute({ method: 'get', path: '/first', responses: { 200: { description: 'First', content: { 'application/json': { schema: first } } } } }), c => c.json({ seats: 2 }, 200))
    // Nested, so the check has to look inside schemas, not only at each route's top level.
    const wrapper = z.object({ guest: second })
    app.openapi(createRoute({ method: 'get', path: '/second', responses: { 200: { description: 'Second', content: { 'application/json': { schema: wrapper } } } } }), c => c.json({ guest: { email: 'a@b.ch' } }, 200))

    await expect(generateContract(app)).rejects.toThrow('Two different schemas are named "Clash"')
  })

  it('[E1.10] generation fails when a component is named with .openapi(name), which the id check cannot see', async () => {
    const app = contractApp()
    const named = z.object({ seats: z.int() }).openapi('NamedOutsideTheContract')
    app.openapi(createRoute({ method: 'get', path: '/named', responses: { 200: { description: 'Named', content: { 'application/json': { schema: named } } } } }), c => c.json({ seats: 2 }, 200))

    await expect(generateContract(app)).rejects.toThrow('Schema components NamedOutsideTheContract are not named with .meta({ id })')
  })

  it('[E1.10] every route the app serves is in the document, with the shared problem response and X-Request-Id on every response', () => {
    const app = contractApp()
    const document = openApiDocument(app)

    expect(operations(document).map(({ route }) => route).sort(), 'A route registered without app.openapi() is missing from the contract').toEqual(servedRoutes(app))
    for (const { route, operation } of operations(document)) {
      expect(operation.responses?.default, `${route} has no shared problem response`).toMatchObject({ content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } } })
      for (const [status, response] of Object.entries(operation.responses ?? {}))
        expect(response, `${route} ${status} has no X-Request-Id header`).toMatchObject({ headers: { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } } })
    }
  })
})
