import type { Product, ProductOption } from '@sk/api-contract'
import type { SaveOptions } from './options-sheet'
import type { DataTableColumn } from '@/components/data-table'

import { Button, Chip } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { DataTable } from '@/components/data-table'
import { EditIcon, OptionIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { draftOfOptions, labelOf, optionsBody, refusalText, shortLabel, variantsUsing } from '../lib/option-rules'
import { KeepsakeCard } from './keepsake-card'
import { RefusalAlert, Swatch } from './option-parts'
import { OptionsSheet } from './options-sheet'

type Action = 'edit' | 'delete'

/**
 * The Options card (design section 5): a table of the keepsake's options with their values as chips and the number of
 * variants that use them. Edit and Add option open the options sheet N14. Delete is refused while any variant uses the
 * option, archived ones too; an option no variant uses asks first.
 */
export function OptionsCard({ keepsake, onSave }: { keepsake: Product, onSave: SaveOptions }) {
  const { t, language } = useLocale()
  const { confirm, dialog } = useConfirm()
  const [sheet, setSheet] = useState<{ focus?: string }>()
  const [refusal, setRefusal] = useState<string>()
  const used = (option: ProductOption) => variantsUsing(keepsake.variants, option.id).length

  const remove = async (option: ProductOption) => {
    const users = variantsUsing(keepsake.variants, option.id)
    const name = labelOf(option.name, language)

    if (users.length > 0) {
      setRefusal(refusalText(t, { at: option.id, code: 'option-in-use', params: { option: name, count: users.length, codes: users.slice(0, 3).map(u => u.skuCode).join(', '), more: Math.max(0, users.length - 3) } }))

      return
    }
    setRefusal(undefined)
    if (!await confirm({ title: t('keepsakes.options.delete.title', { name }), body: t('keepsakes.options.delete.body'), confirmLabel: t('keepsakes.options.delete.confirm') }))
      return
    const rest = draftOfOptions(keepsake.options).filter(draft => draft.ref !== option.id)
    const outcome = await onSave(optionsBody(rest), [])

    if (!outcome.ok)
      setRefusal(outcome.refusals?.length ? outcome.refusals.map(r => refusalText(t, r)).join(' ') : t('keepsakes.problem.generic'))
  }

  const menu = (option: ProductOption) => (
    <RowActions<Action>
      actions={[
        { id: 'edit', label: t('keepsakes.options.edit'), icon: EditIcon },
        { id: 'delete', label: t('keepsakes.options.delete'), icon: TrashIcon, isDanger: true },
      ]}
      label={t('keepsakes.options.actions', { name: labelOf(option.name, language) })}
      onAction={(action) => {
        if (action === 'edit')
          setSheet({ focus: option.id })
        else
          void remove(option)
      }}
    />
  )

  const chips = (option: ProductOption) => (
    <ul className="flex flex-wrap gap-1.5">
      {option.values.map(value => (
        <li key={value.id}>
          <Chip size="sm" variant="secondary">
            <Swatch className="size-3" color={value.swatch} />
            <Chip.Label>{shortLabel(value.label, language)}</Chip.Label>
          </Chip>
        </li>
      ))}
    </ul>
  )

  // The reading language over the other one (the English name over the German by default); "No German name" when there is none.
  const name = (option: ProductOption) => {
    const other = language === 'en' ? option.name.de : option.name.en
    const otherLanguage = language === 'en' ? 'de' : 'en'

    return (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{labelOf(option.name, language)}</span>
        {option.name.de && other
          ? <span className="truncate text-xs text-muted" lang={otherLanguage}>{other}</span>
          : !option.name.de && <span className="truncate text-xs text-muted">{t('keepsakes.options.noGerman')}</span>}
      </span>
    )
  }

  const usedBy = (option: ProductOption) => t(used(option) === 1 ? 'keepsakes.list.variants.one' : 'keepsakes.list.variants.other', { count: used(option) })

  const columns: DataTableColumn<ProductOption>[] = [
    { id: 'option', header: t('keepsakes.options.column.option'), isRowHeader: true, cellClassName: 'w-[24%]', render: name },
    { id: 'values', header: t('keepsakes.options.column.values'), render: chips },
    { id: 'used', header: t('keepsakes.options.column.usedBy'), cellClassName: 'whitespace-nowrap', render: usedBy },
  ]

  return (
    <KeepsakeCard
      icon={OptionIcon}
      id="options"
      title={t('keepsakes.options.title')}
      trailing={(
        <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setSheet({})}>
          <PlusIcon aria-hidden size={16} />
          {t('keepsakes.options.add')}
        </Button>
      )}
    >
      {refusal && <RefusalAlert>{refusal}</RefusalAlert>}
      {keepsake.options.length === 0
        ? <p className="text-sm text-pretty text-muted">{t('keepsakes.options.none')}</p>
        : (
            <DataTable
              cards={rows => (
                <ul className="flex flex-col gap-2 lg:hidden">
                  {rows.map(option => (
                    <li key={option.id} className="flex items-start gap-2 border-t border-separator pt-2 first:border-none first:pt-0">
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {name(option)}
                        {chips(option)}
                        <span className="text-label text-muted">{t('keepsakes.options.usedBy', { used: usedBy(option) })}</span>
                      </span>
                      {menu(option)}
                    </li>
                  ))}
                </ul>
              )}
              columns={columns}
              empty={{ icon: OptionIcon, message: t('keepsakes.options.none') }}
              getRowId={option => option.id}
              hidePager
              label={t('keepsakes.options.title')}
              rowActions={{ render: menu }}
              rows={keepsake.options}
              variant="card"
            />
          )}
      {sheet && <OptionsSheet focus={sheet.focus} keepsake={keepsake} onClose={() => setSheet(undefined)} onSave={onSave} />}
      {dialog}
    </KeepsakeCard>
  )
}
