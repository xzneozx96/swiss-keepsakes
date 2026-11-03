import { SelectedIcon } from '@/components/icons'

/**
 * A selected photo tile's outline: the app's selected state, the red accent of the choice cards
 * (`components/choice-card.ts`). Drawn inside the tile, over the photo, so neighbours 8 px apart never touch and a
 * scroll container never clips it.
 */
export function TileOutline({ shown }: { shown: boolean }) {
  return shown ? <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-3 ring-accent ring-inset" /> : null
}

/** The round mark in a tile's corner: empty while the tile can be picked, the accent tick once it is. */
export function TileMark({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden className={`absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-surface bg-surface text-accent' : 'border-surface/90 bg-foreground/20'}`}>
      {selected && <SelectedIcon size={22} weight="Filled" />}
    </span>
  )
}
