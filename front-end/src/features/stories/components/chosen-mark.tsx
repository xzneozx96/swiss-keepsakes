import { SelectedIcon } from '@/components/icons'

/**
 * The mark of a chosen row or tile. The item sets a 2 px `border-accent` border while it is chosen (`aria-pressed:border-accent`),
 * and this mark sits in its top-right corner: a tick, or the red order number where the order counts.
 */
export function ChosenMark({ order }: { order?: number }) {
  if (order !== undefined) {
    return (
      <span aria-hidden className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-[11px] leading-none font-bold text-accent-foreground tabular-nums">
        {order}
      </span>
    )
  }

  return <SelectedIcon aria-hidden className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent" weight="Filled" />
}
