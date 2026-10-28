import { createFileRoute } from '@tanstack/react-router'

import { sitemapResponse } from '@/features/seo/api/responses.server'
import { readSiteConfig } from '@/features/seo/lib/site-config'

// Imported inside the handler (rule 11): a module-level import puts the contract's zod schemas in the server entry, where Nitro bundles zod/v3.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => sitemapResponse(readSiteConfig(), () => import('@/features/seo/api/public-pages.server').then(module => module.loadPublishedPages())),
    },
  },
})
