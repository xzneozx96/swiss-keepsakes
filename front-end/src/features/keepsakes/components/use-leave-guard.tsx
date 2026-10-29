import { useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'

/** Leaving with edits that are not saved yet asks first (the shared confirm, as M17). `leave` runs when it is safe or confirmed. */
export function useLeaveGuard({ isUnsaved, titleKey = 'keepsakes.leave.title', bodyKey = 'keepsakes.leave.body', confirmKey = 'keepsakes.leave.confirm', cancelKey = 'keepsakes.leave.cancel', onLeave }: {
  isUnsaved: boolean
  titleKey?: 'keepsakes.leave.title' | 'keepsakes.discard.title'
  bodyKey?: 'keepsakes.leave.body' | 'keepsakes.discard.body'
  confirmKey?: 'keepsakes.leave.confirm' | 'keepsakes.discard.confirm'
  cancelKey?: 'keepsakes.leave.cancel' | 'keepsakes.discard.cancel'
  onLeave: () => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const dialog = (
    <ConfirmDialog
      body={t(bodyKey)}
      cancelLabel={t(cancelKey)}
      confirmLabel={t(confirmKey)}
      isOpen={open}
      title={t(titleKey)}
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false)
        onLeave()
      }}
    />
  )

  return { leave: () => (isUnsaved ? setOpen(true) : onLeave()), dialog }
}
