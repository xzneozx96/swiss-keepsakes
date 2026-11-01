import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Button, Label, ListBox, Select } from '@heroui/react'
import { useId, useState } from 'react'

import { CheckIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { asSaved, combinationName, labelOf } from '../lib/option-rules'
import { NotesAt, RevealLink } from './option-bits'
import { Swatch } from './option-parts'

/**
 * A new option on a keepsake with variants: every variant needs a value of it in the same save, archived ones too
 * (ADR-017). One sentence, one row of "All <value>" buttons, and the choice per variant behind a link.
 */
export function AssignPanel({ draft, option }: { draft: OptionsDraftState, option: OptionDraft }) {
  const { t, language } = useLocale()
  const [open, setOpen] = useState(false)
  const listId = useId()
  const name = labelOf(option.name, 'en') || t('keepsakes.assign.newOption')
  const values = option.values.filter(value => labelOf(value.label) !== '')
  const others = asSaved(draft.options.filter(o => o.ref !== option.ref && draft.isSaved(o.ref)))
  const valueRefs = new Set(values.map(value => value.ref))
  const total = draft.variants.length
  const set = draft.variants.filter(variant => valueRefs.has(draft.assigned[variant.id]?.[option.ref] ?? '')).length
  const allOf = (ref: string) => draft.variants.every(variant => draft.assigned[variant.id]?.[option.ref] === ref)
  const tag = (status: string | undefined) => (status === 'draft' ? ` · ${t('keepsakes.variant.status.hiddenLower')}` : status === 'archived' ? ` · ${t('keepsakes.variant.archivedTag')}` : '')

  return (
    <section aria-label={t('keepsakes.assign.label', { option: name })} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4" data-testid="assign-panel">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{t(total === 1 ? 'keepsakes.assign.title.one' : 'keepsakes.assign.title.other', { count: total, option: name })}</p>
        <p className="text-sm text-pretty text-muted">{t('keepsakes.assign.hint')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {values.map(value => (
          <Button key={value.ref} aria-pressed={allOf(value.ref)} className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => draft.assignAll(option.ref, value.ref)}>
            {allOf(value.ref) ? <CheckIcon aria-hidden size={14} /> : <Swatch className="size-3" color={value.swatch} />}
            {t('keepsakes.assign.all', { value: labelOf(value.label, language) })}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <RevealLink controls={listId} expanded={open} onToggle={() => setOpen(o => !o)}>{t('keepsakes.assign.choose')}</RevealLink>
        <span aria-live="polite" className={`ms-auto text-sm tabular-nums ${set < total ? 'text-muted' : 'text-success'}`}>
          {set < total ? t('keepsakes.assign.progress', { set, total }) : t('keepsakes.assign.allSet', { total })}
        </span>
      </div>
      {open && (
        <ul className="flex flex-col gap-1" id={listId}>
          {draft.variants.map((variant) => {
            const label = t('keepsakes.assign.valueOf', { option: name, code: variant.skuCode })

            return (
              <li key={variant.id} className="flex items-center gap-3 py-1">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{combinationName(variant.values, others, language) || variant.skuCode}</span>
                  <span className="truncate font-mono text-xs text-muted">{`${variant.skuCode}${tag(variant.status)}`}</span>
                </span>
                <Select
                  aria-label={label}
                  className="w-36 shrink-0"
                  placeholder={t('keepsakes.assign.choosePlaceholder')}
                  selectedKey={draft.assigned[variant.id]?.[option.ref] ?? null}
                  onSelectionChange={key => key !== null && draft.assign(variant.id, option.ref, String(key))}
                >
                  <Label className="sr-only">{label}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {values.map(value => (
                        <ListBox.Item key={value.ref} id={value.ref} textValue={labelOf(value.label, language)}>
                          {labelOf(value.label, language)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </li>
            )
          })}
        </ul>
      )}
      <NotesAt at={`${option.ref}:assign`} draft={draft} />
    </section>
  )
}
