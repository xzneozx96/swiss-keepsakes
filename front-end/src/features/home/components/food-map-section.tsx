import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { RankPrefs } from '@sk/domain/content'

import { Skeleton } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { LazyMapView } from '@/components/map/lazy-map-view'
import { MapControls } from '@/components/map/map-controls'
import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'
import { mapQueries } from '@/features/map/api/queries'
import { CategoriesSheet } from '@/features/map/components/categories-sheet'
import { MapPills } from '@/features/map/components/map-pills'
import { PinList } from '@/features/map/components/pin-list'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { PlaceSheet } from '@/features/map/components/place-sheet'
import { isLit, keepFiltered, pinCategoryNames, pinIcon } from '@/features/map/lib/categories'
import { CARD_ROW_HEIGHT, CONTROLS } from '@/features/map/lib/layout'
import { track } from '@/lib/analytics/track'
import { apiEnabled } from '@/lib/api-mode'
import { foodMapSelection } from '../lib/food-map'
import { SectionHeading } from './section-heading'

type View = 'map' | 'list'

const NO_PREFS: RankPrefs = {}
const LUCERNE: [number, number] = [8.3068, 47.0535]
const MAP_VIEW = { center: LUCERNE, zoom: 15.2, minZoom: 12, maxZoom: 18.5 }
/** The frame's height (px), the same before the map loads, so the page does not jump (home-design.md section 4: 548 px on the phone). */
const FRAME = 'h-[548px]'
/** The embedded map ends where the page goes on: no tab bar under it, so the card row sits 8 px above its foot. */
const CARD_ROW_BOTTOM = 8

/**
 * "Eat and drink like a local": the shared guest map inside the home, filtered to the food and drink category and its
 * sub-categories on load. Its pins, Categories sheet, List, card row and place sheet are the guest map's own components
 * (docs/ux/home-design.md section 4); the other categories are one tap away in the sheet and the guest map is not linked.
 * The map draws only near the viewport (`LazyMapView`) and with cooperative gestures, so one finger scrolls the page.
 * `prefs` are the guest's answers: they order the pins and the cards with the map list's ranking and hide none. Until the
 * guest's answers have a store in the browser (E4.5) the home passes none. Not drawn when the category is not there. No price anywhere.
 * The pins and categories are the home loader's read of the map list (undefined while it loads, null when it failed).
 */
export function FoodMapSection({ pins, categories, onRetry, prefs = NO_PREFS }: { pins: readonly PublicMapItem[] | null | undefined, categories: PublicCategory[] | null | undefined, onRetry: () => void, prefs?: RankPrefs }) {
  const { t } = useLocale()
  const headingId = useId()
  const isFailed = pins === null || categories === null
  const isPending = pins === undefined || categories === undefined
  const selection = useMemo(() => pins && categories ? foodMapSelection(pins, categories, prefs) : undefined, [pins, categories, prefs])

  if (!isPending && !isFailed && !selection)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 pt-4">
      <SectionHeading body={t('homePage.food.body')} id={headingId} title={t('homePage.food.title')} />
      {isFailed
        ? <ErrorNotice compact message={t('homePage.food.failed')} onRetry={onRetry} />
        : !selection || !categories
            ? <Skeleton className={`${FRAME} w-full rounded-2xl`} data-skeleton="food-map" />
            : <FoodMap categories={categories} defaultChosen={selection.category.id} ranked={selection.ranked} />}
    </section>
  )
}

/** The map, the list over it, the card row and the sheets: the guest map screen's parts in a frame of the home's own size. */
function FoodMap({ categories, ranked, defaultChosen }: { categories: PublicCategory[], ranked: PublicMapItem[], defaultChosen: string }) {
  const { t, language } = useLocale()
  // Undefined means the section's own filter (food and drink); the sheet's choice replaces it, and an empty choice means All.
  const [picked, setPicked] = useState<string[]>()
  const [view, setView] = useState<View>('map')
  const [selectedId, setSelectedId] = useState<string>()
  // The first card opens with the section, as on the guest map; closing it keeps it closed until a filter or a pin opens one again.
  const [closed, setClosed] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const chosen = picked ?? [defaultChosen]
  const filter = { chosen, datedOnly: false }
  const kept = keepFiltered(ranked, filter, categories)
  const dimmedIds = new Set(ranked.filter(pin => !isLit(pin, filter, categories)).map(pin => pin.id))
  const located = ranked.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] }))
  const litIds = new Set(kept.map(pin => pin.id))
  const openId = view === 'map' && !closed ? (selectedId !== undefined && litIds.has(selectedId) ? selectedId : kept[0]?.id) : undefined
  const openPin = openId ? ranked.find(pin => pin.id === openId) : undefined
  const detail = useQuery({ ...mapQueries.pin(openId ?? '', language), enabled: apiEnabled && openId !== undefined })
  const index = openPin ? kept.findIndex(pin => pin.id === openPin.id) : -1
  const insets = { top: CONTROLS, bottom: openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT + 8 : 0 }
  const places = t(kept.length === 1 ? 'map.places.one' : 'map.places.other', { count: kept.length })

  // Every way a guest opens a pin counts for analytics once (ADR-032), unless it is the card already open.
  function select(id: string) {
    if (id !== openId)
      track('pin_open', { pageType: 'place', contentId: id, language })
    setClosed(false)
    setSelectedId(id)
  }

  // A pin tap or a list row moves focus to the card's title; a swipe leaves focus alone.
  function openCard(id: string) {
    select(id)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${id}"] h2`)?.focus({ preventScroll: true }))
  }

  function closeCard() {
    const id = openId

    setClosed(true)
    setMoreOpen(false)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)?.focus())
  }

  function applyFilter(next: string[]) {
    setPicked(next)
    setClosed(false)
    setSelectedId(keepFiltered(ranked, { chosen: next, datedOnly: false }, categories)[0]?.id)
    setFilterOpen(false)
    setMoreOpen(false)
    setView('map')
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <LazyMapView
        cooperativeGestures
        className={FRAME}
        credits={view === 'map'}
        inert={view === 'list'}
        insets={insets}
        label={t('homePage.food.title')}
        overlay={(
          <>
            <MapPills
              chosenCount={chosen.length}
              dataPending={false}
              hasPins={ranked.length > 0}
              view={view}
              onFilter={() => setFilterOpen(true)}
              onView={() => setView(view === 'map' ? 'list' : 'map')}
            />
            {view === 'map' && <MapControls />}
          </>
        )}
        tabBarSpace={false}
        view={MAP_VIEW}
      >
        <PinLayer
          followSelected
          dimmedIds={dimmedIds}
          pins={located}
          renderCluster={(members, zoomIn) => <PhotoCluster count={members.length} icons={members.slice(0, 2).map(member => pinIcon(member, categories))} dimmed={members.every(member => dimmedIds.has(member.id))} onPress={zoomIn} />}
          renderPin={(pin, state) => (
            <PhotoPin
              dimmed={state.dimmed}
              emphasized={!state.dimmed}
              icon={pinIcon(pin, categories)}
              id={pin.id}
              label={[pin.title, state.dimmed && t('map.pin.dimmed')].filter(Boolean).join(', ')}
              photoSrc={pin.photoUrl ?? undefined}
              selected={state.selected}
              title={pin.title}
              onPress={state.select}
            />
          )}
          selectedId={openId}
          onSelect={id => litIds.has(id) && openCard(id)}
        />
        {openId && (
          <PlaceCardRow
            bottom={CARD_ROW_BOTTOM}
            extrasOf={pin => ({
              categories: pinCategoryNames(pin, categories, language),
              ...(pin.id === openId && detail.data ? { mapsLink: detail.data.mapsLink } : {}),
            })}
            iconOf={pin => pinIcon(pin, categories)}
            photoOf={pin => pin.photoUrl ?? undefined}
            pins={kept}
            selectedId={openId}
            onClose={closeCard}
            onMore={() => setMoreOpen(true)}
            onSelect={select}
          />
        )}
      </LazyMapView>

      {view === 'list' && (
        <div className="absolute inset-0 z-[8] overflow-y-auto bg-background px-4 pt-[76px] pb-4">
          <h3 className="pb-2 text-card-title font-semibold">{places}</h3>
          <PinList
            categories={categories}
            pins={kept}
            onOpen={(id) => {
              setView('map')
              openCard(id)
            }}
          />
        </div>
      )}

      {moreOpen && openPin && (
        <PlaceSheet
          detail={detail.data}
          failed={detail.isError}
          isOpen
          item={openPin}
          position={{ index, count: kept.length }}
          onClose={() => setMoreOpen(false)}
          onRetry={() => void detail.refetch()}
          onStep={delta => kept[index + delta] && select(kept[index + delta]!.id)}
          onStoryClick={() => track('pin_to_story_click', { pageType: 'place', contentId: openPin.id, language })}
          onOutboundClick={() => track('outbound_click', { pageType: 'place', contentId: openPin.id, language })}
        />
      )}

      {filterOpen && (
        <CategoriesSheet
          categories={categories}
          chosen={chosen}
          pins={ranked}
          onApply={applyFilter}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  )
}
