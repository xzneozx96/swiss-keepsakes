import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPublishedPages, PublicPagesUnavailable, resetPublishedPagesCache } from '@/features/seo/api/public-pages.server'

type Lang = 'en' | 'de'

function card(slug: string, language: Lang, fallback = false) {
  return { id: crypto.randomUUID(), slug, title: slug, language, fallback }
}

interface Stub { stories: Record<Lang, unknown[]>, tours: Record<Lang, unknown[]> }

let data: Stub
let urls: string[]
let override: ((url: URL) => Response | Promise<Response> | undefined) | undefined

function installFetch() {
  vi.stubGlobal('fetch', async (input: Request | string) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    urls.push(url.toString())
    const custom = override?.(url)
    if (custom)
      return custom
    const kind = url.pathname.endsWith('/stories') ? 'stories' : 'tours'
    const lang = url.searchParams.get('lang') as Lang
    return Response.json({ items: data[kind][lang] })
  })
}

beforeEach(() => {
  resetPublishedPagesCache()
  urls = []
  override = undefined
  data = { stories: { en: [card('x', 'en')], de: [] }, tours: { en: [], de: [card('t', 'de')] } }
  installFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('[E3.6][AC61] published pages reader', () => {
  it('reads the four lists and keeps the cards of the asked language', async () => {
    const pages = await loadPublishedPages()
    expect(urls).toHaveLength(4)
    expect(pages.stories.en.map(c => c.slug)).toEqual(['x'])
    expect(pages.tours.de.map(c => c.slug)).toEqual(['t'])
    expect(pages.stories.de).toEqual([])
  })

  it('caches for 60 s, then reads again (AC-4)', async () => {
    let t = 1_000_000
    const now = () => t
    const first = await loadPublishedPages(now)
    expect(first.stories.en.map(c => c.slug)).toEqual(['x'])

    data.stories.en = [card('x', 'en'), card('y', 'en')]
    t += 59_000
    const cached = await loadPublishedPages(now)
    expect(cached.stories.en.map(c => c.slug)).toEqual(['x'])
    expect(urls).toHaveLength(4)

    t += 2_000
    const fresh = await loadPublishedPages(now)
    expect(fresh.stories.en.map(c => c.slug)).toEqual(['x', 'y'])
    expect(urls).toHaveLength(8)
  })

  it('drops fallback items and items in another language', async () => {
    data.stories.de = [card('only-en', 'en', true), card('wrong', 'en'), card('ok', 'de')]
    const pages = await loadPublishedPages()
    expect(pages.stories.de.map(c => c.slug)).toEqual(['ok'])
  })

  it('throws PublicPagesUnavailable on a 500 from one of the four reads (AC-6)', async () => {
    override = url => (url.pathname.endsWith('/tours') && url.searchParams.get('lang') === 'de')
      ? new Response('boom', { status: 500 })
      : undefined
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
  })

  it('throws PublicPagesUnavailable when fetch rejects (AC-6)', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('network down')))
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
  })

  it('throws PublicPagesUnavailable on a 200 body whose items lack slug (AC-6)', async () => {
    override = () => Response.json({ items: [{ id: crypto.randomUUID(), language: 'en', fallback: false }] })
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
  })

  it('does not cache a failure, the next call reads again (AC-6)', async () => {
    override = () => new Response('boom', { status: 503 })
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
    const failedReads = urls.length

    override = undefined
    const pages = await loadPublishedPages()
    expect(urls.length).toBeGreaterThan(failedReads)
    expect(pages.stories.en.map(c => c.slug)).toEqual(['x'])
  })

  it('uses API_ORIGIN, then API_PROXY_TARGET, then the local default', async () => {
    vi.stubEnv('API_ORIGIN', 'http://origin.test')
    vi.stubEnv('API_PROXY_TARGET', 'http://proxy.test')
    await loadPublishedPages()
    expect(urls.every(u => u.startsWith('http://origin.test/api/public/'))).toBe(true)

    resetPublishedPagesCache()
    urls = []
    vi.stubEnv('API_ORIGIN', undefined)
    await loadPublishedPages()
    expect(urls.every(u => u.startsWith('http://proxy.test/api/public/'))).toBe(true)

    resetPublishedPagesCache()
    urls = []
    vi.stubEnv('API_PROXY_TARGET', undefined)
    await loadPublishedPages()
    expect(urls.every(u => u.startsWith('http://127.0.0.1:5002/api/public/'))).toBe(true)
  })
})
