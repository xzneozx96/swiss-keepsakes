import type { PickupPlace } from '@sk/api-contract'

import { pickText } from '@sk/domain/shared'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { usePickupPlaces } from '@/features/pickup/api/queries'
import { useMe } from '@/features/stores/api/queries'
import { currentStore } from '@/features/stores/lib/current-store'
import { apiEnabled } from '@/lib/api-mode'

/**
 * The data of M14 on the API: the store the person works in, its active points always (the tab badge) and its
 * archived points while the tab is open, plus archive (after a confirm) and restore. `dialog` must be rendered.
 */
export function usePickupPoints(isOpen: boolean) {
  const { t, language } = useLocale()
  const me = useMe(apiEnabled)
  const storeId = currentStore(me.data)?.storeId
  const active = usePickupPlaces(storeId, { archived: false })
  const archived = usePickupPlaces(isOpen ? storeId : undefined, { archived: true })
  const { confirm, dialog } = useConfirm()
  const nameOf = (place: PickupPlace) => pickText(place.name, language).text
  // The confirm dialog shows a refusal of the archive, so the cache stays silent on its error.
  const archiveCommand = useSubmit('pickup', 'archive', { meta: { success: place => t('products.archivedToast', { name: nameOf(place) }), silent: true } })
  const restoreCommand = useSubmit('pickup', 'restore', { meta: { success: place => t('pickup.toast.restored', { name: nameOf(place) }) } })

  const archive = (place: PickupPlace) => {
    if (!storeId || archiveCommand.isPending)
      return
    void confirm({
      title: t('products.archive.title', { name: nameOf(place) }),
      body: t('pickup.archive.body'),
      confirmLabel: t('products.action.archive'),
      run: () => archiveCommand.submitAsync({ storeId, id: place.id, ifMatch: place.rowVersion, idempotencyKey: crypto.randomUUID() }),
    })
  }

  const restore = (place: PickupPlace) => {
    if (storeId)
      restoreCommand.submit({ storeId, id: place.id, ifMatch: place.rowVersion, idempotencyKey: crypto.randomUUID() })
  }

  return { storeId, me, active, archived, archive, restore, dialog }
}
