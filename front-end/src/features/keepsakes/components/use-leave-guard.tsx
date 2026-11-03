import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'

type Copy = 'leave' | 'leaveSave' | 'discard'

/**
 * Leaving with edits that are not saved yet asks first (the shared confirm, as M17). `leave` is for the editor's own Back
 * button. With `blockNavigation`, every other way out of the page asks too: a link, the sidebar, the browser's Back (the
 * router's blocker), and a tab close or reload (the browser's own prompt). A move inside the page, as a step change, is no
 * way out.
 *
 * `onSave` runs first when the dialog is confirmed (the copy `leaveSave` says it is saved); false keeps the merchant here.
 * Then a Back button runs `onLeave`, and a blocked navigation goes on to where it was going.
 */
export function useLeaveGuard({ isUnsaved, copy = 'leave', blockNavigation = false, onSave, onLeave }: {
  isUnsaved: boolean
  copy?: Copy
  blockNavigation?: boolean
  onSave?: () => Promise<boolean>
  onLeave: () => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const unsaved = useLatest(isUnsaved)
  // Set when the merchant has agreed to leave, so the navigation that follows is not asked about again.
  const leavingRef = useRef(false)
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => unsaved.current && !leavingRef.current && current.pathname !== next.pathname,
    enableBeforeUnload: () => unsaved.current,
    disabled: !blockNavigation,
    withResolver: true,
  })
  const blocked = blocker.status === 'blocked'
  const dialog = (
    <ConfirmDialog
      body={t(`keepsakes.${copy}.body`)}
      cancelLabel={t(copy === 'discard' ? 'keepsakes.discard.cancel' : 'keepsakes.leave.cancel')}
      confirmLabel={t(`keepsakes.${copy}.confirm`)}
      isOpen={open || blocked}
      title={t(`keepsakes.${copy}.title`)}
      onCancel={() => {
        setOpen(false)
        blocker.reset?.()
      }}
      onConfirm={async () => {
        if (onSave && !(await onSave())) {
          setOpen(false)
          blocker.reset?.()

          return
        }
        setOpen(false)
        leavingRef.current = true
        if (blocker.status === 'blocked')
          blocker.proceed()
        else
          onLeave()
      }}
    />
  )

  // For a way out that has already thrown the edits away (the story was deleted): the navigation that follows is not asked about.
  return { leave: () => (isUnsaved ? setOpen(true) : onLeave()), dialog, bypass: () => { leavingRef.current = true } }
}
