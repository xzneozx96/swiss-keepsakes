/**
 * The ticket's date tile (lab order-card L, 1.12r and 1.13r): weekday, day and month beside a
 * vertical rule. Shared by the gift C14/C15 tickets and the tour C14 rows.
 */
export function DateTile({
  date,
  size = 'md',
  muted = false,
}: {
  date: { weekday: string, day: string, month: string }
  /** `lg` is the C15 header; `md` the list rows. */
  size?: 'md' | 'lg'
  /** Closed orders and bookings. */
  muted?: boolean
}) {
  return (
    <div
      className={`flex ${size === 'lg' ? 'w-14' : 'w-12'} shrink-0 flex-col items-center border-e border-separator pe-4 ${muted ? 'text-muted' : ''}`}
    >
      <span className="text-[11px] leading-4 font-semibold tracking-wide uppercase">
        {date.weekday}
      </span>
      <span
        className={`${size === 'lg' ? 'text-3xl' : 'text-2xl'} leading-tight font-semibold tabular-nums`}
      >
        {date.day}
      </span>
      <span className="text-xs text-muted">{date.month}</span>
    </div>
  )
}
