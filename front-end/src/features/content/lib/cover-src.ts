import type { PublicStoryCard } from '@sk/api-contract'
import { pickVariant, widestVariant } from '@/lib/pick-variant'

/** The photo a card shows: the 640 px copy when the cover has one (a card is at most about 400 px wide), else the largest copy, else the original. */
export function coverSrc(cover: PublicStoryCard['cover']) {
  if (!cover)
    return undefined

  return (pickVariant(cover.variants, 640) ?? widestVariant(cover.variants))?.url ?? cover.url
}
