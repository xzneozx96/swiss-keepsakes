import type { ReactNode } from 'react'

import { Alert } from '@heroui/react'

/** A hint that two parts of the place disagree: the soft warning Alert of the app, its text, and the one-tap fixes under it. It never blocks saving. */
export function SyncWarning({ text, children }: { text: string, children?: ReactNode }) {
  return (
    <Alert className="alert--soft w-full" status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{text}</Alert.Description>
        {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
      </Alert.Content>
    </Alert>
  )
}
