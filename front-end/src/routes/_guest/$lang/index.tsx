import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '@/features/home/components/home-page'
import { homeHead } from '@/features/home/lib/home-head'
import { isLanguage } from '@/lib/language-routing'

// C01 Guest home: the first day in Lucerne, in one fixed order for every visitor (docs/ux/home-design.md). Server-rendered with its page tags (ADR-001, ADR-002); each block reads for itself.
export const Route = createFileRoute('/_guest/$lang/')({
  ssr: true,
  head: ({ params }) => (isLanguage(params.lang) ? homeHead(params.lang) : {}),
  component: HomePage,
})
