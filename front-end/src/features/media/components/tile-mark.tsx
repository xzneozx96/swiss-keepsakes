import { SelectedIcon } from '@/components/icons'

/** The tick on a chosen tile's top-right corner, on the edge. Put it in the tile's `relative` box, outside the photo wrapper. */
export function ChosenMark() {
  return <SelectedIcon aria-hidden className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent" weight="Filled" />
}
