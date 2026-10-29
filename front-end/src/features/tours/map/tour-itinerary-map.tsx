import type { Tour } from '@sk/domain/bookings'
import type { Marker } from 'maplibre-gl'

import { Button, Skeleton, Spinner, ToggleButton } from '@heroui/react'
import { pickText } from '@sk/domain/shared'

import { useEffect, useRef, useState } from 'react'

import { useAerialMap } from '@/components/aerial-map/use-aerial-map'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  DirectionsIcon,
  ExploreIcon,
  InfoIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'
import { warmAerialTiles } from './aerial-style'

import './tour-itinerary-map.css'

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * C09 itinerary (owner reference: Wanderlog). The selected stop shows as a card inside the
 * map, so the guest never scrolls between map and stop; "View more" opens the full stop in
 * a sheet. Pins, card and sheet share one selection; the first and last stop end the
 * previous/next steps (a walking route has a start and a finish).
 */
export function TourItineraryMap({ tour }: { tour: Tour }) {
  const { t, language } = useLocale()
  const stops = tour.itinerary
  const frameRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const cardNavRef = useRef<HTMLDivElement>(null)
  const sheetNavRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const markersRef = useRef<Marker[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(
    stops[0]?.id ?? null,
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [threeD, setThreeD] = useState(true)
  const [tilesLoading, setTilesLoading] = useState(false)
  const index = stops.findIndex(stop => stop.id === selectedId)
  const active = index >= 0 ? stops[index] : undefined
  const translationsRef = useLatest({ t, language })
  const first = stops[0]
  // The tour route map stays 3D (`terrain`) until E4.12 draws it flat like the guest map.
  const {
    containerRef: canvasRef,
    map,
    maplibre,
    state: mapState,
    retry,
  } = useAerialMap({
    terrain: true,
    lazy: true,
    resetKey: stops,
    options: {
      center: first?.coordinates,
      zoom: 16.2,
      pitch: 55,
      bearing: -25,
      maxPitch: 65,
      cooperativeGestures: true,
      attributionControl: { compact: true },
      locale: {
        'NavigationControl.ZoomIn': t('tourMap.zoomIn'),
        'NavigationControl.ZoomOut': t('tourMap.zoomOut'),
        'NavigationControl.ResetBearing': t('tourMap.compass'),
        'FullscreenControl.Enter': t('tourMap.fullscreen'),
        'FullscreenControl.Exit': t('tourMap.exitFullscreen'),
        'CooperativeGesturesHandler.WindowsHelpText': t('tourMap.wheel'),
        'CooperativeGesturesHandler.MacHelpText': t('tourMap.wheelMac'),
        'CooperativeGesturesHandler.MobileHelpText': t('tourMap.touch'),
      },
    },
  })
  const text = (value: Tour['name']) => pickText(value, language).text
  const when = (minutes: number) =>
    minutes === 0 ? t('tourMap.start') : t('tourMap.minute', { minutes })
  // Keep the selected pin clear of the controls above and the card below it.
  const padding = () => ({
    top: 72,
    right: 64,
    bottom: (cardRef.current?.offsetHeight ?? 0) + 52,
    left: 24,
  })

  // The map's controls and one numbered pin per stop, once the shared map exists.
  useEffect(() => {
    const frame = frameRef.current

    if (!map || !maplibre || !frame)
      return
    const copy = translationsRef.current.t
    // Fullscreen takes the whole frame, so the stop card and buttons come along. Pseudo
    // (CSS) fullscreen keeps the stop sheet visible above it and also works on iPhone.
    const fullscreenControl = new maplibre.FullscreenControl({
      container: frame,
      pseudo: true,
    })

    fullscreenControl.on('fullscreenstart', () => setFullscreen(true))
    fullscreenControl.on('fullscreenend', () => setFullscreen(false))
    map.addControl(fullscreenControl, 'top-right')
    map.addControl(
      new maplibre.NavigationControl({ visualizePitch: true }),
      'top-right',
    )
    map.getCanvas().setAttribute('aria-label', copy('tourMap.mapLabel'))
    markersRef.current = stops.map((stop, index) => {
      const button = document.createElement('button')

      button.type = 'button'
      button.className = 'tour-map-marker'
      button.textContent = String(index + 1)
      button.setAttribute(
        'aria-label',
        `${copy('tourMap.stop', { number: index + 1 })}: ${pickText(stop.name, translationsRef.current.language).text}`,
      )
      button.setAttribute('aria-pressed', String(index === 0))
      // eslint-disable-next-line react-web-api/no-leaked-event-listener -- each marker button is discarded with its marker when the map is removed
      button.addEventListener('click', () => setSelectedId(stop.id))

      return new maplibre.Marker({ element: button, anchor: 'center' })
        .setLngLat(stop.coordinates)
        .addTo(map)
    })

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [map, maplibre, stops, translationsRef])

  // The route line, once the style has loaded.
  useEffect(() => {
    if (!map || mapState !== 'ready')
      return
    map.addSource('tour-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: stops.map(stop => stop.coordinates),
        },
      },
    })
    map.addLayer({
      id: 'tour-route-halo',
      type: 'line',
      source: 'tour-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#fffaf4',
        'line-width': 8,
        'line-opacity': 0.9,
      },
    })
    map.addLayer({
      id: 'tour-route-line',
      type: 'line',
      source: 'tour-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#d52b1e',
        'line-width': 4,
        'line-dasharray': [2, 1],
      },
    })
  }, [map, mapState, stops])

  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const stop = tour.itinerary[index]

      if (!stop)
        return
      const button = marker.getElement()

      button.setAttribute('aria-pressed', String(stop.id === active?.id))
      button.setAttribute(
        'aria-label',
        `${t('tourMap.stop', { number: index + 1 })}: ${pickText(stop.name, language).text}`,
      )
    })
    const camera = {
      pitch: threeD ? 55 : 0,
      bearing: threeD ? -25 : 0,
      duration: reducedMotion() ? 0 : 950,
    }

    let cancelled = false
    let veilTimer: ReturnType<typeof setTimeout> | undefined

    if (map && mapState === 'ready') {
      if (active) {
        // An offset, not flyTo padding: MapLibre keeps flyTo padding on the map and adds it
        // to fitBounds padding, which zoomed "Whole route" out to the whole country.
        const { top, right, bottom, left } = padding()

        // Load the stop's tiles first and only then fly, so the map never lands on a blank
        // area; the pill shows only if that takes noticeable time.
        veilTimer = setTimeout(setTilesLoading, 250, true)
        void warmAerialTiles(active.coordinates, 5000).then(() => {
          clearTimeout(veilTimer)
          if (cancelled)
            return
          setTilesLoading(false)
          map.flyTo({
            ...camera,
            center: active.coordinates,
            zoom: 16.2,
            offset: [(left - right) / 2, (top - bottom) / 2],
          })
        })
      }
      else {
        map.easeTo(camera)
      }
    }

    return () => {
      cancelled = true
      clearTimeout(veilTimer)
      setTilesLoading(false)
    }
  }, [active, language, t, threeD, map, mapState, fullscreen, tour.itinerary])

  // MapLibre writes its own (creation-time) labels when fullscreen toggles; put ours back.
  useEffect(() => {
    const container = canvasRef.current
    const labels = [
      t('tourMap.zoomIn'),
      t('tourMap.zoomOut'),
      t('tourMap.compass'),
    ]

    container
      ?.querySelectorAll(
        '.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out, .maplibregl-ctrl-compass',
      )
      .forEach((button, index) => {
        button.setAttribute('aria-label', labels[index])
        button.setAttribute('title', labels[index])
      })
    const toggle = container?.querySelector(
      '.maplibregl-ctrl-fullscreen, .maplibregl-ctrl-shrink',
    )

    if (toggle) {
      const label = t(
        fullscreen ? 'tourMap.exitFullscreen' : 'tourMap.fullscreen',
      )

      toggle.setAttribute('aria-label', label)
      toggle.setAttribute('title', label)
    }
    map
      ?.getCanvas()
      .setAttribute('aria-label', t('tourMap.mapLabel'))
  }, [canvasRef, language, t, map, mapState, fullscreen])

  // CSS fullscreen has no browser Escape; match native fullscreen (the sheet handles its own).
  useEffect(() => {
    if (!fullscreen || sheetOpen)
      return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        canvasRef.current
          ?.querySelector<HTMLButtonElement>('.maplibregl-ctrl-shrink')
          ?.click()
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [canvasRef, fullscreen, sheetOpen])

  function overview() {
    if (!map || !maplibre)
      return
    const bounds = new maplibre.LngLatBounds()

    tour.itinerary.forEach(stop => bounds.extend(stop.coordinates))
    map.fitBounds(bounds, {
      padding: padding(),
      maxZoom: 16.2,
      pitch: threeD ? 45 : 0,
      bearing: threeD ? -25 : 0,
      duration: reducedMotion() ? 0 : 1000,
    })
  }

  function step(delta: 1 | -1, nav: HTMLDivElement | null) {
    const target = stops[index + delta]

    if (!target)
      return
    setSelectedId(target.id)
    // On the first or last stop the pressed button is disabled; keep focus on the other one.
    if (index + delta === 0 || index + delta === stops.length - 1) {
      requestAnimationFrame(() =>
        nav
          ?.querySelector<HTMLButtonElement>(
            `[data-step="${delta > 0 ? 'previous' : 'next'}"]`,
          )
          ?.focus(),
      )
    }
  }

  function closeCard() {
    const pin = markersRef.current[index]?.getElement()

    setSelectedId(null)
    if (pin)
      pin.focus()
    else headingRef.current?.focus()
  }

  const position = active
    ? { number: index + 1, count: stops.length, name: text(active.name) }
    : null
  const stepButtons = (
    nav: React.RefObject<HTMLDivElement | null>,
    wide: boolean,
  ) => (
    <>
      <Button
        aria-label={wide ? undefined : t('tourMap.previous')}
        className={wide ? 'min-w-0 flex-1' : undefined}
        data-step="previous"
        isDisabled={index <= 0}
        isIconOnly={!wide}
        variant="tertiary"
        onPress={() => step(-1, nav.current)}
      >
        <ChevronLeftIcon size={18} />
        {wide && t('tourMap.previous')}
      </Button>
      {!wide && position && (
        <span className="min-w-14 text-center text-xs text-muted tabular-nums">
          {t('tourMap.position', position)}
        </span>
      )}
      <Button
        aria-label={wide ? undefined : t('tourMap.next')}
        className={wide ? 'min-w-0 flex-1' : undefined}
        data-step="next"
        isDisabled={index < 0 || index >= stops.length - 1}
        isIconOnly={!wide}
        variant="tertiary"
        onPress={() => step(1, nav.current)}
      >
        {wide && t('tourMap.next')}
        <ChevronRightIcon size={18} />
      </Button>
    </>
  )

  return (
    <section
      aria-labelledby={`itinerary-${tour.id}`}
      className="tour-itinerary flex flex-col gap-5"
    >
      <div>
        <h2
          ref={headingRef}
          className="font-serif text-2xl text-balance outline-none"
          id={`itinerary-${tour.id}`}
          tabIndex={-1}
        >
          {t('tourMap.title')}
        </h2>
        <p className="mt-2 text-muted">{t('tourMap.subtitle')}</p>
      </div>
      {stops.length === 0
        ? (
            <p className="text-muted">{t('tourMap.empty')}</p>
          )
        : (
            <>
              <div
                ref={frameRef}
                className="tour-map-frame relative overflow-hidden rounded-3xl bg-surface-secondary"
              >
                {/* MapLibre makes its container `position: relative` (unlayered CSS), so it sits in a sized box. */}
                <div className="tour-map-canvas">
                  <div ref={canvasRef} className="size-full" />
                </div>
                <div className="absolute start-3 top-3 flex flex-wrap gap-2">
                  <Button
                    className="pill min-h-11 shadow-sm"
                    isDisabled={mapState !== 'ready'}
                    size="sm"
                    variant="secondary"
                    onPress={overview}
                  >
                    <DirectionsIcon size={17} />
                    {t('tourMap.overview')}
                  </Button>
                  <ToggleButton
                    className="pill min-h-11 shadow-sm"
                    isDisabled={mapState !== 'ready'}
                    isSelected={threeD}
                    size="sm"
                    onChange={setThreeD}
                  >
                    <ExploreIcon size={17} />
                    {t(threeD ? 'tourMap.view3d' : 'tourMap.view2d')}
                  </ToggleButton>
                </div>
                {mapState === 'loading' && (
                  <div
                    className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 bg-surface-secondary pb-40"
                    role="status"
                  >
                    <Skeleton className="h-10 w-40 rounded-xl" />
                    <span className="text-sm text-muted">
                      {t('tourMap.loading')}
                    </span>
                  </div>
                )}
                {mapState === 'ready' && tilesLoading && position && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-[28%] z-[5] flex justify-center px-6"
                    role="status"
                  >
                    <span className="flex min-h-11 items-center gap-2.5 rounded-full bg-surface py-1.5 ps-2 pe-4 text-sm shadow-sm">
                      <span className="flex size-8 items-center justify-center">
                        <Spinner size="sm" />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-xs text-muted">
                          {t('tourMap.heading')}
                        </span>
                        <span className="font-medium">{position.name}</span>
                      </span>
                    </span>
                  </div>
                )}
                {mapState === 'error' && (
                  <div
                    className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 bg-surface-secondary p-8 pb-48 text-center"
                    role="status"
                  >
                    <InfoIcon size={28} />
                    <p className="max-w-80">{t('tourMap.unavailable')}</p>
                    <Button
                      variant="secondary"
                      onPress={retry}
                    >
                      {t('tourMap.retry')}
                    </Button>
                  </div>
                )}
                {active && position && (
                  <div
                    ref={cardRef}
                    aria-labelledby={`stop-card-${tour.id}`}
                    className="tour-map-card absolute inset-x-3 z-10"
                    role="group"
                  >
                    <Button
                      isIconOnly
                      aria-label={t('tourMap.closeCard')}
                      className="absolute end-0 bottom-full mb-2 size-9 min-w-9 rounded-full bg-surface text-foreground shadow-overlay"
                      size="sm"
                      variant="tertiary"
                      onPress={closeCard}
                    >
                      <CloseIcon size={18} />
                    </Button>
                    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-overlay">
                      <div className="flex gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="text-xs text-muted">
                            {t('tourMap.stop', position)} ·{' '}
                            {when(active.minutesFromStart)}
                          </p>
                          <h3
                            className="truncate font-serif text-card-title font-semibold"
                            id={`stop-card-${tour.id}`}
                          >
                            {position.name}
                          </h3>
                          <p className="line-clamp-2 text-sm text-muted">
                            {text(active.description)}
                          </p>
                        </div>
                        <Media
                          alt=""
                          className="size-[76px] shrink-0 rounded-xl"
                          photo={active.photo}
                        />
                      </div>
                      <div ref={cardNavRef} className="flex items-center gap-1">
                        {stepButtons(cardNavRef, false)}
                        <span className="flex-1" />
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => setSheetOpen(true)}
                        >
                          {t('tourMap.viewMore')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                  footer={(
                    <div ref={sheetNavRef} className="flex w-full gap-2">
                      {stepButtons(sheetNavRef, true)}
                    </div>
                  )}
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
