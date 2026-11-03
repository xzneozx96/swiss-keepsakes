import type { ReactNode } from 'react'

import { Alert } from '@heroui/react'

/**
 * An inline notice in the soft HeroUI Alert look (tinted, as `InfoNote`). The status sets the tone: `danger` for a
 * refusal that blocks saving, `warning` for a hint that does not block (the person can still publish), `accent` for
 * neutral information. `actions` sit under the text. Do not draw a notice as a hand-made coloured box.
 */
export function Notice({ status, children, actions, role = 'alert' }: {
  status: 'danger' | 'warning' | 'accent' | 'success'
  children: ReactNode
  actions?: ReactNode
  role?: 'alert' | 'status' | 'note'
}) {
  return (
    <Alert className="alert--soft w-full" role={role} status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </Alert.Content>
    </Alert>
  )
}
