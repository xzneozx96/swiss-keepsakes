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

/** The action button: the solid warning colour, 6.9:1 for its white text, readable on the tinted banner. */
const actionClass = (className: string) => buttonVariants({ className: `${className} bg-warning text-warning-foreground hover:bg-warning-hover`, size: 'sm', variant: 'primary' })

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

/**
 * The warning banner of a page: a headline, the action that fixes it and a close button that hides
 * the banner for the rest of the browser session. It sticks to the top of the content area, so it
 * stays in sight while the page scrolls; the wrapper takes over the top padding of that area and
 * carries the page background, so no content shows through it. The Alert uses the tinted warning
 * Alert of the project (`alert--soft`: amber background, 6.2:1 for the warning text on it), so no
 * feature has to restyle it.
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
    <div className="sticky top-0 z-10 -mt-4 bg-background pt-4 pb-4 lg:-mt-8 lg:pt-8">
      <Alert className="alert--soft w-full" status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Link className={actionClass('mt-3 sm:hidden')} to={action.to}>{action.label}</Link>
        </Alert.Content>
        <Link className={actionClass('hidden shrink-0 sm:inline-flex')} to={action.to}>{action.label}</Link>
        <CloseButton aria-label={closeLabel} onPress={close} />
      </Alert>
    </div>
  )
}
