import { describe, expect, it } from 'vitest'
import { ownOrigin } from '../../../src/platform/auth.ts'
import { createGuardedApp, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const foreign = 'https://evil.example'

// A test-only route for every method the rule covers, and for GET, on the real app.
function setup() {
  const { app, calls } = createGuardedApp()
  const handled: string[] = []
  app.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], '/api/probe', (c) => {
    handled.push(c.req.method)
    return c.json({ ok: true }, 200)
  })
  // Stripe signs its events and sends no browser Origin. This stands for the route E4 adds.
  app.post('/webhooks/stripe', c => c.json({ received: true }, 200))
  return { app, calls, handled }
}

const json = { 'Content-Type': 'application/json' }
const form = { 'Content-Type': 'application/x-www-form-urlencoded' }
const requests = [
  ['a JSON POST', 'POST', json, '{"a":1}'],
  ['a form POST', 'POST', form, 'a=1'],
  ['a PUT', 'PUT', json, '{"a":1}'],
  ['a PATCH', 'PATCH', json, '{"a":1}'],
  ['a DELETE', 'DELETE', {}, undefined],
] as const

describe('[E2.10] the Origin rule on every POST, PUT, PATCH and DELETE under /api/', () => {
  it.each(requests)('[E2.10] %s from a foreign origin gets a 403 problem, and the handler never runs', async (_, method, headers, body) => {
    const { app, handled } = setup()
    const response = await app.request('/api/probe', { method, headers: { ...headers, Origin: foreign }, body })

    expect(response.status).toBe(403)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'origin-refused', status: 403, instance: '/api/probe' })
    expect(handled).toEqual([])
  })

  it.each(requests)('[E2.10] %s from our own origin passes', async (_, method, headers, body) => {
    const { app, handled } = setup()
    const response = await app.request('/api/probe', { method, headers: { ...headers, Origin: shopOrigin }, body })

    expect(response.status).toBe(200)
    expect(handled).toEqual([method])
  })

  it.each(requests)('[E2.10] %s without an Origin header is refused too, even with no cookie', async (_, method, headers, body) => {
    const { app, handled } = setup()
    const response = await app.request('/api/probe', { method, headers, body })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'origin-refused' })
    expect(handled).toEqual([])
  })

  it.each([
    ['"null", which a browser sends from an opaque context', 'null'],
    ['our host on another port', 'https://shop.example:8443'],
    ['our host on another scheme', 'http://shop.example'],
    ['a longer host that starts with ours', 'https://shop.example.evil.example'],
    ['a subdomain of ours', 'https://evil.shop.example'],
    ['ours with a trailing slash, which no browser sends', 'https://shop.example/'],
    ['an empty value', ''],
  ])('[E2.10] an Origin of %s is refused', async (_, origin) => {
    const { app } = setup()
    const response = await app.request('/api/probe', { method: 'POST', headers: { ...json, Origin: origin }, body: '{}' })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'origin-refused' })
  })

  it('[E2.10] GET is not checked, whatever its Origin', async () => {
    const { app } = setup()

    expect((await app.request('/api/probe', { headers: { Origin: foreign } })).status).toBe(200)
    expect((await app.request('/api/probe')).status).toBe(200)
  })

  it('[E2.10] it runs before Better Auth and before the session is read: a foreign sign-out gets our problem and reaches neither', async () => {
    const { app, calls } = setup()
    const response = await app.request('/api/auth/sign-out', { method: 'POST', headers: { ...json, ...signedInAs('user-1'), Origin: foreign }, body: '{}' })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ type: 'origin-refused' })
    expect(calls).toEqual({ authHandler: 0, readSession: 0 })
  })

  it('[E2.10] /api/auth/* from our own origin reaches Better Auth, whatever its content type', async () => {
    const { app, calls } = setup()

    expect((await app.request('/api/auth/sign-out', { method: 'POST', headers: { ...json, Origin: shopOrigin }, body: '{}' })).status).toBe(200)
    expect((await app.request('/api/auth/callback/google', { method: 'POST', headers: { ...form, Origin: shopOrigin }, body: 'code=1' })).status).toBe(200)
    expect(calls.authHandler).toBe(2)
  })

  it('[E2.10] /webhooks/stripe is not checked: a POST with a foreign origin and one with none both pass', async () => {
    const { app } = setup()

    expect((await app.request('/webhooks/stripe', { method: 'POST', headers: { Origin: foreign }, body: '{}' })).status).toBe(200)
    expect((await app.request('/webhooks/stripe', { method: 'POST', body: '{}' })).status).toBe(200)
  })

  it('[E2.10] the refusal is checked before the body limit and the body is never read', async () => {
    const { app } = setup()
    const response = await app.request('/api/probe', { method: 'POST', headers: { 'Origin': foreign, 'Content-Length': String(5 * 1024 * 1024) }, body: 'x' })

    expect(await response.json()).toMatchObject({ type: 'origin-refused' })
  })
})

describe('[E2.10] our own origin comes from BETTER_AUTH_URL, the value that sets Better Auth\'s trustedOrigins', () => {
  it.each([
    ['https://shop.example', 'https://shop.example'],
    ['http://localhost:5173', 'http://localhost:5173'],
    ['https://shop.example/some/path?x=1', 'https://shop.example'],
    ['https://SHOP.example:443/', 'https://shop.example'],
  ])('[E2.10] ownOrigin(%s) is %s', (baseUrl, expected) => {
    expect(ownOrigin(baseUrl)).toBe(expected)
  })
})
