import type { SearchKind } from '@sk/api-contract'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SearchScreen } from '@/features/search/components/search-screen'
import { isLanguage } from '@/lib/language-routing'
import { noIndexHead } from '@/lib/no-index'

// The kinds the API knows (the contract package carries Zod, so a route does not import it).
const KINDS: readonly SearchKind[] = ['place', 'story', 'tour', 'keepsake']

// C24 Search (ADR-001, ruling D1): it renders in the browser only and asks search engines to skip it. The server does the matching
// (ADR-033, slice 6); the text and the kind live in the address.
export const Route = createFileRoute('/_guest/$lang/search')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>) => {
    const kind = KINDS.find(k => k === search.kind)

    return { ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}), ...(kind ? { kind } : {}) }
  },
  component: SearchPage,
})

function SearchPage() {
  const { lang } = Route.useParams()
  const { q = '', kind } = Route.useSearch()
  const navigate = useNavigate({ from: '/$lang/search' })

  return (
    <SearchScreen
      lang={isLanguage(lang) ? lang : 'en'}
      urlKind={kind}
      urlQuery={q}
      // A new text starts a new search, so it drops the kind of the last one.
      onKindChange={next => void navigate({ search: prev => ({ ...prev, kind: next }), replace: true })}
      onQueryCommit={next => void navigate({ search: { q: next || undefined }, replace: true })}
    />
  )
}
