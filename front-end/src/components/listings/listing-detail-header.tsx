import { ToggleButton } from '@heroui/react'

import { FavouriteIcon } from '@/components/icons'
import { Laurel, Stars } from '@/components/rating'

export interface ListingDetailStats {
  primary: { value: string, label: string }
  rating: { value: string, label: string }
  ratingValue: number
  hasRating: boolean
  reviews: { value: string, label: string }
}

export function ListingDetailHeader({
  name,
  subtitle,
  stats,
}: {
  name: string
  subtitle: string
  stats: ListingDetailStats
}) {
  return (
    <>
      <header className="flex flex-col items-center gap-2 pb-6 text-center">
        <h1 className="font-serif text-title text-balance">{name}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </header>

      {/* 2. Stats row: the laurel rating in a wider middle column, equal sides */}
      <dl className="grid grid-cols-[1fr_1.5fr_1fr] items-center border-y border-separator py-4 text-center">
        <div className="flex flex-col items-center gap-0.5 px-1">
          <dd className="text-sm leading-6 font-semibold">
            {stats.primary.value}
          </dd>
          <dt className="text-xs text-muted">{stats.primary.label}</dt>
        </div>
        <div className="flex flex-col items-center gap-0.5 border-x border-separator px-1">
          <dt className="sr-only">{stats.rating.label}</dt>
          <dd className="flex items-center gap-1">
            {stats.hasRating && (
              <Laurel className="h-12 w-[22px]" side="start" />
            )}
            <span className="text-[34px] leading-10 font-semibold tracking-tight tabular-nums">
              {stats.rating.value}
            </span>
            {stats.hasRating && <Laurel className="h-12 w-[22px]" side="end" />}
          </dd>
          {stats.hasRating && (
            <dd aria-hidden>
              <Stars
                label={stats.rating.label}
                rating={stats.ratingValue}
                size={14}
              />
            </dd>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 px-1">
          <dd className="text-lg leading-6 font-semibold tabular-nums">
            {stats.reviews.value}
          </dd>
          <dt className="text-xs text-muted">{stats.reviews.label}</dt>
        </div>
      </dl>
    </>
  )
}

export function ListingFavouriteButton({
  favourite,
  tone,
}: {
  favourite: { isSaved: boolean, onToggle: () => void, label: string }
  tone: 'pill' | 'bar'
}) {
  return (
    <ToggleButton
      isIconOnly
      aria-label={favourite.label}
      className={
        tone === 'pill'
          ? 'pill size-11 data-[hovered=true]:bg-white data-[pressed=true]:bg-white data-[selected=true]:bg-white/80 data-[selected=true]:text-accent'
          : 'size-11 bg-transparent text-foreground data-[selected=true]:bg-transparent data-[selected=true]:text-accent'
      }
      isSelected={favourite.isSaved}
      onChange={favourite.onToggle}
    >
      <FavouriteIcon
        size={22}
        weight={favourite.isSaved ? 'Filled' : 'Outline'}
      />
    </ToggleButton>
  )
}
