import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicPagesUnavailable } from '@/features/seo/api/public-pages.server'
import { robotsResponse, sitemapResponse } from '@/features/seo/api/responses.server'
import { readSiteConfig, withSeoHeaders } from '@/features/seo/lib/site-config'
import { isPrivatePath } from '@/lib/private-routes'
import { Route as RobotsRoute } from '@/routes/robots[.]txt'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const pages = {
  stories: { en: [{ id: 'a', slug: 'alpine', language: 'en' as const, fallback: false }], de: [] },
  tours: { en: [], de: [] },
}
const production = { siteUrl: 'https://example.test', indexable: true }
const staging = { siteUrl: 'https://staging.example.test', indexable: false }
const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=240'

describe('sitemap.xml response', () => {
  it('[E3.6][AC61] answers 200 with XML and the public cache header', async () => {
    const response = await sitemapResponse(production, async () => pages)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE)
    const body = await response.text()
    expect(body).toContain('<loc>https://example.test/en/stories/alpine</loc>')
  })

  it('[E3.6][AC61] answers 503 with Retry-After and no-store when the pages are unavailable', async () => {
    const response = await sitemapResponse(production, async () => {
      throw new PublicPagesUnavailable('down')
    })

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toBe('Sitemap temporarily unavailable')
  })

  it('[E3.6][AC61] answers 503 for an unexpected error and logs it', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await sitemapResponse(production, async () => {
      throw new Error('boom')
    })

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('robots.txt response', () => {
  it('[E3.6][AC61] production allows crawling and lists the sitemap', async () => {
    const response = robotsResponse(production)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE)
    const body = await response.text()
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  it.each([
    ['staging', staging],
    ['unset', readSiteConfig({})],
  ])('[E3.6][AC61] %s disallows everything with no Sitemap line', async (_name, config) => {
    const response = robotsResponse(config)
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(body).toContain('Disallow: /')
    expect(body).not.toContain('Sitemap')
  })

  it('[E3.6][AC61] stays 200 while the page source fails, and never calls the API', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new TypeError('API down')))
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubEnv('VITE_SITE_ENV', 'production')
    vi.stubEnv('VITE_SITE_URL', 'https://example.test')
    const handler = (RobotsRoute.options as { server: { handlers: { GET: () => Response } } }).server.handlers.GET
    const response = handler()

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Sitemap: https://example.test/sitemap.xml')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('production switch through the real site config', () => {
  const next = async () => ({ response: new Response('ok') })

  it('[E3.6][AC61] VITE_SITE_ENV=production: pages are indexable and robots lists the sitemap', async () => {
    vi.stubEnv('VITE_SITE_ENV', 'production')
    vi.stubEnv('VITE_SITE_URL', 'https://example.test')
    const { response } = await withSeoHeaders('/en', readSiteConfig().indexable, next)

    expect(response.headers.has('X-Robots-Tag')).toBe(false)
    expect(await robotsResponse(readSiteConfig()).text()).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  it('[E3.6][AC61] env unset: pages get noindex and robots has no Sitemap line', async () => {
    vi.stubEnv('VITE_SITE_ENV', '')
    vi.stubEnv('VITE_SITE_URL', '')
    const { response } = await withSeoHeaders('/en', readSiteConfig().indexable, next)

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(await robotsResponse(readSiteConfig()).text()).not.toContain('Sitemap')
  })
})

describe('crawler files stay public', () => {
  it('[E3.6][AC61] are not private paths', () => {
    expect(isPrivatePath('/sitemap.xml')).toBe(false)
    expect(isPrivatePath('/robots.txt')).toBe(false)
  })
})
