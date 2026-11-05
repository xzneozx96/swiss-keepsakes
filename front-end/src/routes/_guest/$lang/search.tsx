import type { SearchKind } from '@sk/api-contract'
import type { InterestCode } from '@/features/search/components/interest-codes'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SEARCH_QUERY_MAX } from '@/features/search/api/search-reads'
import { INTEREST_TILES } from '@/features/search/components/interest-codes'
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
    const interest: InterestCode | undefined = INTEREST_TILES.find(tile => tile.code === search.interest)?.code
    // A longer link is cut, so it never asks the API for more than it takes (a 400).
    const q = typeof search.q === 'string' ? search.q.slice(0, SEARCH_QUERY_MAX) : ''

    return { ...(q ? { q } : {}), ...(kind ? { kind } : {}), ...(interest ? { interest } : {}) }
  },
  component: SearchPage,
})

function SearchPage() {
  const { lang } = Route.useParams()
  const { q = '', kind, interest } = Route.useSearch()
  const navigate = useNavigate({ from: '/$lang/search' })

  return (
    <SearchScreen
      lang={isLanguage(lang) ? lang : 'en'}
      urlInterest={interest}
      urlKind={kind}
      urlQuery={q}
      // A new text starts a new search, so it drops the kind and the tile of the last one.
      onInterestChange={next => void navigate({ search: next ? { interest: next } : {}, replace: true })}
      onKindChange={next => void navigate({ search: prev => ({ ...prev, kind: next }), replace: true })}
      onQueryCommit={next => void navigate({ search: { q: next || undefined }, replace: true })}
    />
  )
}
