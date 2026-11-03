import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { labelOf, variantsUsing } from '../lib/option-rules'

/**
 * Delete option, for the foot of the options block (laptop) and the footer of the sheet (phone). A saved option whose removal
 * would make two rows the same is refused at once, with the rows named; any other delete asks first (and says that its
 * values come off the variants that hold them) and is staged like every other change. `dialog` must be rendered by the caller.
 */
export function useDeleteOption(draft: OptionsDraftState) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()

  const remove = async (option: OptionDraft, onDeleted: () => void) => {
    const name = labelOf(option.name, 'en')

    if (draft.dropRefusal(option.ref)) {
      draft.removeOption(option.ref)

      return
    }
    const users = draft.isSaved(option.ref) ? variantsUsing(draft.variants, option.ref) : []
    const archived = users.filter(user => user.status === 'archived').length
    const live = users.length - archived
    const shown = name || t('keepsakes.options.unnamed')
    const keeps = [live > 0 && t(live === 1 ? 'keepsakes.options.delete.keeps.one' : 'keepsakes.options.delete.keeps.other', { count: live }), archived > 0 && t(archived === 1 ? 'keepsakes.options.delete.keeps.archivedOne' : 'keepsakes.options.delete.keeps.archived', { count: archived })].filter(Boolean).join(` ${t('keepsakes.and')} `)
    const body = users.length === 0
      ? t('keepsakes.options.delete.body')
      : draft.options.length === 1 ? t('keepsakes.options.delete.bodyLast') : t(users.length === 1 ? 'keepsakes.options.delete.bodyUsed.one' : 'keepsakes.options.delete.bodyUsed.other', { keeps })

    if (!await confirm({ title: users.length === 0 ? t('keepsakes.options.delete.title', { name: shown }) : t('keepsakes.options.delete.titleUsed', { name: shown }), body, confirmLabel: t('keepsakes.options.delete.confirm') }))
      return
    if (draft.removeOption(option.ref))
      onDeleted()
  }

  return { remove, dialog }
}
