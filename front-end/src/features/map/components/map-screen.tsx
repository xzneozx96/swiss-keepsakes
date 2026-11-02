import type { PublicMapItem } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useState } from 'react'

import { BulletListIcon, CloseIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { MapControls } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'
import { mapQueries, useMapData } from '@/features/map/api/queries'
import { categoryName, isHighlighted, keepHighlighted, pinCategoryNames, topLevelCategories } from '@/features/map/lib/categories'
import { CARD_ROW_BOTTOM, CARD_ROW_HEIGHT, CONTROLS, MAP_BOTTOM_CLEAR } from '@/features/map/lib/layout'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
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
 */
export function MapScreen({ place }: { place?: string }) {
  const { t, language, intlLocale } = useLocale()
  const data = useMapData(language)
  const headingId = useId()
  const [today] = useState(() => zurichToday(new Date()))
  // Empty means All.
  const [chosen, setChosen] = useState<string[]>([])
  const [view, setView] = useState<View>('map')
  const [selectedId, setSelectedId] = useState<string>()
  const [filterOpen, setFilterOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // The deep link is read once per value, when the places have arrived: the slug opens its card, or the notice says it is gone.
  const [handledPlace, setHandledPlace] = useState<string>()
  const [gone, setGone] = useState(false)

  const dataReady = !data.isPending && !data.isFailed
  const status = data.isFailed
    ? 'failed' as const
    : data.isPending ? 'pins-loading' as const : data.pins.length === 0 ? 'empty' as const : undefined
  const ranked = dataReady ? data.pins : NO_PINS
  const located = useMemo(() => ranked.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] })), [ranked])
  const kept = keepHighlighted(ranked, chosen, data.categories)
  const litIds = new Set(kept.map(pin => pin.id))
  const dimmedIds = useMemo(() => new Set(ranked.filter(pin => !isHighlighted(pin, chosen, data.categories)).map(pin => pin.id)), [ranked, chosen, data.categories])
  const openId = view === 'map' && selectedId !== undefined && litIds.has(selectedId) ? selectedId : undefined
  const chosenCount = chosen.length
  const openPin = openId ? ranked.find(pin => pin.id === openId) : undefined
  const detail = useQuery({ ...mapQueries.pin(openId ?? '', language), enabled: apiEnabled && openId !== undefined })
  const index = openPin ? kept.findIndex(pin => pin.id === openPin.id) : -1
  const insets = { top: CONTROLS, bottom: openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT + 8 : MAP_BOTTOM_CLEAR }

  if (dataReady && place !== undefined && handledPlace !== place) {
    const match = ranked.find(pin => pin.slug === place)

    setHandledPlace(place)
    setGone(!match)
    if (match)
      setSelectedId(match.id)
  }
  const deepLinkedId = handledPlace !== undefined && handledPlace === place ? ranked.find(pin => pin.slug === place)?.id : undefined

  // The deep link's card gets focus on its title, as a tapped pin's does.
  useEffect(() => {
    if (deepLinkedId)
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${deepLinkedId}"] h2`)?.focus({ preventScroll: true }))
  }, [deepLinkedId])

  // A pin tap, a list row or an applied filter moves focus to the card's title; a swipe leaves focus alone.
  function openCard(id: string) {
    setSelectedId(id)
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
    const first = keepHighlighted(ranked, next, data.categories)[0]

    setChosen(next)
    setFilterOpen(false)
    setMoreOpen(false)
    setView('map')
    // A filter that keeps nothing opens no card and drops the one that was open.
    if (next.length > 0 && first)
      openCard(first.id)
    else setSelectedId(undefined)
  }

  const dateCopy = { until: (day: string) => t('map.date.until', { day }), from: (time: string) => t('map.date.from', { time }) }
  const matchesNothing = dataReady && chosenCount > 0 && kept.length === 0
  const places = t(kept.length === 1 ? 'map.places.one' : 'map.places.other', { count: kept.length })
  const announce = chosenCount === 0
    ? t(ranked.length === 1 ? 'map.announce.all.one' : 'map.announce.all.other', { count: ranked.length })
    : t('map.announce.some', {
        categories: topLevelCategories(data.categories).filter(category => chosen.includes(category.id)).map(category => categoryName(category, language)).join(', '),
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
          fit="first-load"
          dimmedIds={dimmedIds}
          pins={located}
          renderCluster={(members, zoomIn) => <PhotoCluster count={members.length} dimmed={members.every(member => dimmedIds.has(member.id))} onPress={zoomIn} />}
          renderPin={(pin, state) => {
            const date = pin.nextDate ? nextDateLine(pin.nextDate, today, intlLocale, dateCopy) : undefined
            const label = [pin.title, date && `${t('map.pin.event')}, ${date}`, state.dimmed && t('map.pin.dimmed')].filter(Boolean).join(', ')

            return <PhotoPin dimmed={state.dimmed} emphasized={chosenCount > 0 && !state.dimmed} id={pin.id} label={label} photoSrc={pin.photoUrl ?? undefined} title={pin.title} selected={state.selected} onPress={state.select} />
          }}
          selectedId={openId}
          onSelect={openFromPin}
        />
        {openId && (
          <PlaceCardRow
            extrasOf={pin => ({
              categories: pinCategoryNames(pin, data.categories, language),
              // Only the open card has read its pin: the others show no tip until they open, and open the position.
              ...(pin.id === openId && detail.data ? { tip: detail.data.tip ? { text: detail.data.tip, language: detail.data.language } : undefined, mapsLink: detail.data.mapsLink } : {}),
            })}
            photoOf={pin => pin.photoUrl ?? undefined}
            pins={kept}
            selectedId={openId}
            onClose={closeCard}
            onMore={() => setMoreOpen(true)}
            onSelect={setSelectedId}
          />
        )}
      </MapView>

      {view === 'list' && dataReady && (
        <div className="absolute inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] z-[8] overflow-y-auto bg-background px-4 pt-[60px] pb-4">
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

      {gone && (
        <div className="absolute inset-x-3 top-[70px] z-[9] flex justify-center">
          <div className="flex w-full items-center gap-2 rounded-3xl bg-surface py-2 ps-5 pe-2 shadow-overlay" role="status">
            <p className="flex-1 text-sm">{t('map.gone')}</p>
            <Button isIconOnly aria-label={t('map.gone.close')} className="size-11 min-w-11 rounded-full" variant="tertiary" onPress={() => setGone(false)}>
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
          onStep={delta => setSelectedId(kept[index + delta]?.id)}
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
