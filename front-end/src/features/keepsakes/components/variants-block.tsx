import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { Values } from '../lib/option-rules'
import type { VariantActions } from '../lib/variant-actions'

import { Button, Checkbox, Label, ListBox, Select } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { Block } from '@/components/form-block'
import { ChevronDownIcon, ProductsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { groupByFirstOption, priceRange } from '../lib/combinations'
import { chf } from '../lib/keepsake-rules'
import { combinationName, labelOf, refusalText, variantTitle } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { QuietNote } from './option-bits'
import { PreviewRow, VariantRow } from './variant-row'
import { VariantSheet } from './variant-sheet'
import { VariantsBulkBar } from './variants-bulk-bar'

const ALL = '__all__'
const NONE = '__none__'

/** What the merchant is told when a request was refused, in the words of the refusal or of the problem. */
function failureText(t: ReturnType<typeof useLocale>['t'], outcome: Extract<Outcome, { ok: false }>) {
  return outcome.refusals && outcome.refusals.length > 0 ? outcome.refusals.map(refusal => refusalText(t, refusal)).join(' ') : t(problemMessageKey(outcome.type))
}

/** Archived variants, folded away: they stay for old orders, keep their combination and can't be put back on sale. */
function ArchivedList({ variants, options }: { variants: ProductVariant[], options: ProductOption[] }) {
  const { t, language } = useLocale()

  if (variants.length === 0)
    return null

  return (
    <details className="group px-1 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-muted outline-none focus-visible:focus-ring lg:min-h-0 [&::-webkit-details-marker]:hidden">
        {t('keepsakes.variants.archived', { count: variants.length })}
        <ChevronDownIcon aria-hidden className="transition-transform duration-200 group-open:rotate-180" size={14} />
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-muted">
        {variants.map(variant => (
          <li key={variant.id} className="flex justify-between gap-3">
            <span className="truncate">{options.length > 0 ? combinationName(variant.values, options, language) : variant.skuCode}</span>
            <span className="shrink-0 font-mono text-xs">{variant.skuCode}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{t('keepsakes.variants.archivedNote')}</p>
    </details>
  )
}

/** "All", "None" and each value of each option: ticks the rows that match. Choosing leaves the field empty, as it is a menu. */
function SelectMenu({ options, onPick }: { options: ProductOption[], onPick: (key: string) => void }) {
  const { t, language } = useLocale()

  return (
    <Select aria-label={t('keepsakes.variants.selectMenu')} className="w-44" placeholder={t('keepsakes.variants.selectMenu')} selectedKey={null} variant="secondary" onSelectionChange={key => key !== null && onPick(String(key))}>
      <Label className="sr-only">{t('keepsakes.variants.selectMenu')}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={ALL} textValue={t('keepsakes.variants.selectAll')}>{t('keepsakes.variants.selectAll')}</ListBox.Item>
          <ListBox.Item id={NONE} textValue={t('keepsakes.variants.selectNone')}>{t('keepsakes.variants.selectNone')}</ListBox.Item>
          {options.flatMap(option => option.values.filter(value => labelOf(value.label)).map((value) => {
            const text = options.length > 1 ? `${labelOf(option.name, language)}: ${labelOf(value.label, language)}` : labelOf(value.label, language)

            return <ListBox.Item key={`${option.id}:${value.id}`} id={`${option.id}:${value.id}`} textValue={text}>{text}</ListBox.Item>
          }))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

/**
 * The Variants block of the merged step: a row for every combination that is sold, grouped by the first option when
 * there are two or more, with select, bulk actions, the combinations that are not sold and the archived ones. The rows an
 * open option will bring show muted under the others (`preview`). Prices save when the field is left; Edit opens the sheet.
 */
export function VariantsBlock({ options, variants, held, actions, preview, notSold }: {
  /** The options the rows are named by: the finished ones. */
  options: ProductOption[]
  /** Every variant, archived ones too. */
  variants: ProductVariant[]
  held: boolean
  actions: VariantActions
  /** The rows an open option will bring, named by the options as they would be. */
  preview?: { options: ProductOption[], rows: Values[], price: number }
  /** Combinations of the options that no variant holds. */
  notSold: Values[]
}) {
  const { t, language, intlLocale } = useLocale()
  const { confirm, dialog } = useConfirm()
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [editing, setEditing] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const live = variants.filter(variant => variant.status !== 'archived')
  const archived = variants.filter(variant => variant.status === 'archived')
  const groups = options.length >= 2 ? groupByFirstOption(options, live) : []
  const ticked = live.filter(variant => selected.has(variant.id))
  const editingVariant = variants.find(variant => variant.id === editing)

  const run = async (work: () => Promise<Outcome>) => {
    setFailure(undefined)
    setIsPending(true)
    const outcome = await work()

    setIsPending(false)
    if (!outcome.ok)
      setFailure(failureText(t, outcome))

    return outcome
  }
  const tick = (ids: string[], on: boolean) => setSelected((current) => {
    const next = new Set(current)

    for (const id of ids) {
      if (on)
        next.add(id)
      else
        next.delete(id)
    }

    return next
  })
  const pick = (key: string) => {
    if (key === ALL)
      setSelected(new Set(live.map(variant => variant.id)))
    else if (key === NONE)
      setSelected(new Set())
    else
      setSelected(new Set(live.filter(variant => Object.entries(variant.values).some(([option, value]) => `${option}:${value}` === key)).map(variant => variant.id)))
  }
  const forTicked = (patch: { priceRappen?: number, status?: 'published' | 'draft' }) => void run(() => actions.saveVariants(ticked.map(variant => ({ id: variant.id, ...patch }))))

  /** Archiving is final, so it asks first and waits for the server inside the dialog: a refusal (units reserved) stays there. A new keepsake's rows are only removed. */
  const archive = async (rows: ProductVariant[], afterwards: () => void) => {
    const label = rows.length === 1 ? (options.length > 0 ? variantTitle(rows[0]!.values, options, language) : rows[0]!.skuCode) : ''

    await confirm({
      title: t(`keepsakes.variants.${held ? 'removeMany' : 'archiveMany'}.title.${rows.length === 1 ? 'one' : 'other'}`, { count: rows.length, name: label }),
      body: t(`keepsakes.variants.${held ? 'removeMany' : 'archiveMany'}.body.${rows.length === 1 ? 'one' : 'other'}`, { count: rows.length }),
      confirmLabel: t(held ? 'keepsakes.variants.remove' : 'keepsakes.variant.archive.confirm'),
      run: async () => {
        const outcome = rows.length === 1
          ? await actions.saveVariant(rows[0]!.id, { status: 'archived' })
          : await actions.saveVariants(rows.map(variant => ({ id: variant.id, status: 'archived' as const })))

        if (!outcome.ok)
          throw new Error(failureText(t, outcome))
        afterwards()
      },
      problem: error => (error instanceof Error ? error.message : t(problemMessageKey('unknown'))),
    })
  }

  const row = (variant: ProductVariant) => (
    <VariantRow
      key={variant.id}
      held={held}
      isSelected={selected.has(variant.id)}
      options={options}
      variant={variant}
      onEdit={() => setEditing(variant.id)}
      onPrice={rappen => void run(() => actions.saveVariant(variant.id, { priceRappen: rappen }))}
      onSelect={on => tick([variant.id], on)}
    />
  )

  return (
    <Block hint={t('keepsakes.variants.hint')} icon={ProductsIcon} id="variants" title={t('keepsakes.variants.title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted">{t(live.length === 1 ? 'keepsakes.list.variants.one' : 'keepsakes.list.variants.other', { count: live.length })}</span>
        <SelectMenu options={options} onPick={pick} />
      </div>
      {ticked.length > 0 && (
        <VariantsBulkBar
          count={ticked.length}
          held={held}
          isPending={isPending}
          onArchive={() => void archive(ticked, () => setSelected(new Set()))}
          onPrice={rappen => forTicked({ priceRappen: rappen })}
          onStatus={status => forTicked({ status })}
        />
      )}
      {failure && <QuietNote>{failure}</QuietNote>}

      {groups.length > 0
        ? (
            <div className="flex flex-col gap-2">
              {groups.map((group) => {
                const ids = group.rows.map(variant => variant.id)
                const all = ids.every(id => selected.has(id))
                const some = !all && ids.some(id => selected.has(id))
                const isCollapsed = collapsed.has(group.value.id)
                const range = priceRange(group.rows)
                const name = labelOf(group.value.label, language)

                return (
                  <section key={group.value.id} aria-label={name} className="flex flex-col" data-testid="variant-group">
                    <div className="flex min-h-11 items-center gap-2 px-2">
                      <Checkbox aria-label={t('keepsakes.variants.selectGroup', { name })} isIndeterminate={some} isSelected={all} onChange={on => tick(ids, on)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                      <button
                        aria-expanded={!isCollapsed}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl text-start outline-none focus-visible:focus-ring"
                        type="button"
                        onClick={() => setCollapsed((current) => {
                          const next = new Set(current)

                          if (isCollapsed)
                            next.delete(group.value.id)
                          else
                            next.add(group.value.id)

                          return next
                        })}
                      >
                        <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${isCollapsed ? '-rotate-90' : ''}`} size={16} />
                        <span className="truncate font-medium">{name}</span>
                        <span className="ms-auto shrink-0 text-xs text-muted tabular-nums">
                          {t(group.rows.length === 1 ? 'keepsakes.list.variants.one' : 'keepsakes.list.variants.other', { count: group.rows.length })}
                          {range && ` · ${range.min === range.max ? chf(range.min, intlLocale) : `${chf(range.min, intlLocale)}–${chf(range.max, intlLocale)}`}`}
                        </span>
                      </button>
                    </div>
                    {!isCollapsed && <ul className="flex flex-col">{group.rows.map(row)}</ul>}
                  </section>
                )
              })}
            </div>
          )
        : <ul className="flex flex-col">{live.map(row)}</ul>}

      {preview && preview.rows.length > 0 && (
        <div className="flex flex-col gap-1" data-testid="variants-preview">
          <p aria-live="polite" className="px-2 text-sm font-medium text-muted" role="status">{t(preview.rows.length === 1 ? 'keepsakes.variants.preview.one' : 'keepsakes.variants.preview.other', { count: preview.rows.length })}</p>
          <ul className="flex flex-col">{preview.rows.map((values, index) => <PreviewRow key={index} options={preview.options} price={preview.price} values={values} />)}</ul>
        </div>
      )}

      {notSold.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 px-2 text-sm text-muted" data-testid="not-sold">
          <span>{t('keepsakes.variants.notSold', { count: notSold.length })}</span>
          <Button className="max-lg:h-11" isDisabled={isPending} size="sm" variant="ghost" onPress={() => void run(() => actions.addBack(notSold))}>{t('keepsakes.variants.addBack')}</Button>
        </p>
      )}
      <ArchivedList options={options} variants={archived} />

      {editingVariant && (
        <VariantSheet
          held={held}
          options={options}
          variant={editingVariant}
          variants={variants}
          onArchive={() => void archive([editingVariant], () => setEditing(undefined))}
          onClose={() => setEditing(undefined)}
          onSave={actions.saveVariant}
        />
      )}
      {dialog}
    </Block>
  )
}
