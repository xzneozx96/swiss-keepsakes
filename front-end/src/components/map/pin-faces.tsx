import { useLocale } from '@/contexts/locale-context'
import { MapThumb } from './map-thumb'

/** A round photo pin (the place icon on the lake blue without a photo). A pin the filter keeps is lit and, with a filter chosen, grows; a pin outside it is dimmed, never hidden. */
export function PhotoPin({ id, label, photoSrc, selected, dimmed, emphasized, onPress }: {
  id: string
  label: string
  photoSrc?: string
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
      <MapThumb
        className={`rounded-full border-[3px] shadow-[0_4px_14px_rgb(31_24_17/0.35)] transition-[width,height] duration-200 motion-reduce:transition-none ${selected ? 'border-accent' : 'border-[#fffaf4]'} ${size}`}
        iconSize={selected ? 24 : 18}
        src={photoSrc}
      />
      {selected && <span aria-hidden className="-mt-1 size-2.5 rotate-45 bg-accent" />}
    </button>
  )
}

/** Close pins as two overlapping photos and the count. */
export function PhotoCluster({ count, dimmed, onPress }: { count: number, dimmed: boolean, onPress: () => void }) {
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
          iconSize={18}
        />
      ))}
      <span className="absolute -end-2 -top-1 flex min-w-6 items-center justify-center rounded-full bg-charcoal px-1.5 text-xs leading-6 font-bold text-white tabular-nums">
        {count}
      </span>
    </button>
  )
}
