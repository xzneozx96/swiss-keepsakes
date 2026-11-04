import { createFileRoute } from '@tanstack/react-router'

import { loadHomeRead } from '@/features/home/api/home-reads'
import { HomePage } from '@/features/home/components/home-page'
import { homeHead } from '@/features/home/lib/home-head'
import { isLanguage } from '@/lib/language-routing'

// C01 Guest home: the first day in Lucerne, in one fixed order for every visitor (docs/ux/home-design.md). Server-rendered with its page tags (ADR-001, ADR-002). The loader reads the postcards and the routes; a failed read is data, so its block shows its own error and the rest of the page stays.
export const Route = createFileRoute('/_guest/$lang/')({
  ssr: true,
  loader: ({ params }) => loadHomeRead(isLanguage(params.lang) ? params.lang : 'en'),
  head: ({ params }) => (isLanguage(params.lang) ? homeHead(params.lang) : {}),
  pendingComponent: () => <HomePage />,
  component: Page,
})

function Page() {
  return <HomePage read={Route.useLoaderData()} />
}
