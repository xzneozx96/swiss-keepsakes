import type { PublicMapItem } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useId, useMemo, useState } from 'react'

import { BulletListIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { MapControls } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'
import { useMapData } from '@/features/map/api/queries'
import { categoryName, isHighlighted, keepHighlighted, pinCategoryNames, topLevelCategories } from '@/features/map/lib/categories'
import { CARD_ROW_BOTTOM, CARD_ROW_HEIGHT, CONTROLS, MAP_BOTTOM_CLEAR } from '@/features/map/lib/layout'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { CategoriesSheet } from './categories-sheet'
import { MapControlsSkeleton } from './map-skeleton'
import { PinList } from './pin-list'
import { PlaceCardRow } from './place-card'

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
 * map and never removes one, while the card row and the list hold only the chosen places.
 */
export function MapScreen() {
  const { t, language, intlLocale } = useLocale()
  const data = useMapData(language)
  const headingId = useId()
  const [today] = useState(() => zurichToday(new Date()))
  // Empty means All.
  const [chosen, setChosen] = useState<string[]>([])
  const [view, setView] = useState<View>('map')
  const [selectedId, setSelectedId] = useState<string>()
  const [filterOpen, setFilterOpen] = useState(false)

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
  const insets = { top: CONTROLS, bottom: openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT + 8 : MAP_BOTTOM_CLEAR }

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
    // Back to what opened it: the pin on the map, or the row in the list.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)?.focus())
  }

  function applyFilter(next: string[]) {
    const first = keepHighlighted(ranked, next, data.categories)[0]

    setChosen(next)
    setFilterOpen(false)
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

            return <PhotoPin dimmed={state.dimmed} emphasized={chosenCount > 0 && !state.dimmed} id={pin.id} label={label} selected={state.selected} onPress={state.select} />
          }}
          selectedId={openId}
          onSelect={openFromPin}
        />
        {openId && (
          <PlaceCardRow
            extrasOf={pin => ({ categories: pinCategoryNames(pin, data.categories, language) })}
            pins={kept}
            selectedId={openId}
            onClose={closeCard}
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

      <p aria-live="polite" className="sr-only">{dataReady ? announce : ''}</p>

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
