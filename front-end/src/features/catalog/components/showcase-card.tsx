import type { ProductCardProps } from './product-card'

import { useId } from 'react'

import { photosOf } from '../lib/card-photos'
import { CardLink, PartnerBlock, PhotoStrip, RoundArrow, SoldOutLabel } from './keepsake-card-parts'

const SERIF = 'font-serif font-semibold tracking-[-0.015em] text-balance text-foreground'

/**
 * The keepsake list's card (owner-approved lab option 2a, 06.11.2026): the photo leads with the partner block at its top left, then the
 * serif name and line with the red round arrow. A surface-coloured card with the app's surface shadow on the page background. Sold out looks disabled (the photo
 * grey and faded, the block and name muted, the arrow grey) but stays a link, since the keepsake page still opens; the
 * "Sold out" label is text inside the link, so screen readers hear it.
 */
export function ShowcaseCard({ slug, lang, name, subtitle, photos, photo, storeName, soldOutLabel, languageNote }: ProductCardProps) {
  const off = soldOutLabel !== undefined
  const nameId = useId()
  const soldOutId = useId()

  return (
    <CardLink
      className="rounded-[28px] bg-surface shadow-surface"
      labelledBy={off ? `${nameId} ${soldOutId}` : nameId}
      lang={lang}
      slug={slug}
    >
      <PhotoStrip
        className={`m-2 aspect-[4/3] rounded-[22px] ${off ? '[&_img]:opacity-40 [&_img]:grayscale' : ''}`}
        ground="bg-surface"
        inset="px-6 pt-16 pb-10"
        photos={photosOf({ photos, photo })}
      >
        <PartnerBlock off={off} storeName={storeName} />
        {off && (
          <span className="absolute end-3 top-4">
            <SoldOutLabel id={soldOutId}>{soldOutLabel}</SoldOutLabel>
          </span>
        )}
      </PhotoStrip>
      <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className={`${SERIF} text-[23px] leading-7 ${off ? 'text-muted' : ''}`} id={nameId}>{name}</h3>
          {subtitle && <span className="line-clamp-2 text-[14px] leading-5 text-muted">{subtitle}</span>}
          {languageNote && <span className="text-xs text-muted">{languageNote}</span>}
        </div>
        <RoundArrow off={off} />
      </div>
    </CardLink>
  )
}
