import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSearchSources } from '@/features/search/api/search-reads'
import { SearchScreen } from '@/features/search/components/search-screen'
import { isLanguage } from '@/lib/language-routing'
import { noIndexHead } from '@/lib/no-index'

// C24 Search (ADR-001, ruling D1): it renders in the browser only, over lists read client-side, and asks search engines to skip it.
export const Route = createFileRoute('/_guest/$lang/search')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === 'string' && search.q ? { q: search.q } : {},
  component: SearchPage,
})

function SearchPage() {
  const { lang } = Route.useParams()
  const { q = '' } = Route.useSearch()
  const navigate = useNavigate({ from: '/$lang/search' })
  const { sources, failed, isLoading } = useSearchSources(isLanguage(lang) ? lang : 'en')

  return (
    <SearchScreen
      failed={failed}
      isLoading={isLoading}
      sources={sources}
      urlQuery={q}
      onQueryCommit={next => void navigate({ search: { q: next || undefined }, replace: true })}
    />
  )
}
