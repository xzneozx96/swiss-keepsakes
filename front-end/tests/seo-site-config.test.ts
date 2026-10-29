import { describe, expect, it } from 'vitest'

import { readSiteConfig, seoHeaders, withSeoHeaders } from '@/features/seo/lib/site-config'

describe('[E3.6][AC61] site config', () => {
  it('is indexable only when VITE_SITE_ENV is exactly production', () => {
    expect(readSiteConfig({ VITE_SITE_ENV: 'production' }).indexable).toBe(true)

    for (const value of ['staging', '', undefined, 'Production'])
      expect(readSiteConfig({ VITE_SITE_ENV: value }).indexable).toBe(false)
  })

  it('defaults the site url and strips trailing slashes', () => {
    expect(readSiteConfig({}).siteUrl).toBe('http://localhost:3002')
    expect(readSiteConfig({ VITE_SITE_URL: '' }).siteUrl).toBe('http://localhost:3002')
    expect(readSiteConfig({ VITE_SITE_URL: 'https://example.ch//' }).siteUrl).toBe('https://example.ch')
  })

  it('sends noindex outside production, except on robots.txt and sitemap.xml', () => {
    expect(seoHeaders('/en', false)).toEqual({ 'X-Robots-Tag': 'noindex' })
    expect(seoHeaders('/robots.txt', false)).toEqual({})
    expect(seoHeaders('/Sitemap.xml', false)).toEqual({})
    expect(seoHeaders('/en', true)).toEqual({})
  })

  it('sets the header on the response next yields', async () => {
    const result = await withSeoHeaders('/en', false, async () => ({ response: new Response('ok') }))
    expect(result.response.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('leaves an X-Robots-Tag set earlier intact', async () => {
    const response = new Response('ok', { headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
    const result = await withSeoHeaders('/en', false, () => ({ response }))
    expect(result.response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('sets nothing in production', async () => {
    const result = await withSeoHeaders('/en', true, () => ({ response: new Response('ok') }))
    expect(result.response.headers.has('X-Robots-Tag')).toBe(false)
  })

  it('lets a thrown Response pass untouched', async () => {
    const thrown = new Response('no', { status: 404 })
    const caught = await withSeoHeaders('/en', false, () => Promise.reject(thrown)).catch((error: unknown) => error)
    expect(caught).toBe(thrown)
    expect(thrown.headers.has('X-Robots-Tag')).toBe(false)
  })
})
