import { ToggleButton } from '@heroui/react'

import { FavouriteIcon } from '@/components/icons'

/** One figure of the stats row: the value over its label. */
export interface ListingDetailStat { value: string, label: string }

export function ListingDetailHeader({
  name,
  subtitle,
  stats,
  align = 'center',
}: {
  name: string
  subtitle?: string
  /** The stats row (tours), equal columns; the keepsake page has none. */
  stats?: ListingDetailStat[]
  /** The keepsake page centres the title; the tour page starts it at the left edge (owner, 06.11.2026). */
  align?: 'center' | 'start'
}) {
  return (
    <>
      <header className={`flex flex-col gap-2 ${align === 'center' ? 'items-center pb-6 text-center' : 'items-start text-start'}`}>
        <h1 className="font-serif text-title text-balance">{name}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </header>

      {stats && stats.length > 0 && (
        <dl
          className="grid items-center divide-x divide-separator border-y border-separator py-4 text-center rtl:divide-x-reverse"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map(stat => (
            <div key={stat.label} className="flex flex-col-reverse items-center gap-0.5 px-1">
              <dt className="text-xs text-muted">{stat.label}</dt>
              <dd className="text-lg leading-6 font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
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
      {/* HeroUI sizes a toggle button's svg (20px, 16px from sm); the heart is 24px at every width because its shape is shorter than the 22px globe next to it. */}
      <FavouriteIcon
        className="size-6! sm:size-6!"
        size={24}
        weight={favourite.isSaved ? 'Filled' : 'Outline'}
      />
    </ToggleButton>
  )
}
