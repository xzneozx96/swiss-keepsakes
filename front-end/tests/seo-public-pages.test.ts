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
  it('reads the four lists and puts each in its own slot', async () => {
    data = {
      stories: { en: [card('stories-en', 'en')], de: [card('stories-de', 'de')] },
      tours: { en: [card('tours-en', 'en')], de: [card('tours-de', 'de')] },
    }
    const pages = await loadPublishedPages()
    expect(urls).toHaveLength(4)
    expect(pages.stories.en.map(c => c.slug)).toEqual(['stories-en'])
    expect(pages.stories.de.map(c => c.slug)).toEqual(['stories-de'])
    expect(pages.tours.en.map(c => c.slug)).toEqual(['tours-en'])
    expect(pages.tours.de.map(c => c.slug)).toEqual(['tours-de'])
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

  it('throws on a 500 that carries a valid body (the ok-check, not the parse, rejects it)', async () => {
    override = () => Response.json({ items: [card('x', 'en')] }, { status: 500 })
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
  })

  it('fails when one read of four fails, then a retry works', async () => {
    let failOnce = true
    override = (url) => {
      if (failOnce && url.pathname.endsWith('/tours') && url.searchParams.get('lang') === 'de') {
        failOnce = false
        return new Response('boom', { status: 500 })
      }
    }
    await expect(loadPublishedPages()).rejects.toBeInstanceOf(PublicPagesUnavailable)
    const pages = await loadPublishedPages()
    expect(pages.tours.de.map(c => c.slug)).toEqual(['t'])
  })

  it('shares one load between concurrent callers (4 reads, not 4 per caller)', async () => {
    const [a, b] = await Promise.all([loadPublishedPages(), loadPublishedPages()])
    expect(urls).toHaveLength(4)
    expect(a).toBe(b)
  })

  it('shares a failing load, then reads again on the next call', async () => {
    override = () => new Response('boom', { status: 503 })
    const results = await Promise.allSettled([loadPublishedPages(), loadPublishedPages()])
    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected'])
    expect(urls).toHaveLength(4)

    override = undefined
    await loadPublishedPages()
    expect(urls).toHaveLength(8)
  })

  it('aborts a read that never replies after 5 s (the timeout reaches fetch)', async () => {
    // Fake timers do not drive AbortSignal.timeout, so the 5 s signal is swapped for one the test fires.
    const timeout = new AbortController()
    const spy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal)
    vi.stubGlobal('fetch', (input: Request) => new Promise<Response>((_resolve, reject) => {
      input.signal.addEventListener('abort', () => reject(input.signal.reason))
    }))
    const outcome = loadPublishedPages().then(() => 'resolved', (error: unknown) => error)

    await Promise.resolve()
    expect(spy).toHaveBeenCalledWith(5000)
    timeout.abort(new DOMException('timed out', 'TimeoutError'))
    expect(await outcome).toBeInstanceOf(PublicPagesUnavailable)
    spy.mockRestore()
  })

  it('falls through an empty API_ORIGIN and API_PROXY_TARGET', async () => {
    vi.stubEnv('API_ORIGIN', '')
    vi.stubEnv('API_PROXY_TARGET', 'http://proxy.test')
    await loadPublishedPages()
    expect(urls.every(u => u.startsWith('http://proxy.test/api/public/'))).toBe(true)

    resetPublishedPagesCache()
    urls = []
    vi.stubEnv('API_PROXY_TARGET', '')
    await loadPublishedPages()
    expect(urls.every(u => u.startsWith('http://127.0.0.1:5002/api/public/'))).toBe(true)
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
