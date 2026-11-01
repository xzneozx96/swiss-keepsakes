import { SelectedIcon } from '@/components/icons'

/** A selected photo tile: the app's selected state, the red accent ring of the choice cards (`components/choice-card.ts`). */
export const TILE_SELECTED = 'ring-2 ring-accent ring-offset-2'

/** The round mark in a tile's corner: empty while the tile can be picked, the accent tick once it is. */
export function TileMark({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden className={`absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-surface bg-surface text-accent' : 'border-surface/90 bg-foreground/20'}`}>
      {selected && <SelectedIcon size={22} weight="Filled" />}
    </span>
  )
}
