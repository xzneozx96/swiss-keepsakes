import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { createMapsLinks } from '../../../src/modules/content/adapters/maps-link-fetch.ts'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { makeResolveMapsLink } from '../../../src/modules/content/application/resolve-maps-link.ts'
import { systemClock } from '../../../src/platform/clock.ts'
import { createFakeContentUseCases } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

const short = 'https://maps.app.goo.gl/AbCdEf123'
const place = 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3074,17z/data=!3d47.0507!4d8.3068'

type FetchAnswer = Response | Error | 'hang'
const redirect = (location: string) => new Response(null, { status: 302, headers: { Location: location } })

// The real use case and adapter over a fetch that answers by URL and records what it was asked.
function setup(answers: Record<string, FetchAnswer>, timeoutMs = 3000) {
  const asked: { url: string, method: string | undefined, redirect: string | undefined }[] = []
  const fetchStub: typeof fetch = (input, init) => {
    const href = String(input instanceof Request ? input.url : input)
    asked.push({ url: href, method: init?.method, redirect: init?.redirect })
    const answer = answers[href]
    if (answer === 'hang') {
      return new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)))
    }
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer ?? new Response(null, { status: 404 }))
  }
  const useCases: ContentUseCases = { ...createFakeContentUseCases(), resolveMapsLink: makeResolveMapsLink({ links: createMapsLinks(fetchStub), clock: systemClock, timeoutMs }) }
  const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  const get = (url: string | undefined, who: string | null = 'owner', storeId = lucerne) =>
    app.request(`/api/store/${storeId}/maps-link${url === undefined ? '' : `?url=${encodeURIComponent(url)}`}`, { headers: who === null ? {} : signedInAs(who) })
  return { asked, get }
}

describe('gET /api/store/{storeId}/maps-link', () => {
  it('[E7] answers the position behind a short link, asking with HEAD and no redirect following', async () => {
    const s = setup({ [short]: redirect(place) })

    const response = await s.get(short)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ latitude: 47.0507, longitude: 8.3068 })
    expect(s.asked).toEqual([{ url: short, method: 'HEAD', redirect: 'manual' }])
  })

  it('[E7] a manager may use it too', async () => {
    expect((await setup({ [short]: redirect(place) }).get(short, 'manager')).status).toBe(200)
  })

  it('[E7] follows redirects between allowed Google hosts and reads the position from the last', async () => {
    const s = setup({
      [short]: redirect('https://www.google.com/maps/hop1'),
      'https://www.google.com/maps/hop1': redirect('https://www.google.ch/maps?q=47.05,8.31'),
    })

    const response = await s.get(short)

    expect(await response.json()).toEqual({ latitude: 47.05, longitude: 8.31 })
    expect(s.asked.map(a => a.url)).toEqual([short, 'https://www.google.com/maps/hop1'])
  })

  it.each([
    ['at the first hop', { [short]: redirect('https://evil.example/maps/@47.0,8.0,1z') }, 1],
    ['at a later hop', { [short]: redirect('https://www.google.com/maps/hop1'), 'https://www.google.com/maps/hop1': redirect('http://localhost:8080/admin') }, 2],
    ['to a private address', { [short]: redirect('https://169.254.169.254/latest/meta-data') }, 1],
  ])('[E7] a redirect to a host that is not Google\'s %s answers 422 maps-link-unreadable and that host is never asked', async (_name, answers, requests) => {
    const s = setup(answers)

    const response = await s.get(short)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'maps-link-unreadable', status: 422 })
    expect(s.asked).toHaveLength(requests)
    expect(s.asked.every(a => a.url === short || a.url.startsWith('https://www.google.com/'))).toBe(true)
  })

  it('[E7] more than 5 redirects answers 422 maps-link-unreadable after 5 requests', async () => {
    const hops = Array.from({ length: 8 }, (_, i) => `https://www.google.com/maps/hop${i}`)
    const s = setup({ [short]: redirect(hops[0]!), ...Object.fromEntries(hops.map((hop, i) => [hop, redirect(hops[i + 1] ?? place)])) })

    const response = await s.get(short)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'maps-link-unreadable' })
    expect(s.asked).toHaveLength(5)
  })

  it('[E7] a link that does not answer in time is 422 maps-link-unreadable', async () => {
    const s = setup({ [short]: 'hang' }, 30)

    const response = await s.get(short)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'maps-link-unreadable' })
  })

  it.each([
    ['a failed request', new Error('connect ECONNREFUSED')],
    ['a final page with no position', redirect('https://www.google.com/maps/place/Lucerne')],
    ['a 404', new Response(null, { status: 404 })],
  ])('[E7] %s is 422 maps-link-unreadable', async (_name, answer) => {
    const response = await setup({ [short]: answer }).get(short)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'maps-link-unreadable' })
  })

  it.each([
    'http://maps.app.goo.gl/AbCdEf123',
    'https://evil.example/maps/abc',
    'https://www.google.com/maps/@47.0,8.0,1z',
    'not a url',
  ])('[E7] the pasted link %s is 422 maps-link-unreadable and nothing is fetched', async (url) => {
    const s = setup({})

    const response = await s.get(url)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'maps-link-unreadable' })
    expect(s.asked).toEqual([])
  })

  it('[E7] a missing url is 400 validation-failed', async () => {
    const response = await setup({}).get(undefined)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'validation-failed' })
  })

  it.each([
    ['anonymous', null, 401],
    ['guest', 'guest', 403],
    ['a member of another store', 'ownerElsewhere', 403],
  ])('[E7] %s is refused and nothing is fetched', async (_name, who, status) => {
    const s = setup({ [short]: redirect(place) })
    const response = await s.get(short, who)

    expect(response.status).toBe(status)
    expect(s.asked).toEqual([])
  })
})
