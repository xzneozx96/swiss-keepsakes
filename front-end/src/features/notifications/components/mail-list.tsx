import type { Mail } from '../types'

import { buttonVariants } from '@heroui/react'

import { useDemo } from '@/features/demo'

import { dateTimeFormat } from '@/lib/format'
import { renderMail } from './render-mail'

/** The emails of one recipient, rendered in the recipient's language. Loaded when the panel opens, so the dictionaries it needs stay out of the first load. */
export function MailList({
  items,
  onOpenLink,
}: {
  items: Mail[]
  /** A mail's link was followed (N16, N17): close the panel. */
  onOpenLink?: () => void
}) {
  const { state, setRole } = useDemo()

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">No emails yet.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((mail, i) => {
        const { subject, body, link } = renderMail(
          mail,
          state.data.pickupPlaces,
        )
        const guest = state.data.guests.find(g => g.id === mail.guestId)
        const partner = state.data.partners.find(
          p => p.id === mail.partnerId,
        )
        const to = mail.recipient
          ? mail.recipient
          : mail.to === 'staff'
            ? 'Shop staff (Sonja, Lukas)'
            : partner
              ? `${partner.name} <${partner.email}>`
              : guest
                ? `${guest.name} <${String(mail.params.email ?? guest.email)}>`
                : 'Guest'

        return (
          <li key={mail.id}>
            <details
              className="group rounded-2xl border border-separator bg-surface"
              open={i === 0}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-0.5 rounded-2xl px-4 py-3 outline-none focus-visible:focus-ring">
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
                  <span className="rounded bg-surface-secondary px-1.5">
                    {mail.template}
                  </span>
                  {`${mail.language.toUpperCase()} · ${formatSentAt(mail.at)}`}
                </span>
                <span className="text-sm font-semibold">{subject}</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-separator px-4 py-3 text-sm">
                <p className="text-xs text-muted">To: {to}</p>
                {body.map((paragraph, n) => (
                  <p key={n}>{paragraph}</p>
                ))}
                {link && (
                  // Opens the shop as the recipient when the presenter is not a merchant yet.
                  <a
                    className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-fit`}
                    href={link.href}
                    onClick={() => {
                      if (state.role !== 'owner' && state.role !== 'manager')
                        setRole(link.role)
                      onOpenLink?.()
                    }}
                  >
                    {link.label}
                  </a>
                )}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}

function formatSentAt(iso: string): string {
  return dateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}
