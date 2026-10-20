import type { JWK } from 'jose'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Authentication } from '../../../src/platform/http/auth.ts'
import type { Person, SigningKey } from '../../support/identity.ts'
import { createServer } from 'node:http'
import { createRoute, z } from '@hono/zod-openapi'
import { problemSchema } from '@sk/api-contract'
import { SignJWT, UnsecuredJWT } from 'jose'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../../src/platform/http/app.ts'
import { neonAuthVerifier } from '../../../src/platform/http/auth.ts'
import { createLogger } from '../../../src/platform/logger.ts'
import { createSigningKey, signToken, testAuthentication, testIssuer, tokenLifetime } from '../../support/identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const ownerId = '0190f0c2-0000-7000-8000-0000000000b1'
const people: Record<string, Person> = { [ownerId]: { memberships: [{ storeId: lucerne, role: 'owner' }] } }

let key: SigningKey
beforeAll(async () => {
  key = await createSigningKey()
})

const servers = new Set<Server>()
afterEach(() => {
  for (const server of servers) server.close()
  servers.clear()
})

function whoRoute(path: string) {
  return createRoute({
    method: 'get',
    path,
    responses: { 200: { description: 'The actor', content: { 'application/json': { schema: z.object({ kind: z.string() }) } } } },
  })
}

// The real app with two test-only routes: a public one and one inside a store.
function setup(auth?: Authentication) {
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const logs: Record<string, unknown>[] = []
  const app = createApp(createLogger('info', { write: line => logs.push(JSON.parse(line)) }), async () => ({ database: true, jobs: true }), auth ?? testAuthentication([key.jwk], clock, people))
  app.openapi(whoRoute('/api/public/who'), c => c.json({ kind: c.get('actor').kind }, 200))
  app.openapi(whoRoute('/api/store/{storeId}/who'), c => c.json({ kind: c.get('actor').kind }, 200))
  const get = (path: string, token?: string) => app.request(path, token === undefined ? {} : { headers: { Authorization: `Bearer ${token}` } })
  return { app, clock, logs, get }
}

async function expectRefused(response: Response, challenge = 'Bearer error="invalid_token"') {
  const body = await response.json()
  expect(response.status).toBe(401)
  expect(response.headers.get('Content-Type')).toBe('application/problem+json')
  expect(response.headers.get('WWW-Authenticate')).toBe(challenge)
  expect(body).toMatchObject({ type: 'unauthenticated', status: 401 })
  expect(problemSchema.parse(body)).toEqual(body)
}

// A JWKS endpoint at <base>/.well-known/jwks.json, the way Neon Auth serves it.
async function serveKeys(answer: () => { status: number, keys?: JWK[] }) {
  const server = createServer((request, response) => {
    const { status, keys } = answer()
    if (request.url !== '/neondb/auth/.well-known/jwks.json' || status !== 200) {
      response.writeHead(request.url === '/neondb/auth/.well-known/jwks.json' ? status : 404).end()
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ keys }))
  })
  servers.add(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { server, origin, base: `${origin}/neondb/auth` }
}

describe('[E2.2] Bearer JWT verification on /api/*', () => {
  it('[E2.2] a request without Authorization is anonymous, and a public route still answers', async () => {
    const { get } = setup()
    const response = await get('/api/public/who')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ kind: 'anonymous' })
  })

  it('[E2.2] a valid token loads the actor from the identity tables, and the request line logs the user and the store but not the token', async () => {
    const { get, clock, logs } = setup()
    const token = await signToken(key, clock, { sub: ownerId })
    const response = await get(`/api/store/${lucerne}/who`, token)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ kind: 'staff' })
    expect(logs).toEqual([expect.objectContaining({ msg: 'request', userId: ownerId, storeId: lucerne, status: 200 })])
    expect(JSON.stringify(logs)).not.toContain(token)
    expect(JSON.stringify(logs)).not.toContain('guest@example.ch')
  })

  it('[E2.2] a token is accepted until the second before exp, and refused with 401 from exp on', async () => {
    const { get, clock, logs } = setup()
    const token = await signToken(key, clock, { sub: ownerId })

    clock.advance((tokenLifetime - 1) * 1000)
    expect((await get('/api/public/who', token)).status).toBe(200)
    clock.advance(1000)
    await expectRefused(await get('/api/public/who', token))
    expect(logs).toContainEqual(expect.objectContaining({ msg: 'token refused', reason: 'ERR_JWT_EXPIRED', level: 30 }))
  })

  it('[E2.2] a token from another issuer gets 401', async () => {
    const { get, clock, logs } = setup()

    await expectRefused(await get('/api/public/who', await signToken(key, clock, { iss: 'https://evil.example.test' })))
    // The full Auth URL is not the issuer either: Neon Auth puts only its origin in iss.
    await expectRefused(await get('/api/public/who', await signToken(key, clock, { iss: `${testIssuer}/neondb/auth` })))
    expect(logs).toContainEqual(expect.objectContaining({ msg: 'token refused', reason: 'ERR_JWT_CLAIM_VALIDATION_FAILED' }))
  })

  it('[E2.2] a bad signature gets 401: another key with the same key id, and a changed payload', async () => {
    const { get, clock } = setup()
    const impostor = await createSigningKey(key.kid)
    const [header, , signature] = (await signToken(key, clock, { sub: ownerId })).split('.')
    const otherPayload = (await signToken(key, clock, { sub: ownerId, role: 'admin' })).split('.')[1]

    await expectRefused(await get('/api/public/who', await signToken(impostor, clock, { sub: ownerId })))
    await expectRefused(await get('/api/public/who', `${header}.${otherPayload}.${signature}`))
  })

  it('[E2.2] a key id the key set does not hold gets 401', async () => {
    const { get, clock, logs } = setup()

    await expectRefused(await get('/api/public/who', await signToken(key, clock, {}, { kid: 'rotated-away' })))
    expect(logs).toContainEqual(expect.objectContaining({ reason: 'ERR_JWKS_NO_MATCHING_KEY' }))
  })

  it('[E2.2] only EdDSA is accepted: an HS256 token and an unsigned token get 401', async () => {
    const { get, clock, logs } = setup()
    const iat = Math.floor(clock.now().getTime() / 1000)
    const claims = { iss: testIssuer, sub: ownerId, iat, exp: iat + tokenLifetime }
    const hmac = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256', kid: key.kid }).sign(new TextEncoder().encode('a shared secret of 32 bytes or more'))

    await expectRefused(await get('/api/public/who', hmac))
    // Refused for its algorithm, before any key is looked up.
    expect(logs).toContainEqual(expect.objectContaining({ msg: 'token refused', reason: 'ERR_JOSE_ALG_NOT_ALLOWED' }))
    await expectRefused(await get('/api/public/who', new UnsecuredJWT(claims).encode()))
  })

  it.each([
    ['without exp', { exp: undefined }],
    ['without sub', { sub: undefined }],
    ['whose sub is not a uuid', { sub: 'not-a-uuid' }],
  ])('[E2.2] a token %s gets 401', async (_, claims) => {
    const { get, clock } = setup()

    await expectRefused(await get('/api/public/who', await signToken(key, clock, claims)))
  })

  it.each(['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer ', 'Bearer two tokens', 'Token abc', ''])('[E2.2] the Authorization header %j gets 401', async (header) => {
    const { app } = setup()

    await expectRefused(await app.request('/api/public/who', { headers: { Authorization: header } }))
  })

  it('[E2.2] a store route without a token gets 401 with a plain Bearer challenge', async () => {
    const { get } = setup()
    const response = await get(`/api/store/${lucerne}/who`)

    await expectRefused(response, 'Bearer')
  })

  it('[E2.2][AC02] the owner of one store gets a 403 problem in another store, with no challenge', async () => {
    const { get, clock } = setup()
    const response = await get('/api/store/0190f0c2-0000-7000-8000-00000000000f/who', await signToken(key, clock, { sub: ownerId }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(response.headers.get('WWW-Authenticate')).toBeNull()
    expect(body).toMatchObject({ type: 'forbidden', status: 403 })
    expect(problemSchema.parse(body)).toEqual(body)
  })

  it('[E2.2] /healthz is outside /api/* and ignores a bad token', async () => {
    const { app } = setup()

    expect((await app.request('/healthz', { headers: { Authorization: 'Bearer nonsense' } })).status).toBe(200)
  })
})

describe('[E2.2] Neon Auth key set over HTTP', () => {
  it('[E2.2] keys come from <NEON_AUTH_BASE_URL>/.well-known/jwks.json and the issuer is the origin of that URL', async () => {
    const { origin, base } = await serveKeys(() => ({ status: 200, keys: [key.jwk] }))
    const { get, clock } = setup()
    const auth = { verifyToken: neonAuthVerifier(`${base}/`, clock), loadActor: testAuthentication([], clock, people).loadActor }
    const { get: getWithNeon } = setup(auth)

    const token = await signToken(key, clock, { iss: origin, sub: ownerId })
    const response = await getWithNeon(`/api/store/${lucerne}/who`, token)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ kind: 'staff' })
    await expectRefused(await getWithNeon('/api/public/who', await signToken(key, clock, { iss: base, sub: ownerId })))
    // The same token is foreign to the test issuer.
    await expectRefused(await get('/api/public/who', token))
  })

  it.each([
    ['answers 500', 500],
    ['is not reachable', 0],
  ])('[E2.2] when the key set endpoint %s, a signed-in request gets 503 and the cause is logged, so the SPA keeps its session', async (_, status) => {
    const { server, origin, base } = await serveKeys(() => ({ status }))
    if (status === 0)
      server.close()
    const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
    const { get, logs } = setup({ verifyToken: neonAuthVerifier(base, clock), loadActor: testAuthentication([], clock).loadActor })

    const response = await get('/api/public/who', await signToken(key, clock, { iss: origin }))

    expect(response.status).toBe(503)
    expect(response.headers.get('WWW-Authenticate')).toBeNull()
    expect(await response.json()).toMatchObject({ type: 'about:blank', status: 503 })
    expect(logs).toContainEqual(expect.objectContaining({ level: 50, msg: 'http exception', err: expect.objectContaining({ type: 'HTTPException' }) }))
  })
})
