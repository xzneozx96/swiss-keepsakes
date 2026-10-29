import { createFileRoute } from '@tanstack/react-router'

import { robotsResponse } from '@/features/seo/api/responses.server'
import { readSiteConfig } from '@/features/seo/lib/site-config'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => robotsResponse(readSiteConfig()),
    },
  },
})
