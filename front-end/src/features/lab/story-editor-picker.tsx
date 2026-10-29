import { Button } from '@heroui/react'

import { SheetFrame } from '@/components/sheet-frame'

/**
 * Where every picker opens (pins, keepsakes, stories, categories on phones, media, cover, pin
 * link): the app's shared `SheetFrame` at every width, as the shipped `PhotoSheet` and
 * `AudioSheet` do, with the action and Cancel in its footer. Pickers open only from a page
 * (Write, or a Details card on Review), never from another sheet.
 */
export function PickerFrame({ title, doneLabel, doneDisabled = false, onDone, onClose, children }: {
  title: string
  doneLabel: string
  doneDisabled?: boolean
  onDone: () => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth isDisabled={doneDisabled} onPress={onDone}>{doneLabel}</Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>Cancel</Button>
        </>
      )}
      title={title}
      onClose={onClose}
    >
      {children}
    </SheetFrame>
  )
}
