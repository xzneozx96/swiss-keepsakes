/**
 * Lab: guest search (`/$lang/search`) over places, events, stories, tours and keepsakes. S2 "One
 * list", approved by the owner: one ranked list with a type filter, opening on the five fixed
 * interests as tiles. No price anywhere (AC54). A place opens the map with its card (AC90);
 * a tour opens its free information page.
 */
import type { HitKind, SearchHit } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'
import type { Interest, Language } from '@/features/lab/map-guest-data'

import { Button, SearchField, Skeleton, Tag, TagGroup } from '@heroui/react'
import { useDeferredValue, useId, useState } from 'react'

import { BackIcon, ChevronRightIcon, CloseIcon, PickupIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { copy, interestPhotos, INTERESTS, searchHome, searchInterest } from '@/features/lab/home-data'
import { LabAdviceBanner } from '@/features/lab/home-kit'
import { chipChange, ChipCheck, chipClass } from '@/features/lab/map-guest-kit'

const GROUPS: HitKind[] = ['place', 'story', 'tour', 'keepsake']

/** The search screen's frame: back, the field (focused on open), and the content. */
function SearchFrame({ home, language, query, onQuery, children }: {
  home: HomeModel
  language: Language
  query: string
  onQuery: (query: string) => void
  children: React.ReactNode
}) {
  const c = copy[language]

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background pb-[96px]">
      <div className="sticky top-0 z-10 flex items-center gap-1 bg-background/95 px-2 pt-3 pb-2 backdrop-blur">
        <Button isIconOnly aria-label={c.back} className="size-11 min-w-11" variant="ghost" onPress={() => home.setScreen({ kind: 'home' })}>
          <BackIcon size={22} />
        </Button>
        <SearchField
          // Native search screens open with the keyboard up.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label={c.searchLabel}
          className="flex-1"
          value={query}
          onChange={onQuery}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={c.searchPlaceholder} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>
      <div className="flex flex-col gap-5 px-4 pt-1">{children}</div>
    </div>
  )
}

/**
 * Typing is immediate; results follow a deferred copy. An interest tile shows everything with
 * that interest until the visitor types or clears it. The lab can fake a slow answer.
 */
function useSearch(home: HomeModel, language: Language, slow: boolean) {
  const [query, setQuery] = useState('')
  const [interest, setInterest] = useState<Interest>()
  const [pending, setPending] = useState(false)
  const deferred = useDeferredValue(query)
  const trimmed = deferred.trim()
  const hits = interest && !trimmed ? searchInterest(interest, home.items, language) : searchHome(deferred, home.items, language)

  function wait() {
    if (slow) {
      setPending(true)
      setTimeout(setPending, 900, false)
    }
  }

  return {
    query,
    trimmed,
    interest: trimmed ? undefined : interest,
    hits,
    pending: slow && pending,
    onQuery(next: string) {
      setQuery(next)
      setInterest(undefined)
      wait()
    },
    pickInterest(next: Interest | undefined) {
      setInterest(next)
      wait()
    },
  }
}

function HitRow({ hit, language, onOpen }: {
  hit: SearchHit
  language: Language
  onOpen: (href: string) => void
}) {
  const c = copy[language]

  return (
    <button
      className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl py-2 text-start outline-none focus-visible:focus-ring active:bg-default"
      type="button"
      onClick={() => onOpen(hit.href)}
    >
      <Media alt="" className={`size-14 shrink-0 ${hit.kind === 'keepsake' ? 'rounded-xl' : 'rounded-2xl'}`} photo={hit.photo} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-serif text-[17px] leading-[22px] font-medium text-balance" lang={hit.title.lang}>{hit.title.value}</span>
        <span className="text-label text-muted tabular-nums">
          {hit.kind !== 'keepsake' && hit.kind !== 'tour' ? `${c.kind[hit.kind]} · ${hit.meta}` : hit.meta}
        </span>
        {hit.title.fallback && (
          <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">{c.onlyIn[hit.title.lang]}</span>
        )}
      </span>
      {hit.kind === 'place'
        ? <PickupIcon aria-label={c.opensMap} className="shrink-0 text-muted" size={18} />
        : <ChevronRightIcon className="shrink-0 text-muted" size={18} />}
    </button>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return <p className="text-label text-muted" role="status">{children}</p>
}

function Pending({ language }: { language: Language }) {
  return (
    <div aria-busy className="flex flex-col gap-1" role="status">
      <span className="sr-only">{copy[language].searching}</span>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="size-14 shrink-0 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * S2's empty field: the five fixed interests (PRD §3.3) as photo tiles in two columns, each photo
 * showing what its label names. The fifth, Local activities, spans both columns at a lower height
 * so it does not dominate; a photo of an actual event or market would fit better if the owner
 * supplies one. A tile lists everything with that interest.
 */
export function InterestTiles({ language, onPick }: { language: Language, onPick: (interest: Interest) => void }) {
  const c = copy[language]
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 className="text-heading" id={headingId}>{c.interestsTitle}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {INTERESTS.map((interest) => {
          const wide = interest === 'local-activities'

          return (
            <li key={interest} className={wide ? 'col-span-2' : undefined}>
              <button
                className={`group relative flex w-full overflow-hidden rounded-2xl text-start outline-none focus-visible:focus-ring active:scale-[0.98] motion-safe:transition-transform ${wide ? 'h-[112px]' : 'aspect-[4/3]'}`}
                data-photo={interestPhotos[interest]}
                type="button"
                onClick={() => onPick(interest)}
              >
                <Media alt="" className="absolute! inset-0" photo={interestPhotos[interest]} />
                {/* Ramps to 60% black by 60% of the height, so the white label is at least 4.5:1 over the worst pixel of every photo (measured). */}
                <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0)_40%,rgb(0_0_0/0.6)_60%)]" />
                <span className="relative mt-auto p-3 font-serif text-[16px] leading-5 font-medium text-white text-balance">{c.interests[interest]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** No results: say so plainly, suggest names that exist, and offer a way on. */
function NoResults({ language, query, children }: { language: Language, query: string, children: React.ReactNode }) {
  const c = copy[language]

  return (
    <>
      <div className="flex flex-col gap-1 pt-2" role="status">
        <p className="font-serif text-card-title">{c.noResults(query)}</p>
        <p className="text-sm text-muted">{c.noResultsHint}</p>
      </div>
      {children}
    </>
  )
}

/**
 * S2 "One list": one list ordered by how well the title matches, each row naming its kind,
 * with a filter once there are results. The empty field opens on the five interests.
 */
export function SearchMixed({ home, language, slow = false }: { home: HomeModel, language: Language, slow?: boolean }) {
  const c = copy[language]
  const search = useSearch(home, language, slow)
  const [kind, setKind] = useState<'all' | HitKind>('all')
  const kinds = GROUPS.filter(k => search.hits.some(hit => hit.kind === k))
  // A filter the new results have nothing for falls back to All.
  const active = kind !== 'all' && kinds.includes(kind) ? kind : 'all'
  const shown = active === 'all' ? search.hits : search.hits.filter(hit => hit.kind === active)
  const showing = Boolean(search.trimmed || search.interest)

  return (
    <SearchFrame home={home} language={language} query={search.query} onQuery={search.onQuery}>
      {!showing && <InterestTiles language={language} onPick={search.pickInterest} />}
      {search.interest && (
        <div className="flex items-center gap-2">
          <span className="flex h-9 items-center gap-1 rounded-full border-[1.5px] border-accent bg-surface ps-3.5 pe-0.5 text-[13px] font-medium">
            {c.interests[search.interest]}
            <button
              aria-label={c.clearInterest(c.interests[search.interest])}
              className="relative flex size-8 items-center justify-center rounded-full outline-none after:absolute after:-inset-1.5 focus-visible:focus-ring"
              type="button"
              onClick={() => search.pickInterest(undefined)}
            >
              <CloseIcon size={16} />
            </button>
          </span>
        </div>
      )}
      {search.pending && <Pending language={language} />}
      {search.trimmed && !search.pending && search.hits.length === 0 && (
        <NoResults language={language} query={search.trimmed}>
          <InterestTiles language={language} onPick={search.pickInterest} />
          <LabAdviceBanner home={home} language={language} />
        </NoResults>
      )}
      {showing && !search.pending && search.hits.length > 0 && (
        <>
          {kinds.length > 1 && (
            <TagGroup
              disallowEmptySelection
              aria-label={c.filterLabel}
              selectedKeys={new Set([active])}
              selectionMode="single"
              onSelectionChange={chipChange(id => setKind(id as 'all' | HitKind))}
            >
              <TagGroup.List className="-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none]">
                {(['all', ...kinds] as const).map((id) => {
                  const n = id === 'all' ? search.hits.length : search.hits.filter(hit => hit.kind === id).length
                  const label = id === 'all' ? c.filterAll : c.groups[id]

                  return (
                    <Tag key={id} className={chipClass} id={id} textValue={`${label} ${n}`}>
                      {label}
                      <span className="text-muted tabular-nums">{n}</span>
                      <ChipCheck />
                    </Tag>
                  )
                })}
              </TagGroup.List>
            </TagGroup>
          )}
          <Status>
            {search.interest
              ? c.interestCount(shown.length, c.interests[search.interest])
              : c.resultCount(shown.length, search.trimmed)}
          </Status>
          <ul aria-label={c.searchLabel} className="-mt-3 flex flex-col divide-y divide-separator">
            {shown.map(hit => (
              <li key={hit.id}>
                <HitRow hit={hit} language={language} onOpen={home.open} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SearchFrame>
  )
}
