import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSignedApiClient } from '@/features/data-client/api-client'

const API = 'https://api.example.test'

function stubFetch() {
  const requests: Request[] = []

  vi.stubGlobal('fetch', async (request: Request) => {
    requests.push(request)

    return Response.json({ status: 'ok' })
  })

  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[E2.1][AC01] the API client sends the JWT as a Bearer token', () => {
  it('sends the signed-in user\'s token in the Authorization header', async () => {
    const requests = stubFetch()
    const api = createSignedApiClient(API, async () => 'header.payload.signature')

    await api.GET('/healthz')

    expect(requests).toHaveLength(1)
    expect(requests[0]!.headers.get('Authorization')).toBe(
      'Bearer header.payload.signature',
    )
  })

  it('sends no Authorization header when nobody is signed in', async () => {
    const requests = stubFetch()
    const api = createSignedApiClient(API, async () => null)

    await api.GET('/healthz')

    expect(requests[0]!.headers.has('Authorization')).toBe(false)
  })

  it('asks for the token before every request, so a renewed token is sent', async () => {
    const requests = stubFetch()
    const tokens = ['first.jwt.token', 'renewed.jwt.token']
    const api = createSignedApiClient(API, async () => tokens.shift() ?? null)

    await api.GET('/healthz')
    await api.GET('/healthz')

    expect(requests.map(r => r.headers.get('Authorization'))).toEqual([
      'Bearer first.jwt.token',
      'Bearer renewed.jwt.token',
    ])
  })
})
