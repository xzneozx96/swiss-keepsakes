import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { labelOf, variantsUsing } from '../lib/option-rules'

/**
 * Delete option, for the foot of the options block (laptop) and the footer of the sheet (phone). A saved option that a variant
 * holds is refused at once, with the variants named; any other delete asks first and is staged like every other change.
 * `dialog` must be rendered by the caller.
 */
export function useDeleteOption(draft: OptionsDraftState) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()

  const remove = async (option: OptionDraft, onDeleted: () => void) => {
    const name = labelOf(option.name, 'en')

    if (draft.isSaved(option.ref) && variantsUsing(draft.variants, option.ref).length > 0) {
      draft.removeOption(option.ref)

      return
    }
    if (!await confirm({ title: t('keepsakes.options.delete.title', { name: name || t('keepsakes.options.unnamed') }), body: t('keepsakes.options.delete.body'), confirmLabel: t('keepsakes.options.delete.confirm') }))
      return
    if (draft.removeOption(option.ref))
      onDeleted()
  }

  return { remove, dialog }
}
