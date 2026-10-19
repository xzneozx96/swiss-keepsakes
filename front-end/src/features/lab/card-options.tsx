/**
 * Lab: candidate layouts for the shared gift card, compared on #/lab/cards.
 * Option D was chosen (13.10.2026) and lives in features/catalog/components/product-card.tsx;
 * the others stay here for later UI experiments. Not part of the product.
 */
import { Card, Chip } from '@heroui/react'

import { ClockIcon } from '@/components/icons'
import { Media } from '@/components/media'

export interface CardOptionProps {
  name: string
  photo?: string
  fromLabel: string
  price: string
  /** Short pickup line, e.g. "Earliest pickup Wed 14.10." */
  pickupLine: string
  badge?: string
}

function Badge({ label }: { label?: string }) {
  if (!label)
    return null

  return (
    <Chip className="absolute start-2.5 top-2.5" size="md" variant="secondary">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  )
}

/** A · Borderless (Airbnb): square photo, text straight on the page, tight lines. */
export function OptionBorderless({
  name,
  photo,
  fromLabel,
  price,
  pickupLine,
  badge,
}: CardOptionProps) {
  return (
    <div className="flex w-52 flex-col gap-2.5">
      <Media alt="" className="aspect-square rounded-3xl" photo={photo}>
        <Badge label={badge} />
      </Media>
      <div className="flex flex-col gap-0.5 px-0.5">
        <h3 className="font-serif text-card-title">{name}</h3>
        <p className="text-sm">
          <span className="text-muted">
            {fromLabel}
            {' '}
          </span>
          <span className="font-semibold tabular-nums">{price}</span>
        </p>
        <p className="text-label text-muted">{pickupLine}</p>
      </div>
    </div>
  )
}

/** B · Photo overlay: tall photo, name and price on an ink scrim, like the tour cards. */
export function OptionOverlay({
  name,
  photo,
  fromLabel,
  price,
  pickupLine,
  badge,
}: CardOptionProps) {
  return (
    <Media alt="" className="aspect-[4/5] w-52 rounded-3xl" photo={photo}>
      <Badge label={badge} />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white">
        <h3 className="font-serif text-card-title">{name}</h3>
        <p className="text-sm">
          <span className="text-white/80">
            {fromLabel}
            {' '}
          </span>
          <span className="font-semibold tabular-nums">{price}</span>
        </p>
        <p className="text-label text-white/80">{pickupLine}</p>
      </div>
    </Media>
  )
}

/** C · Compact surface card: price and pickup in one block, clock icon. */
export function OptionCompact({
  name,
  photo,
  fromLabel,
  price,
  pickupLine,
  badge,
}: CardOptionProps) {
  return (
    <Card className="w-56 gap-3 p-2">
      <Media alt="" className="aspect-[4/3] rounded-2xl" photo={photo}>
        <Badge label={badge} />
      </Media>
      <div className="flex flex-col gap-1.5 px-2 pb-2">
        <h3 className="font-serif text-card-title">{name}</h3>
        <p className="text-sm">
          <span className="text-muted">
            {fromLabel}
            {' '}
          </span>
          <span className="text-base font-semibold tabular-nums">{price}</span>
        </p>
        <p className="flex items-center gap-1.5 text-label text-muted">
          <ClockIcon size={14} />
          {pickupLine}
        </p>
      </div>
    </Card>
  )
}

/** D · Price on the photo (chosen): borderless, a price pill on the image, name and pickup below. */
export function OptionPricePill({
  name,
  photo,
  fromLabel,
  price,
  pickupLine,
  badge,
}: CardOptionProps) {
  return (
    <div className="flex w-56 flex-col gap-2.5">
      <Media alt="" className="aspect-[4/3] rounded-3xl" photo={photo}>
        <Badge label={badge} />
        <span className="absolute start-2.5 bottom-2.5 rounded-full bg-surface/95 px-3 py-1 text-sm shadow-surface">
          <span className="text-muted">
            {fromLabel}
            {' '}
          </span>
          <span className="font-semibold tabular-nums">{price}</span>
        </span>
      </Media>
      <div className="flex flex-col gap-0.5 px-0.5">
        <h3 className="font-serif text-card-title">{name}</h3>
        <p className="flex items-center gap-1.5 text-label text-muted">
          <ClockIcon size={14} />
          {pickupLine}
        </p>
      </div>
    </div>
  )
}

/** E · List row: thumbnail beside the text; suits the gifts list and search results. */
export function OptionRow({
  name,
  photo,
  fromLabel,
  price,
  pickupLine,
  badge,
}: CardOptionProps) {
  return (
    <Card className="w-80 flex-row items-center gap-3 p-2">
      <Media alt="" className="size-24 shrink-0 rounded-2xl" photo={photo} />
      <div className="flex min-w-0 flex-col gap-1 py-1 pe-2">
        {badge && (
          <span className="text-xs font-medium text-muted">{badge}</span>
        )}
        <h3 className="truncate font-serif text-card-title">{name}</h3>
        <p className="text-sm">
          <span className="text-muted">
            {fromLabel}
            {' '}
          </span>
          <span className="font-semibold tabular-nums">{price}</span>
        </p>
        <p className="truncate text-label text-muted">{pickupLine}</p>
      </div>
    </Card>
  )
}
