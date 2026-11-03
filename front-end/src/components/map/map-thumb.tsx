import { PickupIcon } from '@/components/icons'

/**
 * The picture slot of a pin, a card or a list row: the place icon, white on the lake blue, with the photo over it when
 * there is one, so a slot is never empty. A pin's photo address is `photoUrl` of the public map list (the smallest
 * copy of its cover); the place editor's preview passes the draft's cover as `src`.
 */
export function MapThumb({ iconSize, className = '', src }: { iconSize: number, className?: string, src?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-[#173f52] ${className}`}>
      <span aria-hidden className="flex size-full items-center justify-center bg-[#173f52] text-white">
        <PickupIcon size={iconSize} />
      </span>
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={src} />}
    </span>
  )
}
