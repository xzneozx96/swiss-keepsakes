import type { MediaSearch } from '@/features/media/lib/search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SectionFrame } from '@/components/layout/section-frame'
import { useLocale } from '@/contexts/locale-context'
import { MediaScreen } from '@/features/media/components/media-screen'
import { parseMediaSearch } from '@/features/media/lib/search-params'

// Content › Media (N18): the library of photos, recordings and tour PDFs. Client-rendered (ADR-001).
export const Route = createFileRoute('/store/content/media')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): MediaSearch => parseMediaSearch(search),
  component: Page,
})

function Page() {
  const { t } = useLocale()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/store/content/media' })

  return (
    <SectionFrame hasOwnTitle page="media" section="content" title={t('nav.content')}>
      <MediaScreen
        search={search}
        onSearch={patch => void navigate({ search: previous => ({ ...previous, ...patch }), replace: true, resetScroll: false })}
      />
    </SectionFrame>
  )
}
