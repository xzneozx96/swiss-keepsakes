import type { ReactNode } from 'react'

import { Notice } from '@/components/notice'

/** A hint that two parts of the place disagree: the soft warning Alert of the app, its text, and the one-tap fixes under it. It never blocks saving. */
export function SyncWarning({ text, children }: { text: string, children?: ReactNode }) {
  return (
    <Notice actions={children} role="note" status="warning">{text}</Notice>
  )
}
