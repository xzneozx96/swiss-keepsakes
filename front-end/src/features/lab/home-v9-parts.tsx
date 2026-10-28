/**
 * Lab, home V9: the small parts its sections share (section heading, language tag)
 * and the points map, the Map tab stand-in filtered to a few places (a service, or the events).
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'
import type { LngLat } from '@/features/lab/map-guest-data'

import { ChevronRightIcon } from '@/components/icons'
import { copy } from '@/features/lab/home-data'
import { CoverScreen } from '@/features/lab/home-kit'
import { v9Copy } from '@/features/lab/home-v9-data'
import { googleMapsUrl } from '@/features/lab/map-guest-data'

export function SectionHead({ id, title, body, home, aside }: {
  id: string
  title: string
  /** One inviting sentence under the title. */
  body?: string
  home: HomeModel
  /** Something that belongs to the heading, under the line (the sort chip). */
  aside?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 px-4">
      <h2 className="font-serif text-[22px] leading-7 font-medium text-balance outline-none" id={home.headingId(id)} tabIndex={-1}>{title}</h2>
      {body && <p className="text-sm text-muted text-pretty">{body}</p>}
      {aside}
    </div>
  )
}

export function OnlyIn({ lang, language }: { lang: Language, language: Language }) {
  return (
    <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">
      {copy[language].onlyIn[lang]}
    </span>
  )
}

// ---------------------------------------------------------------- points map

const TILE_URL = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857'
/** Positions are in zoom-16 world pixels; tiles come from zoom 16, or 15 when the map is zoomed out. */
const WORLD = 256 * 2 ** 16

function toWorld([lng, lat]: LngLat) {
  const sin = Math.sin(lat * Math.PI / 180)

  return { x: (lng + 180) / 360 * WORLD, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD }
}

/** The swisstopo aerial fitted to a few points, numbered like the list under it. Only those points show. */
export function PointsMap({ points, width, height, minScale = 0.35, className = '' }: {
  points: LngLat[]
  width: number
  height: number
  /** How far the map may zoom out to fit every point. */
  minScale?: number
  className?: string
}) {
  const world = points.map(toWorld)
  const xs = world.map(p => p.x)
  const ys = world.map(p => p.y)
  const span = { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) }
  const scale = Math.max(minScale, Math.min(1, (width - 96) / (span.x || 1), (height - 96) / (span.y || 1)))
  const zoom = scale < 0.5 ? 15 : 16
  const tile = 256 * 2 ** (16 - zoom)
  const left = (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2 / scale
  const top = (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2 / scale
  const tiles: { x: number, y: number }[] = []

  for (let x = Math.floor(left / tile); x <= Math.floor((left + width / scale) / tile); x++) {
    for (let y = Math.floor(top / tile); y <= Math.floor((top + height / scale) / tile); y++)
      tiles.push({ x, y })
  }

  return (
    <div aria-hidden className={`relative overflow-hidden bg-charcoal ${className}`} style={{ width, height }}>
      {tiles.map(t => (
        <img
          key={`${t.x}-${t.y}`}
          alt=""
          className="absolute max-w-none"
          decoding="async"
          src={`${TILE_URL}/${zoom}/${t.x}/${t.y}.jpeg`}
          style={{ left: (t.x * tile - left) * scale, top: (t.y * tile - top) * scale, width: tile * scale, height: tile * scale }}
        />
      ))}
      {world.map((p, index) => (
        <span
          // The points are fixed and numbered by position.

          key={index}
          className="absolute flex size-8 -translate-1/2 items-center justify-center rounded-full border-[3px] border-surface bg-accent text-[13px] font-bold text-accent-foreground tabular-nums shadow-[0_4px_14px_rgb(31_24_17/0.35)]"
          style={{ left: (p.x - left) * scale, top: (p.y - top) * scale }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  )
}

export interface MapPoint {
  id: string
  title: string
  note: string
  coordinates: LngLat
}

/** Stand-in for the Map tab filtered to a few places: only those, numbered, with directions out. */
export function PointsScreen({ title, points, home, language, onBack }: {
  title: string
  points: MapPoint[]
  home: HomeModel
  language: Language
  onBack: () => void
}) {
  const c = v9Copy[language]

  return (
    <CoverScreen language={language} title={title} onBack={onBack}>
      <PointsMap height={330} points={points.map(p => p.coordinates)} width={375} />
      <p className="px-4 pt-3 text-label text-muted">{c.serviceMapHint}</p>
      <ol className="flex flex-col divide-y divide-separator px-4">
        {points.map((point, index) => (
          <li key={point.id}>
            <button
              className="flex min-h-16 w-full items-center gap-3 py-2.5 text-start outline-none focus-visible:focus-ring active:opacity-70"
              type="button"
              onClick={() => home.open(googleMapsUrl(point.coordinates))}
            >
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground tabular-nums">{index + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-5 font-semibold">{point.title}</span>
                <span className="text-label text-muted">{point.note}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-accent">
                {c.directions}
                <ChevronRightIcon size={16} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </CoverScreen>
  )
}
