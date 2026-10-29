import type { PublicMapItem } from '@sk/api-contract'

import { PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { pinPhotoUrl } from '@/features/map/lib/pin-photo'

/** What a pin or card shows when its place has no photo: the place icon, white on the lake blue. */
function IconFace({ size }: { size: number }) {
  return (
    <span aria-hidden className="flex size-full items-center justify-center bg-[#173f52] text-white">
      <PickupIcon size={size} />
    </span>
  )
}

/** A pin's photo, or the place icon when it has none or its address is unknown. */
export function PinThumb({ photoKey, iconSize, className = '' }: { photoKey: string | null, iconSize: number, className?: string }) {
  const url = pinPhotoUrl(photoKey)

  return (
    <span className={`relative block overflow-hidden bg-[#173f52] ${className}`}>
      {url
        ? <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={url} />
        : <IconFace size={iconSize} />}
    </span>
  )
}

/** A pin the filter keeps is lit; with a filter chosen it also grows. A pin outside the filter is dimmed, never hidden. */
export interface PinLook {
  selected: boolean
  lit: boolean
  filtered: boolean
}

export function PhotoPin({
  pin,
  look,
  label,
  onSelect,
}: {
  pin: PublicMapItem
  look: PinLook
  label: string
  onSelect: (id: string) => void
}) {
  const dimmed = !look.lit
  const emphasized = look.filtered && look.lit
  const size = look.selected ? 'size-14' : emphasized ? 'size-12' : 'size-10'

  return (
    <button
      aria-label={label}
      aria-pressed={look.selected}
      className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full outline-none transition-[opacity,filter] duration-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${dimmed ? 'opacity-40 saturate-0' : ''}`}
      data-lift={emphasized ? '' : undefined}
      data-pin-return={pin.id}
      type="button"
      onClick={() => onSelect(pin.id)}
    >
      <PinThumb
        className={`rounded-full border-[3px] shadow-[0_4px_14px_rgb(31_24_17/0.35)] transition-[width,height] duration-200 motion-reduce:transition-none ${look.selected ? 'border-accent' : 'border-[#fffaf4]'} ${size}`}
        iconSize={look.selected ? 24 : 18}
        photoKey={pin.photoKey}
      />
      {look.selected && <span aria-hidden className="-mt-1 size-2.5 rotate-45 bg-accent" />}
    </button>
  )
}

export function PhotoCluster({
  members,
  lit,
  zoomIn,
}: {
  members: PublicMapItem[]
  lit: boolean
  zoomIn: () => void
}) {
  const { t } = useLocale()

  return (
    <button
      aria-label={t('map.cluster', { count: members.length })}
      className={`relative flex h-12 items-center outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${lit ? '' : 'opacity-50 saturate-0'}`}
      type="button"
      onClick={zoomIn}
    >
      {members.slice(0, 2).map((member, i) => (
        <PinThumb
          key={member.id}
          className={`size-10 rounded-full border-[3px] border-[#fffaf4] shadow-[0_4px_14px_rgb(31_24_17/0.3)] ${i > 0 ? '-ms-5' : ''}`}
          iconSize={18}
          photoKey={member.photoKey}
        />
      ))}
      <span className="absolute -end-2 -top-1 flex min-w-6 items-center justify-center rounded-full bg-charcoal px-1.5 text-xs leading-6 font-bold text-white tabular-nums">
        {members.length}
      </span>
    </button>
  )
}
