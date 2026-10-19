import type { ReactNode } from 'react'

/** C14's open-item ticket, a link: the shared light shadow, no border (owner, round 3). */
export const ticketClass
  = 'flex flex-col overflow-hidden rounded-2xl bg-surface shadow-surface outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]'

/** C14's closed-item row, a link inside the Past box. */
export const pastRowClass
  = '-mx-2 flex gap-3 rounded-2xl px-2 py-4 outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]'

/**
 * C14's two groups (1.12r): open items as tickets under "Coming up", then closed items as quiet
 * rows in one white box under "Past" (owner, round 3). Gift orders and tour bookings share it.
 */
export function TicketGroups({
  id,
  openTitle,
  pastTitle,
  open,
  past,
}: {
  /** Prefix of the heading ids: `${id}-open` and `${id}-past`. */
  id: string
  openTitle: string
  pastTitle: string
  open: ReactNode[]
  past: ReactNode[]
}) {
  return (
    <div className="flex flex-col gap-8">
      {open.length > 0 && (
        <section aria-labelledby={`${id}-open`} className="flex flex-col gap-3">
          <h2 className="text-heading" id={`${id}-open`}>
            {openTitle}
          </h2>
          <ul className="flex flex-col gap-3">{open}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section aria-labelledby={`${id}-past`} className="flex flex-col gap-3">
          <h2 className="text-heading" id={`${id}-past`}>
            {pastTitle}
          </h2>
          <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface px-4 shadow-surface">
            {past}
          </ul>
        </section>
      )}
    </div>
  )
}
