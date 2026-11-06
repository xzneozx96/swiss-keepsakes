import type { PublicLanguage } from '@sk/api-contract'
import type { InterestCode } from './interest-codes'
import type { SearchKind } from '@/features/search/lib/search'

import { Button, SearchField } from '@heroui/react'
import { useRouter } from '@tanstack/react-router'

import { ChipRow } from '@/components/chip-row'
import { EmptyState } from '@/components/empty-state'
import { CloseIcon, SearchIcon } from '@/components/icons'
import { InfiniteList } from '@/components/infinite-list'
import { BackButton } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import { SEARCH_QUERY_MAX, useSearchPages } from '@/features/search/api/search-reads'
import { kindFilter, toResult } from '@/features/search/lib/search'
import { useUrlInput } from '@/hooks/use-url-input'
import { InterestTiles } from './interest-tiles'
import { SearchRow, SearchRowsSkeleton } from './search-row'

/** The chosen interest as a chip; its clear button has a 44 px hit area. */
function InterestChip({ interest, onClear }: { interest: InterestCode, onClear: () => void }) {
  const { t } = useLocale()
  const name = t(`searchScreen.interest.${interest}`)

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 items-center gap-1 rounded-full border-[1.5px] border-accent bg-surface ps-3.5 pe-0.5 text-[13px] font-medium">
        {name}
        <button
          aria-label={t('searchScreen.clearInterest', { interest: name })}
          className="relative flex size-8 items-center justify-center rounded-full outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:focus-ring"
          type="button"
          onClick={onClear}
        >
          <CloseIcon aria-hidden size={16} />
        </button>
      </span>
    </div>
  )
}

/** All plus each kind present, each with its count. The parent shows it only when `kindFilter` has more than one kind. */
function KindFilter({ items, active, onChange }: {
  items: NonNullable<ReturnType<typeof kindFilter>>
  active: 'all' | SearchKind
  onChange: (kind: 'all' | SearchKind) => void
}) {
  const { t } = useLocale()
  const chips = items.map(item => ({
    id: item.kind,
    label: item.kind === 'all' ? t('searchScreen.filterAll') : t(`searchScreen.group.${item.kind}`),
    count: item.count,
  }))

  return <ChipRow items={chips} label={t('searchScreen.filterLabel')} selected={active} onChange={kind => onChange(kind as 'all' | SearchKind)} />
}

/**
 * C24 Search, "One list" (docs/ux/search-design.md). The server matches and ranks (ADR-033, slice 6): the field's text goes to
 * `GET /api/public/search` once the typing pauses, ten hits a page with infinite scroll. The text and the kind are in the address
 * (`?q=`, `?kind=`) and in the query key, so Back and a shared link reproduce the view and a change starts again at page 1. A tapped
 * interest tile is sent as `interest`; the saved onboarding answers never are (ADR-006).
 */
export function SearchScreen({ lang, urlQuery, urlKind, urlInterest, onQueryCommit, onKindChange, onInterestChange }: {
  lang: PublicLanguage
  urlQuery: string
  urlKind: SearchKind | undefined
  /** The tapped tile, from the address so Back and a shared link keep it. */
  urlInterest: InterestCode | undefined
  onQueryCommit: (query: string) => void
  onKindChange: (kind: SearchKind | undefined) => void
  onInterestChange: (interest: InterestCode | undefined) => void
}) {
  const { t, intlLocale } = useLocale()
  const router = useRouter()
  const { value, setValue } = useUrlInput(urlQuery, onQueryCommit)
  // The URL follows the field after a pause (useUrlInput), so this is the debounced text: no request per keystroke.
  const query = urlQuery.trim()
  const interest = query ? undefined : urlInterest
  const showing = Boolean(query || interest)
  const search = useSearchPages(lang, { q: query, interest, kind: urlKind })
  const pages = search.data?.pages
  const last = pages?.at(-1)
  // A hit that moved onto a later page while the guest scrolled shows once.
  const results = [...new Map((pages?.flatMap(page => page.items) ?? []).flatMap((item) => {
    const row = toResult(item)
    return row ? [[row.key, row] as const] : []
  })).values()]
  const total = last?.total ?? 0
  const filter = last ? kindFilter(last.counts) : null
  const isOne = (count: number) => new Intl.PluralRules(intlLocale).select(count) === 'one'
  const failed = showing && search.isError && !pages
  const noMatch = showing && !search.isLoading && !failed && Boolean(pages) && total === 0
  const hasResults = showing && results.length > 0
  const countLine = !showing || !last || total === 0
    ? ''
    : interest
      ? t(isOne(total) ? 'searchScreen.interestCount.one' : 'searchScreen.interestCount.other', { count: total, interest: t(`searchScreen.interest.${interest}`) })
      : t(isOne(total) ? 'searchScreen.resultCount.one' : 'searchScreen.resultCount.other', { count: total, query })
  const pick = (next: InterestCode) => onInterestChange(next)

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 backdrop-blur-xl">
        <BackButton label={t('searchScreen.back')} onPress={() => router.history.back()} />
        <SearchField
          // Native search screens open with the keyboard up.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label={t('searchScreen.label')}
          className="flex-1"
          value={value}
          onChange={(next) => {
            setValue(next)
            // Typing replaces a tapped tile (the address drops it when the text commits).
            if (urlInterest)
              onInterestChange(undefined)
          }}
        >
          {/* The group clips its content; the clear button's 44 px hit area reaches past the 36 px field, so it must not. */}
          <SearchField.Group className="overflow-visible">
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" maxLength={SEARCH_QUERY_MAX} placeholder={t('searchScreen.placeholder')} />
            <SearchField.ClearButton className="relative after:absolute after:-inset-3 after:content-['']" />
          </SearchField.Group>
        </SearchField>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-2 pb-4">
        {!showing && <InterestTiles onPick={pick} />}
        {interest && <InterestChip interest={interest} onClear={() => onInterestChange(undefined)} />}
        {showing && search.isLoading && <SearchRowsSkeleton label={t('searchScreen.searching')} />}
        {failed && (
          <div className="flex flex-col items-start gap-2" role="alert">
            <p className="text-label text-danger">{t('searchScreen.error')}</p>
            <Button size="sm" variant="secondary" onPress={() => void search.refetch()}>{t('routeError.retry')}</Button>
          </div>
        )}
        {/* One live region, always mounted, so a screen reader announces its text change (the count, or the no-match line). */}
        <div role="status">
          {/* The shared empty state (owner, 06.11.2026), its one action clears the field so the interest tiles come back. */}
          {noMatch && <EmptyState action={{ label: t('searchScreen.clear'), onPress: () => setValue('') }} icon={SearchIcon} message={t('searchScreen.noResults', { query })} />}
          {countLine && <p className="text-label text-muted">{countLine}</p>}
        </div>
        {noMatch && (
          <>
            <InterestTiles onPick={pick} />
            <AdviceBanner
              action={t('home.advice.action')}
              body={t('home.advice.body')}
              captions={[t('home.advice.caption1'), t('home.advice.caption2'), t('home.advice.caption3')]}
              title={t('home.advice.title')}
            />
          </>
        )}
        {showing && filter && <KindFilter active={urlKind ?? 'all'} items={filter} onChange={kind => onKindChange(kind === 'all' ? undefined : kind)} />}
        {hasResults && (
          <InfiniteList
            announce={added => t(isOne(added) ? 'searchScreen.more.one' : 'searchScreen.more.other', { count: added })}
            count={results.length}
            hasMore={search.hasNextPage}
            isFailed={search.isFetchNextPageError}
            isLoading={search.isFetchingNextPage}
            onLoadMore={() => void search.fetchNextPage()}
          >
            <ul aria-label={t('searchScreen.results')} className="-mt-3 flex flex-col divide-y divide-separator">
              {results.map(result => (
                <li key={result.key}>
                  <SearchRow result={result} />
                </li>
              ))}
            </ul>
          </InfiniteList>
        )}
      </div>
    </div>
  )
}
