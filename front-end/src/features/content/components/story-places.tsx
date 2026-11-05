import type { PublicMapItem, PublicStory } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Skeleton } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { LazyMapView } from '@/components/map/lazy-map-view'
import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'
import { mapQueries } from '@/features/map/api/queries'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { PlaceSheet } from '@/features/map/components/place-sheet'
import { pinCategoryNames, pinIcon } from '@/features/map/lib/categories'
import { CARD_ROW_HEIGHT } from '@/features/map/lib/layout'
import { track } from '@/lib/analytics/track'
import { apiEnabled } from '@/lib/api-mode'

/** The frame's height (px), the same before the map loads, so the page does not jump. */
const FRAME = 'h-[420px]'
/** The embedded map ends where the page goes on: no tab bar under it, so the card row sits 8 px above its foot. */
const CARD_ROW_BOTTOM = 8
/** One place is centred at this zoom; several are fitted by the pin layer. */
const ONE_PLACE_ZOOM = 16

/**
 * The places a story tags, on an embedded map built from the guest map's own parts (the pin layer, the card row and the
 * place sheet), with the first place's card open: its Google Maps button is one tap. Only the story's places are pins, matched to
 * the public map list by id in the story's order; a place with no pin there is left out, and nothing to show draws nothing.
 * The map draws only near the viewport and with cooperative gestures, so one finger scrolls the page.
 */
export function StoryPlaces({ places, language }: { places: PublicStory['places'], language: Language }) {
  const { t, language: guestLanguage } = useLocale()
  const pinsRead = useQuery(mapQueries.pins(guestLanguage))
  const categoriesRead = useQuery(mapQueries.categories(guestLanguage))
  const pins = pinsRead.data
  const matched = useMemo(() => {
    const byId = new Map(pins?.map(pin => [pin.id, pin]))

    return places.flatMap(place => byId.get(place.id) ?? [])
  }, [pins, places])

  if (places.length === 0 || (pins && matched.length === 0))
    return null

  return (
    <section aria-labelledby="story-places" className="mt-10 flex flex-col gap-4 border-t border-separator pt-7" lang={language}>
      <h2 className="font-serif text-title" id="story-places">{t('article.places')}</h2>
      {pinsRead.isError
        ? <ErrorNotice compact message={t('article.places.failed')} onRetry={() => void pinsRead.refetch()} />
        : pins
          ? <StoryMap categories={categoriesRead.data ?? []} pins={matched} />
          : <Skeleton className={`${FRAME} w-full rounded-2xl`} data-skeleton="story-map" />}
    </section>
  )
}

/** The map, the card row and the details sheet, for the story's own pins, all lit. */
function StoryMap({ pins, categories }: { pins: PublicMapItem[], categories: Parameters<typeof pinIcon>[1] }) {
  const { t, language } = useLocale()
  const [selectedId, setSelectedId] = useState<string>()
  // The first card opens with the section; closing it keeps it closed until a pin opens one again.
  const [closed, setClosed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const openPin = closed ? undefined : (pins.find(pin => pin.id === selectedId) ?? pins[0])
  const openId = openPin?.id
  const detail = useQuery({ ...mapQueries.pin(openId ?? '', language), enabled: apiEnabled && openId !== undefined })
  const index = openPin ? pins.indexOf(openPin) : -1
  const located = useMemo(() => pins.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] })), [pins])
  const insets = { top: 0, bottom: openId ? CARD_ROW_BOTTOM + CARD_ROW_HEIGHT + 8 : 0 }
  const first = pins[0]!
  const view = { center: [first.longitude, first.latitude] as [number, number], zoom: pins.length === 1 ? ONE_PLACE_ZOOM : 14, minZoom: 10, maxZoom: 18.5 }

  // Every way a guest opens a pin counts for analytics once (ADR-032), unless it is the card already open.
  function select(id: string) {
    if (id !== openId)
      track('pin_open', { pageType: 'place', contentId: id, language })
    setClosed(false)
    setSelectedId(id)
  }

  function closeCard() {
    const id = openId

    setClosed(true)
    setMoreOpen(false)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)?.focus())
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <LazyMapView
        cooperativeGestures
        className={FRAME}
        insets={insets}
        label={t('article.places')}
        tabBarSpace={false}
        view={view}
      >
        <PinLayer
          fit="first-load"
          followSelected={pins.length === 1}
          pins={located}
          renderCluster={(members, zoomIn) => <PhotoCluster count={members.length} icons={members.slice(0, 2).map(member => pinIcon(member, categories))} dimmed={false} onPress={zoomIn} />}
          renderPin={(pin, state) => (
            <PhotoPin
              dimmed={false}
              emphasized
              icon={pinIcon(pin, categories)}
              id={pin.id}
              label={pin.title}
              photoSrc={pin.photoUrl ?? undefined}
              selected={state.selected}
              title={pin.title}
              onPress={state.select}
            />
          )}
          selectedId={openId}
          onSelect={select}
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
            pins={pins}
            selectedId={openId}
            onClose={closeCard}
            onMore={() => setMoreOpen(true)}
            onSelect={select}
          />
        )}
      </LazyMapView>

      {moreOpen && openPin && (
        <PlaceSheet
          detail={detail.data}
          failed={detail.isError}
          isOpen
          item={openPin}
          position={{ index, count: pins.length }}
          onClose={() => setMoreOpen(false)}
          onRetry={() => void detail.refetch()}
          onStep={delta => pins[index + delta] && select(pins[index + delta]!.id)}
          onStoryClick={() => track('pin_to_story_click', { pageType: 'place', contentId: openPin.id, language })}
          onOutboundClick={() => track('outbound_click', { pageType: 'place', contentId: openPin.id, language })}
        />
      )}
    </div>
  )
}
