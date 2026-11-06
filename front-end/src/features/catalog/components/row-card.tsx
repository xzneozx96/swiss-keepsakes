import type { ProductCardProps } from './product-card'

import { photosOf } from '../lib/card-photos'
import { CardLink, PhotoStrip, RoundArrow, SoldOutLabel } from './keepsake-card-parts'

/**
 * The compact row for detail pages (owner-approved lab option 4, 06.11.2026): a square photo tile on the left, the name and line, and
 * the red round arrow; a sold-out label when sold out. No store text. The tile is warm grey and the photo is multiplied onto
 * it, so the white of a cut-out takes the tile's colour. Too small to swipe, so only the first photo shows.
 */
export function RowCard({ slug, lang, name, subtitle, photos, photo, soldOutLabel, languageNote }: ProductCardProps) {
  return (
    <CardLink
      className="flex items-stretch gap-3.5 rounded-[22px] bg-surface p-2 shadow-surface"
      lang={lang}
      slug={slug}
    >
      <PhotoStrip
        blend
        className="size-[112px] shrink-0 rounded-2xl"
        ground="bg-card-tile"
        inset="p-2.5"
        photos={photosOf({ photos, photo })}
        swipe={false}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1.5 pe-1">
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-[17px] leading-[22px] font-bold tracking-[-0.02em] text-balance text-foreground">{name}</h3>
          {subtitle && <span className="line-clamp-2 text-[13px] leading-[18px] text-muted">{subtitle}</span>}
          {languageNote && <span className="text-xs text-muted">{languageNote}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          {soldOutLabel ? <SoldOutLabel>{soldOutLabel}</SoldOutLabel> : <span />}
          <RoundArrow size="sm" />
        </div>
      </div>
    </CardLink>
  )
}
