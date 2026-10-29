import type { PublicMapItem } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useEffect, useId, useState } from 'react'

import { MapCredits } from '@/components/aerial-map/map-credits'
import { useAerialMap } from '@/components/aerial-map/use-aerial-map'
import { BulletListIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMapData } from '@/features/map/api/queries'
import { categoryName, keepHighlighted, topLevelCategories } from '@/features/map/lib/categories'
import { CategoriesSheet } from './categories-sheet'
import { MapControlsSkeleton } from './map-skeleton'
import { PinList } from './pin-list'
import { PinMap } from './pin-map'
import { PlaceCardRow } from './place-card'
import { MapStatusLayer } from './status-layer'

type View = 'map' | 'list'

const NO_PINS: PublicMapItem[] = []
/** The tab bar without the home-indicator inset (px): the camera keeps pins clear of it. */
const TAB_BAR = 64
const CONTROLS = 60
/** The card row sits above the background-music button (px from the bottom), so neither covers the other. */
const CARD_ROW_BOTTOM = 124
const CARD_ROW_HEIGHT = 190
const LUCERNE: [number, number] = [8.3068, 47.0535]
const MAP_OPTIONS = { center: LUCERNE, zoom: 15.2, minZoom: 12, maxZoom: 18.5 }

/**
 * N02, option B "Cards" (docs/ux/pins-design.md): a flat aerial map between the top edge and the
 * guest tab bar, with a Categories button and a Map or List switch over it. A pin opens its card
 * in a row above the tab bar. Map, card row and list all come from one ranked list of pins (the
 * server's order until onboarding adds the visitor's answers, E4.5); the filter dims pins on the
 * map and never removes one, while the card row and the list hold only the chosen places.
 */
export function MapScreen() {
  const { t, language } = useLocale()
  const data = useMapData(language)
  const { containerRef, map, maplibre, state: mapState, retry: retryMap } = useAerialMap({ options: MAP_OPTIONS })
  const headingId = useId()
  // Empty means All.
  const [chosen, setChosen] = useState<string[]>([])
  const [view, setView] = useState<View>('map')
  const [selectedId, setSelectedId] = useState<string>()
  const [filterOpen, setFilterOpen] = useState(false)

  const failed = data.isFailed || mapState === 'error'
  const pinsReady = mapState === 'ready' && !data.isPending && !data.isFailed
  const status = failed
    ? 'failed' as const
    : mapState === 'loading'
      ? 'map-loading' as const
      : data.isPending ? 'pins-loading' as const : data.pins.length === 0 ? 'empty' as const : undefined
  const ranked = pinsReady ? data.pins : NO_PINS
  const kept = keepHighlighted(ranked, chosen, data.categories)
  const litIds = new Set(kept.map(pin => pin.id))
  const openId = view === 'map' && selectedId !== undefined && litIds.has(selectedId) ? selectedId : undefined
  const chosenCount = chosen.length

  useEffect(() => {
    map?.getCanvas().setAttribute('aria-label', t('map.heading'))
  }, [map, t])

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
    if (next.length > 0 && first)
      openCard(first.id)
  }

  function retry() {
    if (mapState === 'error')
      retryMap()
    if (data.isFailed)
      data.retry()
  }

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

      {status === 'map-loading' || status === 'pins-loading'
        ? <MapControlsSkeleton />
        : pinsReady && data.pins.length > 0 && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-3 pt-3">
            <Button aria-haspopup="dialog" className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={() => setFilterOpen(true)}>
              <FilterIcon size={16} />
              {chosenCount > 0 ? t('map.categoriesCount', { count: chosenCount }) : t('map.categories')}
            </Button>
            <span className="flex-1" />
            <Button className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={() => setView(view === 'map' ? 'list' : 'map')}>
              {view === 'map' ? <BulletListIcon size={16} /> : <PickupIcon size={16} />}
              {t(view === 'map' ? 'map.view.list' : 'map.view.map')}
            </Button>
          </div>
        )}

      {/* MapLibre makes its container `position: relative`, so it sits in a sized box. */}
      <div className="absolute inset-0 bg-[#c9d3c6]">
        <div ref={containerRef} className="size-full" />
      </div>
      <PinMap
        filtered={chosenCount > 0}
        insetBottom={openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT : TAB_BAR}
        insetTop={CONTROLS}
        litIds={litIds}
        map={map}
        maplibre={maplibre}
        pins={ranked}
        selectedId={openId}
        onSelect={openFromPin}
      />
      {status && <MapStatusLayer status={status} onRetry={retry} />}

      {view === 'list' && pinsReady && (
        <div className="absolute inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] z-[8] overflow-y-auto bg-background px-4 pt-[60px] pb-4">
          <h2 className="pb-2 text-card-title font-semibold">{places}</h2>
          <PinList categories={data.categories} pins={kept} onOpen={openFromList} />
        </div>
      )}

      <p aria-live="polite" className="sr-only">{pinsReady ? announce : ''}</p>

      {view === 'map' && (
        <MapCredits className={`absolute start-3 z-10 max-w-[calc(100%-6rem)] ${openId ? 'top-14' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+108px)]'}`} />
      )}

      {openId && (
        <PlaceCardRow
          pins={kept}
          selectedId={openId}
          onClose={closeCard}
          onSelect={setSelectedId}
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
