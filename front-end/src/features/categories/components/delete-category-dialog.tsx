import type { CategoryKind, MerchantCategory } from '@sk/api-contract'

import { AlertDialog, Button } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { displayName } from '../lib/category-name'
import { problemTypeToMessageKey } from '../lib/category-problems'

/**
 * The confirmation before a delete. It stays open after a refusal and says the reason in words (409: the
 * category has sub-categories, or is still tagged), because closing it would hide why nothing happened.
 */
export function DeleteCategoryDialog({ storeId, kind, category, onClose }: {
  storeId: string
  kind: CategoryKind
  category: MerchantCategory
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const { submit, isPending, error } = useSubmit('categories', 'remove')
  const key = useIdempotencyKey({ storeId, kind, id: category.id })
  const name = displayName(category, language).primary
  const reason = error ? t(problemTypeToMessageKey(error instanceof ApiProblem ? error.type : 'unknown')) : undefined

  const confirm = () => submit({ storeId, kind, id: category.id, idempotencyKey: key.next() }, {
    onSuccess: () => {
      key.settled()
      onClose()
    },
    onError: failed => key.settled(failed),
  })

  return (
    <AlertDialog.Backdrop isDismissable isOpen onOpenChange={open => !open && onClose()}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{t('categories.delete.title', { name })}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>{t('categories.delete.body')}</p>
            {reason && <p className="mt-3 rounded-2xl bg-danger-soft p-3 text-sm text-danger-soft-foreground" role="alert">{reason}</p>}
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse sm:flex-row">
            <Button
              // WAI-ARIA alertdialog: focus starts on the least destructive action.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="w-full sm:w-auto"
              variant="tertiary"
              onPress={onClose}
            >
              {t('categories.delete.cancel')}
            </Button>
            <Button className="w-full sm:w-auto" isPending={isPending} variant="danger" onPress={confirm}>
              {t('categories.delete.confirm')}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}
