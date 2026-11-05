import type { Tour } from '@sk/domain/bookings'
import type { ReactNode, RefObject } from 'react'

import { Button, Spinner, ToggleButton } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import { useEffect, useMemo, useRef, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, DirectionsIcon, ExploreIcon, InfoIcon } from '@/components/icons'
import { boundsOf } from '@/components/map/clusters'
import { focusStepButton } from '@/components/map/focus-step'
import { MapCard } from '@/components/map/map-card'
import { useMap } from '@/components/map/map-context'
import { MapControls, MapCorner } from '@/components/map/map-controls'
import { warmAerialTiles } from '@/components/map/map-style'
import { MapView } from '@/components/map/map-view'
import { NumberedPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { reducedMotion } from '@/components/map/reduced-motion'
import { RouteLayer } from '@/components/map/route-layer'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

/** The stop card sits this far above the bottom edge of the frame (px). */
const CARD_BOTTOM = 36
/** The card's ✕ and the space between it and the card (px). */
const CLOSE_ROW = 44
const STOP_ZOOM = 16.2

type Stop = Tour['itinerary'][number]

/** Keep the selected pin clear of the controls above and the card below it. */
function clearance(card: RefObject<HTMLDivElement | null>) {
  return { top: 72, right: 64, bottom: (card.current?.offsetHeight ?? 0) + 52, left: 24 }
}

/**
 * The camera of the route: it brings the selected stop to the clear part of the map, in 3D or flat as the person
 * chose, after the stop's tiles are in the browser, so the map never lands on a blank area. The "Heading to" pill
 * shows only if that takes noticeable time.
 */
function TourCamera({ active, name, threeD, card }: { active: Stop | undefined, name: string, threeD: boolean, card: RefObject<HTMLDivElement | null> }) {
  const { t } = useLocale()
  const { map, state, fullscreen } = useMap()
  const [tilesLoading, setTilesLoading] = useState(false)

  useEffect(() => {
    if (!map || state !== 'ready')
      return
    const camera = {
      pitch: threeD ? 55 : 0,
      bearing: threeD ? -25 : 0,
      duration: reducedMotion() ? 0 : 950,
    }
    let cancelled = false
    let veilTimer: ReturnType<typeof setTimeout> | undefined

    if (active) {
      // An offset, not flyTo padding: MapLibre keeps flyTo padding on the map and adds it
      // to fitBounds padding, which zoomed "Whole route" out to the whole country.
      const { top, right, bottom, left } = clearance(card)

      veilTimer = setTimeout(setTilesLoading, 250, true)
      void warmAerialTiles(active.coordinates, 5000).then(() => {
        clearTimeout(veilTimer)
        if (cancelled)
          return
        setTilesLoading(false)
        map.flyTo({
          ...camera,
          center: active.coordinates,
          zoom: STOP_ZOOM,
          offset: [(left - right) / 2, (top - bottom) / 2],
        })
      })
    }
    else {
      map.easeTo(camera)
    }

    return () => {
      cancelled = true
      clearTimeout(veilTimer)
      setTilesLoading(false)
    }
  }, [active, threeD, map, state, fullscreen, card])

  if (!tilesLoading || !active)
    return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[28%] z-[5] flex justify-center px-6" role="status">
      <span className="flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm shadow-sm">
        <span className="flex size-8 items-center justify-center">
          <Spinner size="sm" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-xs text-muted">{t('tourMap.heading')}</span>
          <span className="font-medium">{name}</span>
        </span>
      </span>
    </div>
  )
}

/** Where the stop card sits: over the bottom edge, clear of the home indicator in fullscreen. */
function CardDock({ dockRef, children }: { dockRef: RefObject<HTMLDivElement | null>, children: ReactNode }) {
  const { fullscreen } = useMap()

  return (
    <div ref={dockRef} className="absolute inset-x-3 z-10" style={{ bottom: fullscreen ? `calc(env(safe-area-inset-bottom,0px) + ${CARD_BOTTOM}px)` : CARD_BOTTOM }}>
      {children}
    </div>
  )
}

/** "Whole route" and the 3D switch, in the top left corner. */
function TourPills({ stops, threeD, card, onThreeD }: { stops: Stop[], threeD: boolean, card: RefObject<HTMLDivElement | null>, onThreeD: (on: boolean) => void }) {
  const { t } = useLocale()
  const { map, state } = useMap()

  function overview() {
    if (!map || stops.length === 0)
      return
    map.fitBounds(boundsOf(stops.map(stop => stop.coordinates)), {
      padding: clearance(card),
      maxZoom: STOP_ZOOM,
      pitch: threeD ? 45 : 0,
      bearing: threeD ? -25 : 0,
      duration: reducedMotion() ? 0 : 1000,
    })
  }

  return (
    <MapCorner corner="top-left">
      <Button className="pill pointer-events-auto min-h-11 shadow-sm" isDisabled={state !== 'ready'} size="sm" variant="secondary" onPress={overview}>
        <DirectionsIcon size={17} />
        {t('tourMap.overview')}
      </Button>
      <ToggleButton className="pill pointer-events-auto min-h-11 shadow-sm" isDisabled={state !== 'ready'} isSelected={threeD} size="sm" onChange={onThreeD}>
        <ExploreIcon size={17} />
        {t(threeD ? 'tourMap.view3d' : 'tourMap.view2d')}
      </ToggleButton>
    </MapCorner>
  )
}

/**
 * C09 itinerary (owner reference: Wanderlog). The selected stop shows as a card inside the
 * map, so the guest never scrolls between map and stop; "View more" opens the full stop in
 * a sheet. Pins, card and sheet share one selection; the first and last stop end the
 * previous/next steps (a walking route has a start and a finish). The map, its pins, the route line,
 * the controls and the credits are the shared map kit (components/map); the route stays 3D until E4.12.
 */
export function TourItineraryMap({ tour, showHeading = true }: { tour: Tour, /** False inside a sheet that already carries the title. */ showHeading?: boolean }) {
  const { t, language } = useLocale()
  const stops = tour.itinerary
  const cardRef = useRef<HTMLDivElement>(null)
  const sheetNavRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Where focus lands when the stop card closes and no pin takes it: the heading, or the subtitle when a sheet already carries the title.
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(stops[0]?.id ?? null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [threeD, setThreeD] = useState(true)
  const [cardHeight, setCardHeight] = useState(0)
  const index = stops.findIndex(stop => stop.id === selectedId)
  const active = index >= 0 ? stops[index] : undefined
  const text = (value: Tour['name']) => pickText(value, language).text
  const when = (minutes: number) => minutes === 0 ? t('tourMap.start') : t('tourMap.minute', { minutes })
  const coordinates = useMemo(() => stops.map(stop => stop.coordinates), [stops])
  const pins = useMemo(
    () => stops.map((stop, i) => ({
      id: stop.id,
      coordinates: stop.coordinates,
      number: i + 1,
      label: `${t('tourMap.stop', { number: i + 1 })}: ${pickText(stop.name, language).text}`,
    })),
    [stops, t, language],
  )

  // The credits stay clear of the card and its ✕, so they never sit under them.
  useEffect(() => {
    const card = cardRef.current

    if (!card)
      return
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight))

    observer.observe(card)

    return () => observer.disconnect()
  }, [active])

  function step(delta: 1 | -1, scope: ParentNode | null) {
    const target = stops[index + delta]

    if (!target)
      return
    setSelectedId(target.id)
    focusStepButton(scope, delta, index + delta, stops.length)
  }

  function closeCard() {
    const id = selectedId

    setSelectedId(null)
    requestAnimationFrame(() => {
      const pin = document.querySelector<HTMLElement>(`[data-pin-return="${id}"]`)

      if (pin)
        pin.focus()
      else (headingRef.current ?? subtitleRef.current)?.focus()
    })
  }

  const position = active
    ? { number: index + 1, count: stops.length, name: text(active.name) }
    : null
  const labels = { previous: t('tourMap.previous'), next: t('tourMap.next') }
  const sheetSteps = (
    <>
      <Button className="min-w-0 flex-1" data-step="previous" isDisabled={index <= 0} variant="tertiary" onPress={() => step(-1, sheetNavRef.current)}>
        <ChevronLeftIcon size={18} />
        {labels.previous}
      </Button>
      <Button className="min-w-0 flex-1" data-step="next" isDisabled={index < 0 || index >= stops.length - 1} variant="tertiary" onPress={() => step(1, sheetNavRef.current)}>
        {labels.next}
        <ChevronRightIcon size={18} />
      </Button>
    </>
  )

  return (
    <section aria-label={showHeading ? undefined : t('tourMap.title')} aria-labelledby={showHeading ? `itinerary-${tour.id}` : undefined} className="tour-itinerary flex flex-col gap-5">
      <div>
        {showHeading && (
          <h2
            ref={headingRef}
            className="font-serif text-2xl text-balance outline-none"
            id={`itinerary-${tour.id}`}
            tabIndex={-1}
          >
            {t('tourMap.title')}
          </h2>
        )}
        <p ref={subtitleRef} className={`${showHeading ? 'mt-2 ' : ''}text-muted outline-none`} tabIndex={-1}>{t('tourMap.subtitle')}</p>
      </div>
      {stops.length === 0
        ? <p className="text-muted">{t('tourMap.empty')}</p>
        : (
            <>
              <MapView
                cooperativeGestures
                lazy
                className="relative h-[min(72svh,640px)] min-h-[460px] rounded-3xl bg-surface-secondary"
                insets={{ top: 0, bottom: active ? CARD_BOTTOM + cardHeight + CLOSE_ROW + 8 : 8 }}
                label={t('tourMap.mapLabel')}
                mode="3d"
                resetKey={stops}
                view={{ center: stops[0]?.coordinates, zoom: STOP_ZOOM }}
              >
                <RouteLayer coordinates={coordinates} />
                <PinLayer
                  pins={pins}
                  renderPin={(pin, state) => <NumberedPin id={pin.id} label={pin.label} number={pin.number} selected={state.selected} onPress={state.select} />}
                  selectedId={selectedId ?? undefined}
                  onSelect={setSelectedId}
                />
                <TourCamera active={active} card={cardRef} name={position?.name ?? ''} threeD={threeD} />
                <MapControls fullscreen />
                <TourPills card={cardRef} stops={stops} threeD={threeD} onThreeD={setThreeD} />
                {active && position && (
                  <CardDock dockRef={cardRef}>
                    <MapCard
                      action={<Button size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>{t('tourMap.viewMore')}</Button>}
                      eyebrow={`${t('tourMap.stop', position)} · ${when(active.minutesFromStart)}`}
                      headingLevel={3}
                      id={active.id}
                      nav={{ index, count: stops.length, labels, onStep: delta => step(delta, cardRef.current) }}
                      text={text(active.description)}
                      thumb={<Media alt="" className="size-full" photo={active.photo} />}
                      title={position.name}
                      onClose={closeCard}
                    />
                  </CardDock>
                )}
              </MapView>
              <p aria-live="polite" className="sr-only">
                {position && t('tourMap.live', position)}
              </p>
              <div className="-mt-2 flex flex-col gap-1.5 text-xs text-muted">
                <p>{t('tourMap.gestures')}</p>
                <p className="flex items-start gap-2 leading-relaxed">
                  <InfoIcon className="shrink-0" size={15} />
                  {t('tourMap.sample')}
                </p>
              </div>
              {active && position && (
                <SheetFrame
                  footer={<div ref={sheetNavRef} className="flex w-full gap-2">{sheetSteps}</div>}
                  isOpen={sheetOpen}
                  title={position.name}
                  onClose={() => setSheetOpen(false)}
                >
                  <Media
                    alt={position.name}
                    className="aspect-[16/10] w-full shrink-0 rounded-2xl"
                    photo={active.photo}
                  />
                  <div className="flex flex-col gap-2">
                    <p className="flex items-center gap-1.5 text-sm text-accent">
                      <ClockIcon size={16} />
                      {t('tourMap.stop', position)}
                      {' '}
                      ·
                      {' '}
                      {when(active.minutesFromStart)}
                    </p>
                    <p className="text-body">{text(active.description)}</p>
                  </div>
                  {active.note && (
                    <div className="flex gap-3 rounded-2xl bg-surface-secondary p-4 text-sm">
                      <InfoIcon className="mt-0.5 shrink-0" size={16} />
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold">{t('tourMap.note')}</p>
                        <p>{text(active.note)}</p>
                      </div>
                    </div>
                  )}
                  <p aria-live="polite" className="sr-only">
                    {t('tourMap.live', position)}
                  </p>
                </SheetFrame>
              )}
            </>
          )}
    </section>
  )
}
