import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadHomeRead } from '@/features/home/api/home-reads'
import { Route as HomeRoute } from '@/routes/_guest/$lang/index'

const mode = vi.hoisted(() => ({ on: true }))

vi.mock('@/lib/api-mode', () => ({ get apiEnabled() { return mode.on } }))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const mapItem = { id: id(1), slug: 'bridge', latitude: 47.05, longitude: 8.3, title: 'Chapel Bridge', language: 'en', categoryIds: [id(3)], stayTag: 'both', interests: [], nextDate: null, hasMainStory: false, mainStorySlug: null, photoUrl: null, photoVariants: [], mustVisit: true, tip: 'Go at dawn.' }
const water = { id: id(3), slug: 'drinking-water', name: { en: 'Drinking water', de: 'Trinkwasser' }, parentId: null, icon: 'water', showOnHome: true, position: 1 }
const storyCard = (n: number, publishedAt: string) => ({ id: id(400 + n), slug: `story-${n}`, title: `Story ${n}`, excerpt: 'x', readMinutes: 3, coverKey: null, cover: null, stayTag: 'both', interests: [], categories: [], publishedAt, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] })
const tourCard = { id: id(2), slug: 'pilatus-above-the-city', title: 'Pilatus: Above the City', stayTag: 'multi_day', interests: [], durationMinutes: 390, coverKey: null, cover: null, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }

afterEach(() => {
  mode.on = true
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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
    const calls = answerWith({ '/api/public/map': json({ items: [mapItem] }), '/api/public/map-categories': json({ items: [water] }), '/api/public/tours': json({ items: [tourCard] }), '/api/public/stories': json({ items: [storyCard(1, '2026-10-01T10:00:00.000Z')] }) })
    const read = await loadHomeRead('de')

    expect(read.pins?.[0]?.title).toBe('Chapel Bridge')
    expect(read.tours?.[0]?.slug).toBe('pilatus-above-the-city')
    expect(read.stories?.map(story => story.slug)).toEqual(['story-1'])
    expect(read.categories).toEqual([water])
    expect(read.tiles?.map(tile => tile.name)).toEqual(['Trinkwasser'])
    expect(calls.sort()).toEqual(['/api/public/map-categories?lang=de', '/api/public/map?lang=de', '/api/public/stories?lang=de', '/api/public/tours?lang=de'])
  })

  it('gives the map, category and tour reads the standard 15 s of the data client', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    answerWith({ '/api/public/map': json({ items: [] }), '/api/public/map-categories': json({ items: [] }), '/api/public/tours': json({ items: [] }), '/api/public/stories': json({ items: [] }) })
    await loadHomeRead('en')

    expect(timeoutSpy).toHaveBeenCalledTimes(4)
    // The three block reads keep the standard 15 s; the stories read is the shared page read of the stories list.
    expect(timeoutSpy.mock.calls.filter(([ms]) => ms === 15_000)).toHaveLength(3)
  })

  it('sends no request in the demo build and leaves every block empty, so none shows an error', async () => {
    mode.on = false
    const calls = answerWith({})
    const read = await loadHomeRead('en')

    expect(calls).toEqual([])
    expect(read).toEqual({ pins: [], categories: [], tiles: [], tours: [], stories: [] })
  })

  it('turns a failed read into null for that block only (AC-6)', async () => {
    answerWith({ '/api/public/map': json({ items: [mapItem] }) })
    const read = await loadHomeRead('en')

    expect(read.pins).toHaveLength(1)
    expect(read.tours).toBeNull()
    expect(read.stories).toBeNull()
    expect(read.tiles).toBeNull()
    expect(read.categories).toBeNull()
  })

  it('a failed stories read leaves the other blocks as they are', async () => {
    answerWith({ '/api/public/map': json({ items: [mapItem] }), '/api/public/map-categories': json({ items: [water] }), '/api/public/tours': json({ items: [tourCard] }) })
    const read = await loadHomeRead('en')

    expect(read.stories).toBeNull()
    expect(read.pins).toHaveLength(1)
    expect(read.tours).toHaveLength(1)
  })

  it('turns an answer that does not match the contract into null', async () => {
    answerWith({ '/api/public/map': json({ items: [{ nonsense: true }] }), '/api/public/map-categories': json({ items: [water] }), '/api/public/tours': json({ items: [] }) })
    const read = await loadHomeRead('en')

    expect(read.pins).toBeNull()
    expect(read.tiles).toBeNull()
    expect(read.tours).toEqual([])
  })

  it('is the home route loader, with a skeleton page while it runs', () => {
    const options = HomeRoute.options as { loader?: unknown, pendingComponent?: unknown, ssr?: boolean }

    expect(options.ssr).toBe(true)
    expect(options.loader).toBeTypeOf('function')
    expect(options.pendingComponent).toBeTypeOf('function')
  })
})
