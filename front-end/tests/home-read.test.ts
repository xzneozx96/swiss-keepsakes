import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadHomeRead } from '@/features/home/api/home-reads'
import { Route as HomeRoute } from '@/routes/_guest/$lang/index'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const mapItem = { id: id(1), slug: 'bridge', latitude: 47.05, longitude: 8.3, title: 'Chapel Bridge', language: 'en', categoryIds: [], stayTag: 'both', interests: [], nextDate: null, hasMainStory: false, mainStorySlug: null, photoUrl: null, photoVariants: [], mustVisit: true, tip: 'Go at dawn.' }
const tourCard = { id: id(2), slug: 'pilatus-above-the-city', title: 'Pilatus: Above the City', stayTag: 'multi_day', interests: [], durationMinutes: 390, coverKey: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

afterEach(() => vi.unstubAllGlobals())

function answerWith(routes: Record<string, () => Response>) {
  const calls: string[] = []

  vi.stubGlobal('fetch', vi.fn(async (input: Request | string | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    calls.push(`${url.pathname}${url.search}`)

    return routes[url.pathname]?.() ?? new Response('{}', { status: 500 })
  }))

  return calls
}

const json = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

describe('[E4.13][AC95] the home read', () => {
  it('reads the public map and the published tours in the page language (AC-5, AC-6)', async () => {
    const calls = answerWith({ '/api/public/map': json({ items: [mapItem] }), '/api/public/tours': json({ items: [tourCard] }) })
    const read = await loadHomeRead('de')

    expect(read.pins?.[0]?.title).toBe('Chapel Bridge')
    expect(read.tours?.[0]?.slug).toBe('pilatus-above-the-city')
    expect(calls.sort()).toEqual(['/api/public/map?lang=de', '/api/public/tours?lang=de'])
  })

  it('turns a failed read into null for that block only (AC-6)', async () => {
    answerWith({ '/api/public/map': json({ items: [mapItem] }) })
    const read = await loadHomeRead('en')

    expect(read.pins).toHaveLength(1)
    expect(read.tours).toBeNull()
  })

  it('turns an answer that does not match the contract into null', async () => {
    answerWith({ '/api/public/map': json({ items: [{ nonsense: true }] }), '/api/public/tours': json({ items: [] }) })
    const read = await loadHomeRead('en')

    expect(read.pins).toBeNull()
    expect(read.tours).toEqual([])
  })

  it('is the home route loader, with a skeleton page while it runs', () => {
    const options = HomeRoute.options as { loader?: unknown, pendingComponent?: unknown, ssr?: boolean }

    expect(options.ssr).toBe(true)
    expect(options.loader).toBeTypeOf('function')
    expect(options.pendingComponent).toBeTypeOf('function')
  })
})
