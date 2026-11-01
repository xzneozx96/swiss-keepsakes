import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Button, Input, Label, Switch, TextField } from '@heroui/react'
import { useEffect, useRef } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { labelOf, OPTION_NAME_MAX, variantsUsing } from '../lib/option-rules'
import { AssignPanel } from './option-assign'
import { NotesAt } from './option-bits'
import { GermanNames } from './option-german'
import { AddValue, ValueList } from './option-values'

/**
 * One option, whole: its name, its values in order, a value on every variant when it is new, the colour swatches, the
 * German names and Delete. The laptop shows it beside the list, the phone in the sheet. A delete that a variant forbids is
 * refused at once and names the variants; any other delete asks first and is staged like every other change.
 */
export function OptionDetail({ draft, option, autoFocusName = false, onDeleted }: { draft: OptionsDraftState, option: OptionDraft, autoFocusName?: boolean, onDeleted: () => void }) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const nameRef = useRef<HTMLInputElement>(null)
  const swatches = option.values.some(value => value.swatch !== null)
  const name = labelOf(option.name, 'en')

  // A new option opens on its name field. Only the first render asks: later typing must not pull the focus back.
  useEffect(() => {
    if (autoFocusName)
      nameRef.current?.focus()
  }, [autoFocusName])

  const remove = async () => {
    // A saved option that a variant holds is refused where the button is, with no question asked first.
    if (draft.isSaved(option.ref) && variantsUsing(draft.variants, option.ref).length > 0) {
      draft.removeOption(option.ref)

      return
    }
    if (!await confirm({ title: t('keepsakes.options.delete.title', { name: name || t('keepsakes.options.unnamed') }), body: t('keepsakes.options.delete.body'), confirmLabel: t('keepsakes.options.delete.confirm') }))
      return
    if (draft.removeOption(option.ref))
      onDeleted()
  }

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="option-detail">
      <div className="flex flex-col gap-1">
        <TextField fullWidth value={option.name.en} onChange={en => draft.patchName(option.ref, { ...option.name, en })}>
          <Label>{t('keepsakes.options.name')}</Label>
          <Input ref={nameRef} lang="en" maxLength={OPTION_NAME_MAX} placeholder={t('keepsakes.options.name.placeholder')} />
        </TextField>
        <NotesAt at={option.ref} draft={draft} only="problems" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{t('keepsakes.options.values')}</span>
          <span className="text-xs text-muted">{t('keepsakes.options.valuesHint')}</span>
        </div>
        <AddValue draft={draft} option={option} />
        {option.values.length > 0 && <ValueList draft={draft} option={option} />}
      </div>

      {draft.needValues.some(needing => needing.ref === option.ref) && <AssignPanel draft={draft} option={option} />}

      <div className="flex flex-col gap-1">
        <Switch className="min-h-11 lg:min-h-9" isSelected={swatches} onChange={on => draft.setSwatches(option.ref, on)}>
          <Switch.Content className="items-center">
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-sm">{t('keepsakes.options.swatches')}</Label>
          </Switch.Content>
        </Switch>
        <GermanNames draft={draft} option={option} />
      </div>

      <div className="flex flex-col gap-1">
        <NotesAt at={option.ref} draft={draft} only="refusal" />
        <Button className="-ms-4 self-start text-danger max-lg:h-11" variant="ghost" onPress={() => void remove()}>
          {t('keepsakes.options.deleteOption')}
        </Button>
      </div>
      {dialog}
    </div>
  )
}
