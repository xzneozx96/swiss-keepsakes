import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Alert, buttonVariants, CloseButton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

export interface WarningBannerProps {
  /** The headline: what has to be done. */
  title: ReactNode
  /** The action that leads to the place the banner talks about. */
  action: { label: string, to: LinkProps['to'] }
  /** The label of the close button. */
  closeLabel: string
  /** Where the dismissal is remembered; the banner comes back in a new browser session. */
  dismissKey: string
}

/** The action button: the solid warning colour, 6.9:1 for its white text, readable on the amber banner. */
const actionClass = (className: string) => buttonVariants({ className: `${className} bg-warning text-warning-foreground hover:bg-warning-hover`, size: 'sm', variant: 'primary' })

/** The close button: a plain X in the title colour, no circle, no hover background, a 32 px hit area; the focus ring stays. */
const closeClass = 'relative size-8 bg-transparent text-warning-soft-foreground hover:bg-transparent'

/** Whether the banner was closed in this browser session. */
function dismissedIn(key: string) {
  try {
    return sessionStorage.getItem(key) === '1'
  }
  catch {
    // A browser without storage keeps the banner.
    return false
  }
}

/** Remembers that the banner was closed, as long as this browser session lasts. */
function rememberDismissal(key: string) {
  try {
    sessionStorage.setItem(key, '1')
  }
  catch {
    // A browser without storage keeps the banner until the page is left.
  }
}

/** The banner Alert: the HeroUI "Custom styles" Alert (soft amber gradient, corner glow) in the warning tokens. */
const bannerClass = 'relative w-full items-start overflow-hidden rounded-xl border border-warning/25 bg-linear-to-br from-warning-soft via-[color-mix(in_oklab,var(--warning-soft)_45%,var(--surface))] to-surface shadow-sm sm:items-center'

/**
 * The warning banner of a page: a headline, the action that fixes it and a close button that hides
 * the banner for the rest of the browser session. It sticks to the top of the content area, so it
 * stays in sight while the page scrolls; the wrapper takes over the top padding of that area and
 * carries the page background, so no content shows through it. On a phone, a detail screen docks
 * its back bar (z-20) in the shell's sticky slot; the banner then sticks below that bar (top-14,
 * the bar's height), so the bar never covers it. The Alert is a light amber gradient (warning-soft
 * to the surface); the title and the icon keep the warning-soft text colour, 6.2:1 on the amber
 * end, higher on the paler part.
 */
export function WarningBanner({ title, action, closeLabel, dismissKey }: WarningBannerProps) {
  const [dismissed, setDismissed] = useState(() => dismissedIn(dismissKey))

  if (dismissed)
    return null

  const close = () => {
    rememberDismissal(dismissKey)
    setDismissed(true)
  }

  return (
    <div className="sticky top-0 z-10 -mt-4 bg-background pt-4 pb-4 group-has-[[data-merchant-bar-slot]:not(:empty)]/content:max-lg:top-14 lg:-mt-8 lg:pt-8">
      <Alert className={bannerClass} status="warning">
        <div aria-hidden="true" className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-(--status-warning-fill)/25 blur-2xl" />
        <Alert.Indicator className="relative" />
        <Alert.Content className="relative">
          <Alert.Title>{title}</Alert.Title>
          <Link className={actionClass('mt-3 sm:hidden')} to={action.to}>{action.label}</Link>
        </Alert.Content>
        <Link className={actionClass('relative hidden shrink-0 sm:inline-flex')} to={action.to}>{action.label}</Link>
        <CloseButton aria-label={closeLabel} className={closeClass} onPress={close} />
      </Alert>
    </div>
  )
}
