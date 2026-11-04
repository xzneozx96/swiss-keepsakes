import type { Key } from 'react'
import type { InterestCode } from './interest-codes'
import type { SearchKind, SearchSources } from '@/features/search/lib/search'

import { SearchField, Tag, TagGroup } from '@heroui/react'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { CloseIcon } from '@/components/icons'
import { BackButton } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import { interestResults, kindFilter, searchAll, suggestNames } from '@/features/search/lib/search'
import { useUrlInput } from '@/hooks/use-url-input'
import { InterestTiles } from './interest-tiles'
import { SearchRow, SearchRowsSkeleton } from './search-row'

const KINDS: readonly SearchKind[] = ['place', 'story', 'tour', 'keepsake']

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

  function change(keys: 'all' | Set<Key>) {
    const [first] = keys === 'all' ? [] : [...keys]

    if (first !== undefined)
      onChange(first as 'all' | SearchKind)
  }

  return (
    <TagGroup
      disallowEmptySelection
      aria-label={t('searchScreen.filterLabel')}
      selectedKeys={new Set([active])}
      selectionMode="single"
      size="lg"
      onSelectionChange={change}
    >
      <TagGroup.List className="flex-nowrap overflow-x-auto py-1 [scrollbar-width:none]">
        {items.map((item) => {
          const label = item.kind === 'all' ? t('searchScreen.filterAll') : t(`searchScreen.group.${item.kind}`)

          return (
            <Tag key={item.kind} id={item.kind} textValue={`${label} ${item.count}`}>
              <span className="flex min-h-11 items-center gap-1 whitespace-nowrap">
                {label}
                <span className="text-muted tabular-nums">{item.count}</span>
              </span>
            </Tag>
          )
        })}
      </TagGroup.List>
    </TagGroup>
  )
}

/**
 * C24 Search, "One list" (docs/ux/search-design.md). The lists come in as props: the route reads them from the API and this
 * screen only matches (T-E4.14a), so tests pass fake lists. `failed` names the kinds whose read failed; the rest still show.
 * `urlQuery` and `onQueryCommit` bind the field to `?q=`.
 */
export function SearchScreen({ sources, failed, isLoading, urlQuery, onQueryCommit }: {
  sources: SearchSources
  failed: readonly SearchKind[]
  isLoading: boolean
  urlQuery: string
  onQueryCommit: (query: string) => void
}) {
  const { t } = useLocale()
  const router = useRouter()
  const { value, setValue, deferred } = useUrlInput(urlQuery, onQueryCommit)
  const [chosen, setChosen] = useState<InterestCode>()
  const [kind, setKind] = useState<'all' | SearchKind>('all')
  const query = deferred.trim()
  const interest = query ? undefined : chosen
  const showing = Boolean(query || interest)
  const results = interest ? interestResults(sources, interest) : searchAll(sources, query)
  const filter = kindFilter(results)
  // A filter the new results have nothing for falls back to All.
  const active = filter?.some(item => item.kind === kind) ? kind : 'all'
  const shown = active === 'all' ? results : results.filter(r => r.kind === active)
  const missing = KINDS.filter(k => failed.includes(k)).map(k => t(`searchScreen.group.${k}`)).join(', ')
  const noMatch = showing && !isLoading && results.length === 0

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
            setChosen(undefined)
          }}
        >
          {/* The group clips its content; the clear button's 44 px hit area reaches past the 36 px field, so it must not. */}
          <SearchField.Group className="overflow-visible">
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={t('searchScreen.placeholder')} />
            <SearchField.ClearButton className="relative after:absolute after:-inset-3 after:content-['']" />
          </SearchField.Group>
        </SearchField>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-2 pb-4">
        {!showing && <InterestTiles onPick={setChosen} />}
        {interest && <InterestChip interest={interest} onClear={() => setChosen(undefined)} />}
        {showing && failed.length > 0 && <p className="text-label text-muted">{t('searchScreen.failed', { kinds: missing })}</p>}
        {showing && isLoading && <SearchRowsSkeleton label={t('searchScreen.searching')} />}
        {noMatch && (
          <>
            <div className="flex flex-col gap-1 pt-2" role="status">
              <p className="font-serif text-card-title">{t('searchScreen.noResults', { query })}</p>
              <p className="text-sm text-muted">{t('searchScreen.noResultsHint', { names: suggestNames(sources).join(', ') })}</p>
            </div>
            <InterestTiles onPick={setChosen} />
            <AdviceBanner
              action={t('home.advice.action')}
              body={t('home.advice.body')}
              captions={[t('home.advice.caption1'), t('home.advice.caption2'), t('home.advice.caption3')]}
              title={t('home.advice.title')}
            />
          </>
        )}
        {showing && !isLoading && results.length > 0 && (
          <>
            {filter && <KindFilter active={active} items={filter} onChange={setKind} />}
            <p className="text-label text-muted" role="status">
              {interest
                ? t(shown.length === 1 ? 'searchScreen.interestCount.one' : 'searchScreen.interestCount.other', { count: shown.length, interest: t(`searchScreen.interest.${interest}`) })
                : t(shown.length === 1 ? 'searchScreen.resultCount.one' : 'searchScreen.resultCount.other', { count: shown.length, query })}
            </p>
            <ul aria-label={t('searchScreen.results')} className="-mt-3 flex flex-col divide-y divide-separator">
              {shown.map(result => (
                <li key={result.key}>
                  <SearchRow result={result} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
