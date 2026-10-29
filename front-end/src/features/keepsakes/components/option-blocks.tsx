import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft, Refusal } from '../lib/option-rules'

import { Button, Input, Label, Switch, TextField } from '@heroui/react'
import { useEffect, useRef } from 'react'

import { GripIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { asSaved, combinationName, DEFAULT_SWATCH, labelOf, refusalText } from '../lib/option-rules'
import { RefusalAlert, Swatch, ValueChips } from './option-parts'

function ProblemText({ problems, at }: { problems: Refusal[], at: string }) {
  const { t } = useLocale()
  const mine = problems.filter(problem => problem.at === at)

  return mine.length > 0 ? <p className="text-sm text-danger" role="alert">{mine.map(problem => refusalText(t, problem)).join(' ')}</p> : null
}

/** One option's values in order, dragged by the grip or moved with the arrow keys, as the photos of the keepsake. */
function ValueRows({ option, draft }: { option: OptionDraft, draft: OptionsDraftState }) {
  const { t, language } = useLocale()
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const swatches = option.values.some(value => value.swatch !== null)
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= option.values.length || to === from)
      return
    refocusRef.current = option.values[from]!.ref
    draft.moveValue(option.ref, from, to)
  }
  const drag = useStopDrag({ listRef, placeholderRef, onStart: () => undefined, onDrop: moveTo })

  useEffect(() => {
    if (!refocusRef.current)
      return
    listRef.current?.querySelector<HTMLButtonElement>(`[data-row="${refocusRef.current}"] [data-grip]`)?.focus()
    refocusRef.current = null
  })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={t('keepsakes.optionBlock.valuesInOrder', { option: labelOf(option.name, language) || t('keepsakes.optionBlock.option') })} className="flex flex-col gap-2">
        {option.values.map((value, index) => {
          const name = labelOf(value.label, language) || t('keepsakes.optionBlock.valueN', { n: index + 1 })
          const refused = draft.refusal?.at === value.ref ? draft.refusal : undefined

          return (
            <li key={value.ref} className="group" data-row={value.ref}>
              <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-2 group-data-[lifted]:bg-surface group-data-[lifted]:shadow-overlay lg:p-3">
                <div className="flex min-w-0 items-center gap-1">
                  <button
                    {...drag.handleProps(index)}
                    aria-label={t('keepsakes.optionBlock.moveValue', { name, position: index + 1, count: option.values.length })}
                    className="relative grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none focus-visible:focus-ring active:cursor-grabbing"
                    data-grip=""
                    style={{ touchAction: 'none' }}
                    type="button"
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault()
                        moveTo(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                      }
                      drag.handleProps(index).onKeyDown?.(event)
                    }}
                  >
                    <GripIcon aria-hidden size={18} />
                  </button>
                  {swatches && (
                    <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-within:focus-ring">
                      <span className="sr-only">{t('keepsakes.optionBlock.colourOf', { name })}</span>
                      <Swatch className="size-7" color={value.swatch ?? DEFAULT_SWATCH} />
                      <input className="absolute inset-0 cursor-pointer opacity-0" type="color" value={value.swatch ?? DEFAULT_SWATCH} onChange={event => draft.patchValue(option.ref, value.ref, { swatch: event.target.value.toLowerCase() })} />
                    </label>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                  <Button isIconOnly aria-label={t('keepsakes.optionBlock.deleteValue', { name })} className="size-11 shrink-0 lg:size-10" variant="danger-soft" onPress={() => draft.removeValue(option.ref, value.ref)}>
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-1 pb-1 lg:grid-cols-2">
                  {(['en', 'de'] as const).map(l => (
                    <TextField key={l} fullWidth value={value.label[l]} onChange={text => draft.patchValue(option.ref, value.ref, { label: { ...value.label, [l]: text } })}>
                      <Label className="text-xs">{t(l === 'en' ? 'keepsakes.optionBlock.valueEn' : 'keepsakes.optionBlock.valueDe')}</Label>
                      <Input lang={l} maxLength={80} />
                    </TextField>
                  ))}
                </div>
                {refused && <RefusalAlert>{refusalText(t, refused)}</RefusalAlert>}
                <ProblemText at={value.ref} problems={draft.problems} />
              </div>
            </li>
          )
        })}
      </ol>
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
    </div>
  )
}

/** One option: its name in both languages, the swatch switch, its values and Add a value. */
export function OptionBlock({ option, draft }: { option: OptionDraft, draft: OptionsDraftState }) {
  const { t, language } = useLocale()
  const swatches = option.values.some(value => value.swatch !== null)
  const name = labelOf(option.name, language) || t('keepsakes.optionBlock.newOption')
  const refused = draft.refusal?.at === option.ref ? draft.refusal : undefined

  return (
    <section aria-label={name} className="flex flex-col gap-3 rounded-2xl border border-separator p-3 lg:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{name}</h3>
        <Button isIconOnly aria-label={t('keepsakes.optionBlock.deleteOption', { name })} className="size-11 shrink-0 lg:size-10" variant="danger-soft" onPress={() => draft.removeOption(option.ref)}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
        {(['en', 'de'] as const).map(l => (
          <TextField key={l} fullWidth value={option.name[l]} onChange={text => draft.patchOption(option.ref, { name: { ...option.name, [l]: text } })}>
            <Label>{t(l === 'en' ? 'keepsakes.optionBlock.nameEn' : 'keepsakes.optionBlock.nameDe')}</Label>
            <Input lang={l} maxLength={60} placeholder={t(l === 'en' ? 'keepsakes.optionBlock.nameEn.placeholder' : 'keepsakes.optionBlock.nameDe.placeholder')} />
          </TextField>
        ))}
      </div>
      {refused && <RefusalAlert>{refusalText(t, refused)}</RefusalAlert>}
      <ProblemText at={option.ref} problems={draft.problems} />
      <Switch
        className="min-h-11"
        isSelected={swatches}
        onChange={on => draft.patchOption(option.ref, { values: option.values.map(value => ({ ...value, swatch: on ? value.swatch ?? DEFAULT_SWATCH : null })) })}
      >
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-sm">{t('keepsakes.optionBlock.swatches')}</Label>
        </Switch.Content>
      </Switch>
      <ValueRows draft={draft} option={option} />
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => draft.addValue(option.ref)}>
        <PlusIcon aria-hidden size={16} />
        {t('keepsakes.optionBlock.addValue')}
      </Button>
    </section>
  )
}

/**
 * A new option needs a value on every variant in the same save, archived ones too: the database counts them all.
 * "Give all" fills every variant at once, and each row can then differ.
 */
export function GiveAll({ draft }: { draft: OptionsDraftState }) {
  const { t, language } = useLocale()

  if (draft.variants.length === 0)
    return null

  return (
    <>
      {draft.newOptions.map((option) => {
        const name = labelOf(option.name, language).toLowerCase() || t('keepsakes.giveAll.aValue')
        const saved = asSaved(draft.options)
        const others = saved.filter(o => o.id !== option.ref)
        const missing = draft.variants.filter(variant => !option.values.some(value => value.ref === variant.values[option.ref])).length
        const shown = saved.find(o => o.id === option.ref)!

        return (
          <section key={option.ref} aria-label={t('keepsakes.giveAll.title', { option: name, count: draft.variants.length })} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3 lg:p-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold">{t('keepsakes.giveAll.title', { option: name, count: draft.variants.length })}</h3>
              <p className="text-sm text-pretty text-muted">
                {t('keepsakes.giveAll.hint')}
                {' '}
                {missing > 0 ? t(missing === 1 ? 'keepsakes.giveAll.stillOne' : 'keepsakes.giveAll.stillMany', { count: missing }) : t('keepsakes.giveAll.allSet')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{t('keepsakes.giveAll.label')}</span>
              {shown.values.filter(value => labelOf(value.label)).map(value => (
                <Button key={value.id} className="max-lg:h-11" size="sm" variant="secondary" onPress={() => draft.setAll(option.ref, value.id)}>
                  <Swatch color={value.swatch} />
                  {labelOf(value.label, language)}
                </Button>
              ))}
            </div>
            <ul className="flex flex-col divide-y divide-separator">
              {draft.variants.map(variant => (
                <li key={variant.id} className="flex flex-col gap-2 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-mono text-sm">{variant.skuCode}</span>
                    <span className="truncate text-xs text-muted">{`${combinationName(variant.values, others, language)}${variant.status === 'archived' ? ` · ${t('keepsakes.variant.archivedTag')}` : ''}`}</span>
                  </span>
                  <ValueChips hideLabel small option={shown} value={variant.values[option.ref]} onChange={valueRef => draft.setVariantValue(variant.id, option.ref, valueRef)} />
                  <ProblemText at={variant.id} problems={draft.problems} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/** "Not saved. 2 things need a fix: …" above the blocks, after a refused Save. */
export function OptionsProblems({ problems }: { problems: Refusal[] }) {
  const { t } = useLocale()

  if (problems.length === 0)
    return null

  return (
    <RefusalAlert>
      {t(problems.length === 1 ? 'keepsakes.optionsSheet.notSaved.one' : 'keepsakes.optionsSheet.notSaved.other', { count: problems.length, texts: problems.map(problem => refusalText(t, problem)).join(' ') })}
    </RefusalAlert>
  )
}

/** The blocks of the options in focus (all of them, or one and the new ones), with Add an option. */
export function OptionsEditor({ draft, focus, canAdd = true }: { draft: OptionsDraftState, focus?: string, canAdd?: boolean }) {
  const { t } = useLocale()
  const shown = focus ? draft.options.filter(option => option.ref === focus || !draft.savedIds.has(option.ref)) : draft.options

  return (
    <div className="flex flex-col gap-4">
      {shown.map(option => <OptionBlock key={option.ref} draft={draft} option={option} />)}
      {draft.options.length === 0 && <p className="text-sm text-pretty text-muted">{t('keepsakes.optionsSheet.none')}</p>}
      {canAdd && (
        <Button className="self-start max-lg:h-11" variant="secondary" onPress={draft.addOption}>
          <PlusIcon aria-hidden size={16} />
          {t('keepsakes.optionsSheet.addAnother')}
        </Button>
      )}
      <GiveAll draft={draft} />
    </div>
  )
}
