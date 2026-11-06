import type { Language } from '@sk/domain/shared'

import { memo } from 'react'

import { ListingCard, sameListing } from '@/components/listing-card'
import { RowCard } from './row-card'
import { ShowcaseCard } from './showcase-card'

/** How a keepsake card looks: `classic` is one photo and the title, `showcase` the keepsake list's swipeable card, `row` the compact row of a detail page. */
export type ProductCardVariant = 'classic' | 'showcase' | 'row'

export interface ProductCardProps {
  /** Left out, the card is `classic`. */
  variant?: ProductCardVariant
  slug: string
  /** The language of the address, when it is not the guest's (a keepsake that has no version in the guest's language). */
  lang?: Language
  name: string
  photo?: string
  /** The photos of `showcase`, in order; `photo` alone is used when this is left out. */
  photos?: string[]
  /** The line under the name in `showcase` and `row`: the description's first paragraph. */
  subtitle?: string
  /** The store's name in the partner block of `showcase`. */
  storeName?: string
  /** "from" label, e.g. "from" / "ab". Left out with `price` on the public list, which shows no price. */
  fromLabel?: string
  price?: string
  /** e.g. "Earliest pickup Fri 16.10." Left out when the card has no such line. */
  pickupLine?: string
  /** Optional non-status label on the photo, e.g. "Engraving" (secondary Chip md, Card card). */
  badge?: string
  /** When set, the card shows this status label instead of the pickup line (spec C02). */
  soldOutLabel?: string
  /** Shown when the product text is only in the other language (R02), e.g. "In English". */
  languageNote?: string
  /** Average of verified-purchase reviews (spec §4.11); omitted when there are none. */
  rating?: { value: string, count: string, label: string }
  /** Heart on the photo (UX proposal: favourites are not in the PRD). */
  favourite?: { isSaved: boolean, onToggle: () => void, label: string }
  /** "carousel" fixes the width for horizontal rails; "grid" fills its cell. Only `classic` has a rail width. */
  layout?: 'carousel' | 'grid'
}

/** Keepsake card: one entry point, the look is the `variant` prop. */
export const ProductCard = memo(function ProductCard({
  variant = 'classic',
  pickupLine,
  soldOutLabel,
  subtitle,
  photos,
  storeName,
  ...props
}: ProductCardProps) {
  if (variant === 'showcase')
    return <ShowcaseCard {...props} photos={photos} soldOutLabel={soldOutLabel} storeName={storeName} subtitle={subtitle} />
  if (variant === 'row')
    return <RowCard {...props} photos={photos} soldOutLabel={soldOutLabel} subtitle={subtitle} />

  return (
    <ListingCard
      {...props}
      metadata={pickupLine}
      statusLabel={soldOutLabel}
      to="/$lang/gifts/$slug"
    />
  )
}, (prev, next) => {
  const { photos: prevPhotos, ...prevRest } = prev
  const { photos: nextPhotos, ...nextRest } = next

  // Card builders make the photos list anew on every render; the same addresses are the same card.
  return (prevPhotos?.join('\n') ?? '') === (nextPhotos?.join('\n') ?? '') && sameListing(prevRest, nextRest)
})
