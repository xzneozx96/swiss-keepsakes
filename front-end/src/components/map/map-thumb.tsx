import type { CategoryIcon } from '@sk/api-contract'

import { PinIconFace } from './pin-icon-face'

/**
 * The picture slot of a pin, a card or a list row: the place icon, white on the lake blue, with the photo over it when
 * there is one, so a slot is never empty. A pin's photo address is `photoUrl` of the public map list (the smallest
 * copy of its cover); the place editor's preview passes the draft's cover as `src`.
 */
export function MapThumb({ iconSize, icon, className = '', src }: { iconSize: number, icon?: CategoryIcon | null, className?: string, src?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-[#173f52] ${className}`}>
      <PinIconFace icon={icon} size={iconSize} />
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={src} />}
    </span>
  )
}
