import type { CategoryIcon } from '@sk/api-contract'

import { useLocale } from '@/contexts/locale-context'
import { MapThumb } from './map-thumb'

import './map.css'

/**
 * The title above a pin, like a Google Maps result: small, one line, at most 140 px, on a light halo so it reads on aerial
 * photo and street styles. It is a picture of the pin's name (the pin's button already carries it as its label), takes no
 * pointer events, and the layer hides it at low zoom and where two labels would overlap (`pin-labels-off`, `data-label-hidden` in map.css).
 */
function PinLabel({ title }: { title?: string }) {
  if (!title)
    return null

  return (
    <span aria-hidden className="pin-label pointer-events-none absolute bottom-full left-1/2 mb-0.5 max-w-[140px] -translate-x-1/2 truncate rounded-md bg-white/85 px-1.5 py-px text-[11px] leading-4 font-semibold whitespace-nowrap text-[#1f1811] shadow-[0_1px_4px_rgb(31_24_17/0.25)]" data-pin-label>
      {title}
    </span>
  )
}

/** A round photo pin (the place icon on the lake blue without a photo). A pin the filter keeps is lit and, with a filter chosen, grows; a pin outside it is dimmed, never hidden. */
export function PhotoPin({ id, label, title, photoSrc, icon, selected, dimmed, emphasized, onPress }: {
  id: string
  label: string
  /** Written above the pin when the layer shows labels. */
  title?: string
  photoSrc?: string
  /** The category icon drawn where there is no photo. */
  icon?: CategoryIcon | null
  selected: boolean
  dimmed: boolean
  /** A category is chosen and this pin is in it. */
  emphasized: boolean
  onPress: () => void
}) {
  const size = selected ? 'size-14' : emphasized ? 'size-12' : 'size-10'

  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full outline-none transition-[opacity,filter] duration-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${dimmed ? 'opacity-40 saturate-0' : ''}`}
      data-lift={emphasized ? '' : undefined}
      data-pin-return={id}
      type="button"
      onClick={onPress}
    >
      <PinLabel title={title} />
      <MapThumb
        className={`rounded-full border-[3px] shadow-[0_4px_14px_rgb(31_24_17/0.35)] transition-[width,height] duration-200 motion-reduce:transition-none ${selected ? 'border-accent' : 'border-[#fffaf4]'} ${size}`}
        icon={icon}
        iconSize={selected ? 24 : 18}
        src={photoSrc}
      />
      {selected && <span aria-hidden className="-mt-1 size-2.5 rotate-45 bg-accent" />}
    </button>
  )
}

/** Close pins as two overlapping photos and the count. */
export function PhotoCluster({ count, dimmed, icons = [], onPress }: { count: number, dimmed: boolean, /** The icons of the first two pins, drawn on the two faces. */ icons?: (CategoryIcon | null)[], onPress: () => void }) {
  const { t } = useLocale()

  return (
    <button
      aria-label={t('map.cluster', { count })}
      className={`relative flex h-12 items-center outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${dimmed ? 'opacity-50 saturate-0' : ''}`}
      type="button"
      onClick={onPress}
    >
      {[0, 1].map(i => (
        <MapThumb
          key={i}
          className={`size-10 rounded-full border-[3px] border-[#fffaf4] shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${i > 0 ? '-ms-5' : ''}`}
          icon={icons[i]}
          iconSize={18}
        />
      ))}
      <span className="absolute -end-2 -top-1 flex min-w-6 items-center justify-center rounded-full bg-charcoal px-1.5 text-xs leading-6 font-bold text-white tabular-nums">
        {count}
      </span>
    </button>
  )
}

/** A route's numbered pin: white with the number, red when it is the selected stop. */
export function NumberedPin({ id, number, label, selected, onPress }: {
  id: string
  number: number
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <button aria-label={label} aria-pressed={selected} className="tour-map-marker" data-pin-return={id} type="button" onClick={onPress}>
      {number}
    </button>
  )
}

/** A teardrop that points at the exact spot (the place picker). Its tip is the pin's anchor: use it with `anchor="bottom"`. */
export function TeardropPin({ label, title, describedBy, onKeyDown }: {
  label: string
  title?: string
  describedBy?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      aria-describedby={describedBy}
      aria-label={label}
      className="relative flex size-11 cursor-grab items-end justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
      type="button"
      onKeyDown={onKeyDown}
    >
      <PinLabel title={title} />
      <span aria-hidden className="grid size-9 rotate-45 place-items-center rounded-full rounded-br-none bg-accent shadow-surface ring-2 ring-white">
        <span className="size-3 rounded-full bg-white" />
      </span>
    </button>
  )
}
