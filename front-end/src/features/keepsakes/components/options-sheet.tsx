import type { Product } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button, toast } from '@heroui/react'
import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useOptionsDraft } from '../hooks/use-options-draft'
import { labelOf, optionsBody } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { OptionsEditor, OptionsProblems } from './option-blocks'
import { RefusalAlert } from './option-parts'

export type SaveOptions = (options: ReturnType<typeof optionsBody>, variantValues: { variantId: string, values: Record<string, string> }[]) => Promise<Outcome>

/**
 * N14 in the shared sheet: one option's values, order and swatches (Edit in its row), or a new option with a value for
 * every variant (Add option). Everything is staged here and saves in one request, because the database counts each
 * variant's values against the options at commit (ADR-027). Save and Cancel; Cancel leaves without saving.
 */
export function OptionsSheet({ keepsake, focus, onSave, onClose }: {
  keepsake: Product
  /** The option to edit. Left out, the sheet opens on a new option. */
  focus?: string
  onSave: SaveOptions
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const draft = useOptionsDraft({ saved: keepsake.options, variants: keepsake.variants, startNew: focus === undefined })
  const [isPending, setIsPending] = useState(false)
  const [failure, setFailure] = useState<string>()
  const focused = draft.options.find(option => option.ref === focus)

  const save = async () => {
    setFailure(undefined)
    if (draft.check().length > 0)
      return
    setIsPending(true)
    const variantValues = Object.entries(draft.assigned).map(([variantId, values]) => ({ variantId, values }))
    const outcome = await onSave(optionsBody(draft.options), variantValues)

    setIsPending(false)
    if (outcome.ok) {
      toast.success(t('keepsakes.optionsSheet.saved'))
      onClose()

      return
    }
    if (outcome.refusals && outcome.refusals.length > 0)
      draft.setProblems(outcome.refusals)
    else
      setFailure(t(problemMessageKey(outcome.type)))
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" isDisabled={!draft.dirty} isPending={isPending} onPress={() => void save()}>
            {t('keepsakes.optionsSheet.save')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>{t('keepsakes.variant.cancel')}</Button>
        </>
      )}
      title={focused ? t('keepsakes.optionsSheet.editTitle', { option: labelOf(focused.name, language) || t('keepsakes.optionBlock.option') }) : t('keepsakes.optionsSheet.addTitle')}
      onClose={onClose}
    >
      <p className="text-sm text-pretty text-muted">{t(focused ? 'keepsakes.optionsSheet.editHint' : 'keepsakes.optionsSheet.addHint')}</p>
      <OptionsProblems problems={draft.problems} />
      {failure && <RefusalAlert>{failure}</RefusalAlert>}
      <OptionsEditor canAdd={false} draft={draft} focus={focus ?? 'new'} />
    </SheetFrame>
  )
}
