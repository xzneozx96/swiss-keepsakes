import { SelectedIcon } from '@/components/icons'

/**
 * The app's chosen style (gift options C03, advice answers): a 2 px red border (`border-2
 * border-accent`, transparent otherwise, set by the item), and this mark on the top-right corner,
 * on the edge. Where order counts the mark is the red order number instead.
 */
export function ChosenMark({ order }: { order?: number }) {
  if (order !== undefined) {
    return (
      <span aria-hidden className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] leading-none font-bold text-accent-foreground tabular-nums">
        {order}
      </span>
    )
  }

  return <SelectedIcon aria-hidden className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent" weight="Filled" />
}
