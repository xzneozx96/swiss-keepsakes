import type { Guest } from '@sk/domain/orders'

import { avatarUrl } from '@/lib/avatars'

/**
 * A stored photo as an image URL: "sample:anna-k" is a bundled avatar resolved here, so the
 * seed stays free of build-hashed asset URLs; anything else is an uploaded data URL.
 */
function photoSrc(avatar: string) {
  return avatar.startsWith('sample:') ? avatarUrl(avatar.slice(7)) : avatar
}

/**
 * The guest's round photo, or a sample avatar picked from their name when there is none. Decorative:
 * the name always sits next to it, so it carries no alt text.
 */
export function GuestAvatar({
  guest,
  photo = guest.avatar,
  className = 'size-12 text-base',
}: {
  guest: Pick<Guest, 'name' | 'avatar'>
  /** A draft photo to show instead of the saved one (Edit profile preview). */
  photo?: string
  /** Size. */
  className?: string
}) {
  const src = (photo && photoSrc(photo)) || avatarUrl(guest.name)

  return (
    <img
      alt=""
      className={`shrink-0 rounded-full bg-default object-cover ${className}`}
      decoding="async"
      src={src}
    />
  )
}
