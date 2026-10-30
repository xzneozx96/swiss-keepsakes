import type { MediaItem } from '@sk/api-contract'

import { AlertDialog, Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

/** Before Replace: how many pages change, published and draft-only (AC51). */
export function ReplaceDialog({ item, onConfirm, onCancel }: { item: MediaItem | null, onConfirm: () => void, onCancel: () => void }) {
  const { t } = useLocale()
  const usage = item?.usage

  return (
    <AlertDialog.Backdrop isDismissable isOpen={!!item} onOpenChange={open => !open && onCancel()}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status="accent" />
            <AlertDialog.Heading>{item ? t('media.replace.title', { name: item.name }) : ''}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-2">
            <p>
              {usage?.pages
                ? t('media.replace.bodyPages', { pages: usage.pages, published: usage.published, drafts: usage.drafts })
                : t('media.replace.bodyNone')}
            </p>
            {item?.kind === 'pdf' && <p className="text-muted">{t('media.replace.pdf')}</p>}
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse sm:flex-row">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus starts on the least changing action, as ConfirmDialog does */}
            <Button autoFocus className="w-full sm:w-auto" variant="tertiary" onPress={onCancel}>{t('media.replace.cancel')}</Button>
            <Button className="w-full sm:w-auto" onPress={onConfirm}>{t('media.replace.confirm')}</Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}
