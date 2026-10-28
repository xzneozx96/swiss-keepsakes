import { describe, expect, it, vi } from 'vitest'
import { PublicPagesUnavailable } from '@/features/seo/api/public-pages.server'
import { robotsResponse, sitemapResponse } from '@/features/seo/api/responses.server'
import { isPrivatePath } from '@/lib/private-routes'

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
    ['unset', { siteUrl: 'http://localhost:3002', indexable: false }],
  ])('[E3.6][AC61] %s disallows everything with no Sitemap line', async (_name, config) => {
    const response = robotsResponse(config)
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(body).toContain('Disallow: /')
    expect(body).not.toContain('Sitemap')
  })

  it('[E3.6][AC61] stays 200 while the page source fails', async () => {
    const failing = await sitemapResponse(production, async () => {
      throw new PublicPagesUnavailable('down')
    })

    expect(failing.status).toBe(503)
    expect(robotsResponse(production).status).toBe(200)
  })
})

describe('crawler files stay public', () => {
  it('[E3.6][AC61] are not private paths', () => {
    expect(isPrivatePath('/sitemap.xml')).toBe(false)
    expect(isPrivatePath('/robots.txt')).toBe(false)
  })
})
