import type { PublicStoryCard } from '@sk/api-contract'

/** The photo a card shows: the 640 px copy when the cover has one (a card is at most about 400 px wide), else the largest copy, else the original. */
export function coverSrc(cover: PublicStoryCard['cover']) {
  if (!cover)
    return undefined

  return (cover.variants.find(v => v.width >= 640) ?? cover.variants.at(-1))?.url ?? cover.url
}
