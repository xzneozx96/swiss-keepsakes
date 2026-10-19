import type { Problem } from '@sk/api-contract'
import type { HealthReport } from '../src/platform/health.ts'
import type { HttpServer } from '../src/platform/http/server.ts'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createApiClient, problemSchema, problemTypes } from '@sk/api-contract'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'
import { generateContract, generatedDir } from '../scripts/contract.ts'
import { createApp } from '../src/platform/http/app.ts'
import { startHttpServer } from '../src/platform/http/server.ts'
import { createLogger } from '../src/platform/logger.ts'

const servers: HttpServer[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()))
})

// The real app on a free port, reached over HTTP.
async function serve(health: HealthReport) {
  const logs: Record<string, unknown>[] = []
  const logger = createLogger('info', { write: line => logs.push(JSON.parse(line)) })
  servers.push(await startHttpServer(createApp(logger, async () => health).fetch, '127.0.0.1', 0, logger))
  const listening = logs.find(line => line.msg === 'api listening')
  return `http://127.0.0.1:${listening?.port}`
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
})
