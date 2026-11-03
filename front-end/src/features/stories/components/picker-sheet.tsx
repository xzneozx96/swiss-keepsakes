import type { ReactNode } from 'react'

import { Button } from '@heroui/react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

/**
 * The frame of the keepsake and story pickers: an open sheet with the done button and a tertiary Cancel in its footer.
 * The caller mounts it only while the picker is open and keeps the draft choice itself.
 */
export function PickerSheet({ title, doneLabel, onDone, onClose, children }: {
  title: string
  doneLabel: string
  onDone: () => void
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useLocale()

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" onPress={onDone}>{doneLabel}</Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>{t('storyMedia.pin.cancel')}</Button>
        </>
      )}
      title={title}
      onClose={onClose}
    >
      {children}
    </SheetFrame>
  )
}
