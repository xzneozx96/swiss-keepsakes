import type { PublishedPages } from '../lib/sitemap'
import { buildSitemapEntries, robotsTxt, sitemapXml } from '../lib/sitemap'

interface SeoConfig { siteUrl: string, indexable: boolean }

const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=240'

/** The sitemap lists published pages, so a failed read is a 503 that crawlers retry, never an empty or stale-looking file. */
export async function sitemapResponse(config: SeoConfig, load: () => Promise<PublishedPages>): Promise<Response> {
  try {
    const body = sitemapXml(buildSitemapEntries(await load()), config.siteUrl)

    return new Response(body, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': PUBLIC_CACHE },
    })
  }
  catch (error) {
    if (!(error instanceof Error) || error.name !== 'PublicPagesUnavailable')
      console.error('sitemap.xml failed', error)

    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '60', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' },
    })
  }
}

/** Never reads the API, so it stays up while the sitemap is unavailable. */
export function robotsResponse(config: SeoConfig): Response {
  return new Response(robotsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': PUBLIC_CACHE },
  })
}
