import { ToggleButton } from '@heroui/react'

import { FavouriteIcon } from '@/components/icons'

/** The title and subtitle of a keepsake or tour page; what follows (tabs, facts) belongs to the page. */
export function ListingDetailHeader({
  name,
  subtitle,
}: {
  name: string
  subtitle?: string
}) {
  return (
    <header className="flex flex-col items-center gap-2 pb-6 text-center">
      <h1 className="font-serif text-title text-balance">{name}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </header>
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
