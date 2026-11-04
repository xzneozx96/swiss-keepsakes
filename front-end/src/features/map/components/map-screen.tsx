import type { PublicMapItem } from '@sk/api-contract'

import type { MapSearch } from '@/features/map/lib/search-params'

import { Button } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { BulletListIcon, CloseIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { MapControls } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'
import { mapQueries, useMapData } from '@/features/map/api/queries'
import { categoryName, isLit, keepFiltered, pinCategoryNames, pinIcon } from '@/features/map/lib/categories'
import { CARD_ROW_BOTTOM, CARD_ROW_HEIGHT, CONTROLS, MAP_BOTTOM_CLEAR } from '@/features/map/lib/layout'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { filterAddress, resolveMapFilter } from '@/features/map/lib/search-params'
import { track, useTrackAllowed } from '@/lib/analytics/track'
import { apiEnabled } from '@/lib/api-mode'
import { CategoriesSheet } from './categories-sheet'
import { MapControlsSkeleton } from './map-skeleton'
import { PinList } from './pin-list'
import { PlaceCardRow } from './place-card'
import { PlaceSheet } from './place-sheet'

type View = 'map' | 'list'

const NO_PINS: PublicMapItem[] = []
const LUCERNE: [number, number] = [8.3068, 47.0535]
const MAP_VIEW = { center: LUCERNE, zoom: 15.2, minZoom: 12, maxZoom: 18.5 }

/** The Categories and Map or List buttons over the map: skeletons while the map draws or the places are on the way, nothing when there are none. */
function MapPills({ chosenCount, dataPending, hasPins, view, onFilter, onView }: {
  chosenCount: number
  dataPending: boolean
  hasPins: boolean
  view: View
  onFilter: () => void
  onView: () => void
}) {
  const { t } = useLocale()
  const { state, drawn } = useMap()

  if (state === 'loading' || !drawn || dataPending)
    return <MapControlsSkeleton />
  if (!hasPins)
    return null

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-3 pt-3">
      <Button aria-haspopup="dialog" className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={onFilter}>
        <FilterIcon size={16} />
        {chosenCount > 0 ? t('map.categoriesCount', { count: chosenCount }) : t('map.categories')}
      </Button>
      <span className="flex-1" />
      <Button className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={onView}>
        {view === 'map' ? <BulletListIcon size={16} /> : <PickupIcon size={16} />}
        {t(view === 'map' ? 'map.view.list' : 'map.view.map')}
      </Button>
    </div>
  )
}

/**
 * N02, option B "Cards" (docs/ux/pins-design.md): a flat aerial map between the top edge and the
 * guest tab bar, with a Categories button and a Map or List switch over it. A pin opens its card
 * in a row above the tab bar. Map, card row and list all come from one ranked list of pins (the
 * server's order until onboarding adds the visitor's answers, E4.5); the filter dims pins on the
 * map and never removes one, while the card row and the list hold only the chosen places. `place` is the slug of
 * `?place=<slug>`: its card opens once the places have loaded, and a slug the map does not hold shows a notice (AC90).
 * Show more on a card opens the details sheet of the open pin (N03, E4.7).
 * `category` and `dated` are the address's filters (E4.13): they open the map filtered, a `place` clears them, and a
 * choice in the sheet is written back through `onSearchChange` (the route replaces the address, never pushes).
 */
export function MapScreen({ place, category, dated, onSearchChange }: MapSearch & { onSearchChange?: (search: MapSearch) => void }) {
  const { t, language, intlLocale } = useLocale()
  const data = useMapData(language)
  const headingId = useId()
  const [today] = useState(() => zurichToday(new Date()))
  // Empty means All.
  const [chosen, setChosen] = useState<string[]>([])
  const [datedOnly, setDatedOnly] = useState(false)
  // The address's filter is read once per value, when the categories have arrived: the raw address and the cleaned one both count as read.
  const [handledFilter, setHandledFilter] = useState<string[]>([])
  const [badCategory, setBadCategory] = useState(false)
  const [view, setView] = useState<View>('map')
  const [selectedId, setSelectedId] = useState<string>()
  const [filterOpen, setFilterOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // The deep link is read once per value, when the places have arrived: the slug opens its card, or the notice says it is gone.
  const [handledPlace, setHandledPlace] = useState<string>()
  const [gone, setGone] = useState(false)
  // Without a deep link the first place's card opens once the places arrive, so the map lands on a pin with its card.
  const [firstOpened, setFirstOpened] = useState(false)

  const dataReady = !data.isPending && !data.isFailed
  const status = data.isFailed
    ? 'failed' as const
    : data.isPending ? 'pins-loading' as const : data.pins.length === 0 ? 'empty' as const : undefined
  const ranked = dataReady ? data.pins : NO_PINS
  const located = useMemo(() => ranked.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] })), [ranked])
  const filter = { chosen, datedOnly }
  const kept = keepFiltered(ranked, filter, data.categories)
  const litIds = new Set(kept.map(pin => pin.id))
  const dimmedIds = useMemo(() => new Set(ranked.filter(pin => !isLit(pin, { chosen, datedOnly }, data.categories)).map(pin => pin.id)), [ranked, chosen, datedOnly, data.categories])
  const resolved = useMemo(() => dataReady ? resolveMapFilter({ place, category, dated }, data.categories) : undefined, [dataReady, place, category, dated, data.categories])
  const addressKey = JSON.stringify({ place, category, dated })
  const filterHandled = handledFilter.includes(addressKey)
  const isFiltered = chosen.length > 0 || datedOnly
  const openId = view === 'map' && selectedId !== undefined && litIds.has(selectedId) ? selectedId : undefined
  const chosenCount = chosen.length
  const openPin = openId ? ranked.find(pin => pin.id === openId) : undefined
  const detail = useQuery({ ...mapQueries.pin(openId ?? '', language), enabled: apiEnabled && openId !== undefined })
  const index = openPin ? kept.findIndex(pin => pin.id === openPin.id) : -1
  const insets = { top: CONTROLS, bottom: openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT + 8 : MAP_BOTTOM_CLEAR }

  if (resolved && !filterHandled) {
    setHandledFilter([addressKey, JSON.stringify(resolved.address)])
    setChosen(resolved.chosen)
    setDatedOnly(resolved.datedOnly)
    setBadCategory(resolved.unknownCategory)
  }
  if (dataReady && place !== undefined && handledPlace !== place) {
    const match = ranked.find(pin => pin.slug === place)

    setHandledPlace(place)
    setGone(!match)
    if (match)
      setSelectedId(match.id)
  }
  if (dataReady && filterHandled && place === undefined && !firstOpened && kept.length > 0) {
    setFirstOpened(true)
    if (selectedId === undefined)
      setSelectedId(kept[0]!.id)
  }
  const deepLinkedId = handledPlace !== undefined && handledPlace === place ? ranked.find(pin => pin.slug === place)?.id : undefined
  const reportedDeepLinkRef = useRef<string | undefined>(undefined)

  const trackAllowed = useTrackAllowed()

  // A place link, or a slug no category carries, leaves a filter in the address that the map does not apply: the address is cleaned to match (replace).
  useEffect(() => {
    if (resolved?.addressChanged)
      onSearchChange?.(resolved.address)
  }, [resolved, onSearchChange])

  // The deep link counts as an opened pin once. While the guest gate holds (the session is not answered) the pin is not marked reported:
  // it is sent when the gate opens, and never when the gate has closed for a merchant.
  useEffect(() => {
    if (deepLinkedId && trackAllowed && reportedDeepLinkRef.current !== deepLinkedId) {
      reportedDeepLinkRef.current = deepLinkedId
      track('pin_open', { pageType: 'place', contentId: deepLinkedId, language })
    }
  }, [deepLinkedId, language, trackAllowed])

  // The deep link's card gets focus on its title, as a tapped pin's does.
  useEffect(() => {
    if (deepLinkedId)
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${deepLinkedId}"] h2`)?.focus({ preventScroll: true }))
  }, [deepLinkedId, language])

  // Every way a guest opens a pin other than the automatic first card and the deep link (reported in the effect above): the pin opens
  // for analytics (ADR-032) unless it is the card already open.
  function select(id: string | undefined) {
    if (id !== undefined && id !== openId)
      track('pin_open', { pageType: 'place', contentId: id, language })
    setSelectedId(id)
  }

  // A pin tap, a list row or an applied filter moves focus to the card's title; a swipe leaves focus alone.
  function openCard(id: string) {
    select(id)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${id}"] h2`)?.focus({ preventScroll: true }))
  }

  function openFromPin(id: string) {
    if (litIds.has(id))
      openCard(id)
  }

  function openFromList(id: string) {
    setView('map')
    openCard(id)
  }

  function closeCard() {
    const id = selectedId

    setSelectedId(undefined)
    setMoreOpen(false)
    // Back to what opened it: the pin on the map, or the row in the list.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)?.focus())
  }

  function applyFilter(next: string[]) {
    const first = keepFiltered(ranked, { chosen: next, datedOnly: false }, data.categories)[0]

    // The sheet's choice is the whole filter (its counts ignore dates, and it has no switch for them), and it moves the address
    // off any place link, so a copied address reproduces the view.
    setChosen(next)
    setDatedOnly(false)
    setFirstOpened(true)
    onSearchChange?.(filterAddress(next, data.categories, false))
    setFilterOpen(false)
    setMoreOpen(false)
    setView('map')
    // A filter that keeps nothing opens no card and drops the one that was open.
    if (next.length > 0 && first)
      openCard(first.id)
    else setSelectedId(undefined)
  }

  const dateCopy = { until: (day: string) => t('map.date.until', { day }), from: (time: string) => t('map.date.from', { time }) }
  const matchesNothing = dataReady && isFiltered && kept.length === 0
  const places = t(kept.length === 1 ? 'map.places.one' : 'map.places.other', { count: kept.length })
  const announce = !isFiltered
    ? t(ranked.length === 1 ? 'map.announce.all.one' : 'map.announce.all.other', { count: ranked.length })
    : chosenCount === 0
      ? t('map.announce.dated', { count: kept.length, total: ranked.length })
      : t('map.announce.some', {
          categories: data.categories.filter(category => chosen.includes(category.id)).map(category => categoryName(category, language)).join(', '),
          count: kept.length,
          total: ranked.length,
        })

  return (
    <section aria-labelledby={headingId} className="relative min-h-[28rem] flex-1 overflow-hidden">
      <h1 className="sr-only" id={headingId}>{t('map.heading')}</h1>

      <MapView
        className="absolute inset-0"
        credits={view === 'map'}
        inert={view === 'list'}
        insets={insets}
        label={t('map.heading')}
        overlay={(
          <>
            <MapPills
              chosenCount={chosenCount}
              dataPending={data.isPending}
              hasPins={dataReady && data.pins.length > 0}
              view={view}
              onFilter={() => setFilterOpen(true)}
              onView={() => setView(view === 'map' ? 'list' : 'map')}
            />
            {view === 'map' && dataReady && <MapControls />}
          </>
        )}
        safeArea
        status={status}
        view={MAP_VIEW}
        onRetry={data.isFailed ? data.retry : undefined}
      >
        <PinLayer
          followSelected
          dimmedIds={dimmedIds}
          pins={located}
          renderCluster={(members, zoomIn) => <PhotoCluster count={members.length} icons={members.slice(0, 2).map(member => pinIcon(member, data.categories))} dimmed={members.every(member => dimmedIds.has(member.id))} onPress={zoomIn} />}
          renderPin={(pin, state) => {
            const date = pin.nextDate ? nextDateLine(pin.nextDate, today, intlLocale, dateCopy) : undefined
            const label = [pin.title, date && `${t('map.pin.event')}, ${date}`, state.dimmed && t('map.pin.dimmed')].filter(Boolean).join(', ')

            return <PhotoPin dimmed={state.dimmed} emphasized={isFiltered && !state.dimmed} id={pin.id} label={label} icon={pinIcon(pin, data.categories)} photoSrc={pin.photoUrl ?? undefined} title={pin.title} selected={state.selected} onPress={state.select} />
          }}
          selectedId={openId}
          onSelect={openFromPin}
        />
        {openId && (
          <PlaceCardRow
            extrasOf={pin => ({
              categories: pinCategoryNames(pin, data.categories, language),
              // Only the open card has read its pin: the others open the position. The card shows no tip (owner 2026-11-03), so it never changes size when the read arrives.
              ...(pin.id === openId && detail.data ? { mapsLink: detail.data.mapsLink } : {}),
            })}
            iconOf={pin => pinIcon(pin, data.categories)}
            photoOf={pin => pin.photoUrl ?? undefined}
            pins={kept}
            selectedId={openId}
            onClose={closeCard}
            onMore={() => setMoreOpen(true)}
            onSelect={select}
          />
        )}
      </MapView>

      {view === 'list' && dataReady && (
        <div className="absolute inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] z-[8] overflow-y-auto bg-background px-4 pt-[76px] pb-4">
          {!matchesNothing && (
            <>
              <h2 className="pb-2 text-card-title font-semibold">{places}</h2>
              <PinList categories={data.categories} pins={kept} onOpen={openFromList} />
            </>
          )}
        </div>
      )}

      {matchesNothing && (
        <div className="pointer-events-none absolute inset-x-3 top-[70px] z-[9] flex justify-center">
          <div className="pointer-events-auto flex w-full flex-col items-center gap-2 rounded-3xl bg-surface p-5 text-center shadow-overlay" role="status">
            <p className="font-serif text-card-title text-balance">{t('map.none.title')}</p>
            <Button className="min-h-11" variant="secondary" onPress={() => applyFilter([])}>{t('map.filter.clear')}</Button>
          </div>
        </div>
      )}

      {(gone || badCategory) && (
        <div className="absolute start-3 end-[68px] top-[70px] z-[9] flex justify-center">
          <div className="flex w-full items-center gap-2 rounded-3xl bg-surface py-2 ps-5 pe-2 shadow-overlay" role="status">
            <p className="flex-1 text-sm">{t(gone ? 'map.gone' : 'map.category.unknown')}</p>
            <Button isIconOnly aria-label={t('map.gone.close')} className="size-11 min-w-11 rounded-full" variant="tertiary" onPress={() => gone ? setGone(false) : setBadCategory(false)}>
              <CloseIcon size={18} />
            </Button>
          </div>
        </div>
      )}

      <p aria-live="polite" className="sr-only">{dataReady ? announce : ''}</p>

      {moreOpen && openPin && (
        <PlaceSheet
          detail={detail.data}
          failed={detail.isError}
          isOpen
          item={openPin}
          position={{ index, count: kept.length }}
          onClose={() => setMoreOpen(false)}
          onRetry={() => void detail.refetch()}
          onStep={delta => select(kept[index + delta]?.id)}
          onStoryClick={() => track('pin_to_story_click', { pageType: 'place', contentId: openPin.id, language })}
          onOutboundClick={() => track('outbound_click', { pageType: 'place', contentId: openPin.id, language })}
        />
      )}

      {filterOpen && (
        <CategoriesSheet
          categories={data.categories}
          chosen={chosen}
          pins={ranked}
          onApply={applyFilter}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </section>
  )
}
