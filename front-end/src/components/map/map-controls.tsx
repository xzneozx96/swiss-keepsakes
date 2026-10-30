import type { ComponentType, ReactNode } from 'react'

import { Button, Tooltip } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { ExitFullscreenIcon, FullscreenIcon, MinusIcon, PlusIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMap } from './map-context'
import { reducedMotion } from './reduced-motion'

/** Danger tone through the button's own variables, so hover and pressed keep HeroUI's states. */
const DANGER = '[--button-fg:var(--danger)] [--button-bg-hover:var(--danger-soft-hover)] [--button-bg-pressed:var(--danger-soft-hover)]'
/** A translucent surface that lets the photo show through, as on Apple and Google web maps. */
const SURFACE = 'bg-overlay/85 shadow-overlay backdrop-blur-md'
/** The hit area: the 32 px button gets 6 px on every side, so a thumb finds it (44 px). */
const HIT_AREA = 'relative size-8 min-h-8 min-w-8 p-0 before:absolute before:-inset-1.5 before:content-[\'\']'

/**
 * One small icon button of a map control (32 px, a 44 px hit area): a tooltip and an `aria-label` with the same
 * words, and the destructive look for what removes something: a danger icon, and the `danger-soft` button's
 * background on hover and press. Alone it is a round button; in a `MapControlPill` it is one of its parts.
 */
export function MapControlButton({ icon: Icon, label, tone, isDisabled, isPressed, round = true, iconRef, onPress }: {
  icon: ComponentType<{ 'size'?: number | string, 'aria-hidden'?: boolean | 'true' | 'false' }>
  label: string
  tone?: 'danger'
  isDisabled?: boolean
  /** The state of a switch (fullscreen on). */
  isPressed?: boolean
  /** A round button of its own; false for a part of a pill. */
  round?: boolean
  iconRef?: React.Ref<HTMLSpanElement>
  onPress: () => void
}) {
  const button = (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={label}
        aria-pressed={isPressed}
        className={`${HIT_AREA} ${round ? 'rounded-full' : 'rounded-none'} ${tone === 'danger' ? DANGER : ''}`}
        isDisabled={isDisabled}
        size="sm"
        variant="ghost"
        onPress={onPress}
      >
        <span ref={iconRef} aria-hidden className="flex">
          <Icon aria-hidden size={18} />
        </span>
      </Button>
      <Tooltip.Content placement="left">
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  )

  return round ? <span className={`pointer-events-auto rounded-full ${SURFACE}`}>{button}</span> : button
}

/**
 * Buttons stacked in one small pill (zoom in over zoom out): 32 px wide, a hairline between them, the corners
 * rounded 12 px (the tour map's look). Not clipped, so the buttons' hit areas reach past the pill.
 */
export function MapControlPill({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div
      aria-label={label}
      className={`pointer-events-auto flex w-8 flex-col rounded-xl [&>*]:rounded-none [&>*+*]:border-t [&>*+*]:border-separator [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl ${SURFACE}`}
      role="group"
    >
      {children}
    </div>
  )
}

/** A needle that points north: red to the north, grey to the south. It turns against the map's bearing. */
function NorthNeedle({ size }: { size: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 18 18" width={size}>
      <path d="M9 1.5 12.2 9H5.8L9 1.5Z" fill="#d52b1e" />
      <path d="M9 16.5 5.8 9h6.4L9 16.5Z" fill="currentColor" opacity=".4" />
    </svg>
  )
}

const NeedleIcon = ({ size }: { size?: number | string }) => <NorthNeedle size={Number(size ?? 18)} />

function Compass() {
  const { t } = useLocale()
  const { map } = useMap()
  const needleRef = useRef<HTMLSpanElement>(null)

  // The needle turns by a ref, never by state: the bearing changes every frame of a turn (AGENTS.md rule 3).
  useEffect(() => {
    if (!map)
      return
    const turn = () => {
      needleRef.current?.style.setProperty('transform', `rotate(${-map.getBearing()}deg)`)
    }

    turn()
    map.on('rotate', turn)

    return () => {
      map.off('rotate', turn)
    }
  }, [map])

  return <MapControlButton icon={NeedleIcon} iconRef={needleRef} label={t('map.compass')} onPress={() => map?.resetNorthPitch({ duration: reducedMotion() ? 0 : 400 })} />
}

function ZoomPill() {
  const { t } = useLocale()
  const { map } = useMap()
  const [limits, setLimits] = useState({ atMin: false, atMax: false })

  useEffect(() => {
    if (!map)
      return
    // At the end of a zoom, not per frame.
    const check = () => setLimits({ atMin: map.getZoom() <= map.getMinZoom(), atMax: map.getZoom() >= map.getMaxZoom() })

    map.on('zoomend', check)

    return () => {
      map.off('zoomend', check)
    }
  }, [map])

  const options = () => ({ duration: reducedMotion() ? 0 : 300 })

  return (
    <MapControlPill label={t('map.zoom')}>
      <MapControlButton icon={PlusIcon} isDisabled={limits.atMax} label={t('map.zoomIn')} round={false} onPress={() => map?.zoomIn(options())} />
      <MapControlButton icon={MinusIcon} isDisabled={limits.atMin} label={t('map.zoomOut')} round={false} onPress={() => map?.zoomOut(options())} />
    </MapControlPill>
  )
}

/**
 * The map's controls over its top right, compact like Apple and Google web maps: zoom in and out in one small pill,
 * then a round button each for the compass and fullscreen, 8 px apart. They show once the map has drawn. The compass
 * shows only where the bearing can change (`'auto'` = the 3D map; a flat map cannot rotate, so a compass would do
 * nothing). `children` are further round `MapControlButton`s. `top` is the space above the first one (px); by
 * default 8 px under the screen's own controls (`insets.top`).
 */
export function MapControls({ zoom = true, fullscreen = false, compass = 'auto', top, children }: {
  zoom?: boolean
  fullscreen?: boolean
  compass?: boolean | 'auto'
  top?: number
  children?: ReactNode
}) {
  const { t } = useLocale()
  const { map, drawn, mode, insets, fullscreen: isFullscreen, setFullscreen } = useMap()

  if (!map || !drawn)
    return null
  const showCompass = compass === 'auto' ? mode === '3d' : compass

  return (
    <div className="pointer-events-none absolute end-3 z-10 flex flex-col items-center gap-2" style={{ top: top ?? insets.top + 8 }}>
      {fullscreen && (
        <MapControlButton
          icon={isFullscreen ? ExitFullscreenIcon : FullscreenIcon}
          isPressed={isFullscreen}
          label={t(isFullscreen ? 'map.exitFullscreen' : 'map.fullscreen')}
          onPress={() => setFullscreen(!isFullscreen)}
        />
      )}
      {zoom && <ZoomPill />}
      {showCompass && <Compass />}
      {children}
    </div>
  )
}

/**
 * A corner of the map for the screen's own pills ("Whole route", "Drop a pin"). The box leaves the map under it to
 * the pointer, so give each pill its own `pointer-events-auto`.
 */
export function MapCorner({ corner, children }: { corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', children: ReactNode }) {
  const place = {
    'top-left': 'start-3 top-3 items-start',
    'top-right': 'end-3 top-3 items-end',
    'bottom-left': 'start-3 bottom-3 items-start',
    'bottom-right': 'end-3 bottom-3 items-end',
  }[corner]

  return <div className={`pointer-events-none absolute z-10 flex flex-wrap gap-2 ${place}`}>{children}</div>
}
