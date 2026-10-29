import type { StoryEditorModel } from './story-editor-state'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'

/**
 * The unsaved-changes guard: leaving with edits asks first, with the shared confirm (its ink
 * destructive button only inside the dialog). The lab's unsaved state opens it at once.
 */
export function useLeaveGuard(model: StoryEditorModel, openAtStart: boolean) {
  const [open, setOpen] = useState(openAtStart)

  const leave = () => {
    if (model.save === 'unsaved')
      setOpen(true)
    else toast('Back to Stories (not wired in the lab).')
  }
  const dialog = (
    <ConfirmDialog
      body="Your last edits are not saved yet. If you leave now, they are lost."
      cancelLabel="Keep editing"
      confirmLabel="Leave without saving"
      isOpen={open}
      title="Leave without saving?"
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false)
        toast('Edits dropped. Back to Stories (not wired in the lab).')
      }}
    />
  )

  return { leave, dialog }
}
