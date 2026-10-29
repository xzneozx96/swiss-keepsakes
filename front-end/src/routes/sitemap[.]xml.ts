import { createFileRoute } from '@tanstack/react-router'

import { loadPublishedPages } from '@/features/seo/api/public-pages.server'
import { sitemapResponse } from '@/features/seo/api/responses.server'
import { readSiteConfig } from '@/features/seo/lib/site-config'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => sitemapResponse(readSiteConfig(), () => loadPublishedPages()),
    },
  },
})
