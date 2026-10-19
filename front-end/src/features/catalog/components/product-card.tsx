import { memo } from 'react'

import { ListingCard, sameListing } from '@/components/listing-card'

export interface ProductCardProps {
  slug: string
  name: string
  photo?: string
  /** "from" label, e.g. "from" / "ab". */
  fromLabel: string
  price: string
  /** e.g. "Earliest pickup Fri 16.10." */
  pickupLine: string
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
  /** "carousel" fixes the width for horizontal rails; "grid" fills its cell. */
  layout?: 'carousel' | 'grid'
}

/** Gift adapter for the shared gift and tour card treatment. */
export const ProductCard = memo(function ProductCard({
  pickupLine,
  soldOutLabel,
  ...props
}: ProductCardProps) {
  return (
    <ListingCard
      {...props}
      metadata={pickupLine}
      statusLabel={soldOutLabel}
      to="/gifts/$slug"
    />
  )
}, sameListing)
