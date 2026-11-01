/**
 * V1, quiet list that opens in place. The variants are plain rows grouped by the first option (no table, no borders).
 * A row opens where it is into a soft panel with only what changes most: the values as pills and the price. The SKU
 * and On sale wait behind one "Details" line. Add variant opens the same panel at the top.
 */
import type { OptionDraft } from './keepsake-options-data'
import type { VRow } from './variant-design-data'
import type { Studio } from './variant-design-state'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { CloseIcon, PlusIcon, ProductsIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { combinationName, labelOf } from './keepsake-options-rules'
import { ArchivedList, DetailsLine, Notice, OnSaleSwitch, PriceField, Problem, SkuField, TextLink } from './variant-design-parts'
import { priceText, rowFacts, useArchive } from './variant-design-state'

/** One option's values as a row of pills: a real radio group, so arrows move and Tab leaves. A sold combination is struck through but can be picked; the line below explains. */
function ValuePills({ studio, option }: { studio: Studio, option: OptionDraft }) {
  const name = `v1-${option.ref}`

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-muted">{labelOf(option.name)}</legend>
      <div className="flex flex-wrap gap-2">
        {option.values.map((value) => {
          const sold = studio.soldWith(option.ref, value.ref)
          const checked = studio.draft.values[option.ref] === value.ref

          return (
            <label
              key={value.ref}
              className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm transition-[background-color,color,box-shadow] duration-150 has-focus-visible:focus-ring lg:min-h-10 ${checked ? 'bg-foreground font-medium text-background' : 'bg-surface text-foreground shadow-surface hover:bg-default'} ${sold && !checked ? 'text-muted line-through decoration-1' : ''}`}
            >
              <input checked={checked} className="sr-only" name={name} type="radio" value={value.ref} onChange={() => studio.setValue(option.ref, value.ref)} />
              <Swatch className="size-3.5" color={value.swatch} />
              {labelOf(value.label)}
              {sold && <span className="sr-only">{`, already sold as ${sold.code}`}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function Editor({ studio, onArchive }: { studio: Studio, onArchive: (id: string) => void }) {
  const isNew = studio.editing === 'new'
  const row = studio.current
  const hasOptions = studio.options.length > 0
  // Details open by themselves when they hold the problem.
  const [details, setDetails] = useState(studio.shown.code !== undefined)
  const [changeValues, setChangeValues] = useState(false)
  const showDetails = details || studio.shown.code !== undefined
  const showValues = hasOptions && (isNew || changeValues)
  const title = isNew ? 'New variant' : (hasOptions ? combinationName(row!.values, studio.options) : row!.code)

  return (
    <form
      aria-label={isNew ? 'New variant' : `Edit ${row!.code}`}
      className="flex animate-rise flex-col gap-5 rounded-3xl bg-surface-secondary p-4 lg:p-5"
      onSubmit={(event) => {
        event.preventDefault()
        studio.save()
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="font-semibold">{title}</h4>
          {!isNew && <p className="text-sm text-muted">{`${row!.stock} in stock · set in Inventory`}</p>}
          {isNew && hasOptions && <p className="text-sm text-muted">Pick one of each. Sold combinations are struck through.</p>}
        </div>
        <Button isIconOnly aria-label="Close without saving" className="-me-1 -mt-1" size="sm" variant="tertiary" onPress={studio.close}>
          <CloseIcon aria-hidden size={18} />
        </Button>
      </div>

      {showValues && studio.options.map(option => <ValuePills key={option.ref} option={option} studio={studio} />)}
      {studio.shown.values && (
        <Problem action={studio.openable && <TextLink onPress={() => studio.open(studio.openable!.id)}>{`Edit ${studio.openable.code}`}</TextLink>}>
          {studio.shown.values}
        </Problem>
      )}

      <PriceField className="sm:max-w-56" studio={studio} />

      {showDetails
        ? (
            <div className="flex flex-col gap-4">
              <SkuField focusOnOpen={details && !studio.shown.code} studio={studio} />
              <OnSaleSwitch studio={studio} />
            </div>
          )
        : (
            <DetailsLine studio={studio} onOpen={() => setDetails(true)} />
          )}

      {studio.refusal && studio.refusal.id === row?.id && <Problem>{studio.refusal.text}</Problem>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:gap-2">
        <Button className="max-sm:min-h-12 max-sm:w-full" type="submit">{isNew ? 'Add variant' : 'Save'}</Button>
        <Button className="max-sm:hidden" type="button" variant="ghost" onPress={studio.close}>Cancel</Button>
        <div className="flex justify-center gap-6 sm:me-auto sm:justify-start sm:gap-5">
          <span className="sm:hidden">
            <TextLink onPress={studio.close}>Cancel</TextLink>
          </span>
          {!isNew && hasOptions && !changeValues && <TextLink onPress={() => setChangeValues(true)}>Change values</TextLink>}
          {!isNew && <TextLink tone="danger" onPress={() => onArchive(row!.id)}>Archive</TextLink>}
        </div>
      </div>
    </form>
  )
}

function Row({ studio, row, title }: { studio: Studio, row: VRow, title: string }) {
  const facts = rowFacts(row)
  const swatch = studio.options.at(-1)?.values.find(v => v.ref === row.values[studio.options.at(-1)!.ref])?.swatch ?? null

  return (
    <li>
      <button
        aria-label={`${title}, ${priceText(row)}${facts.length ? `, ${facts.join(', ')}` : ''}. Edit`}
        className="-mx-3 flex min-h-13 w-[calc(100%+1.5rem)] lg:min-h-12 items-center gap-3 rounded-2xl px-3 text-start transition-colors duration-150 outline-none hover:bg-default/50 focus-visible:focus-ring"
        type="button"
        onClick={() => studio.open(row.id)}
      >
        <Swatch className="size-4" color={swatch} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {facts.length > 0 && <span className="shrink-0 text-xs text-muted">{facts.join(' · ')}</span>}
        <span className="w-24 shrink-0 text-end text-sm tabular-nums">{priceText(row)}</span>
      </button>
    </li>
  )
}

/** Grouped by the first option when there are two or more (Shopify's "group by"), so each row only names what differs. */
function groups(studio: Studio): { label?: string, rows: { row: VRow, title: string }[] }[] {
  const { options, rows } = studio

  if (options.length < 2)
    return [{ rows: rows.map(row => ({ row, title: options.length ? combinationName(row.values, options) : row.code })) }]
  const [first, ...rest] = options

  return first!.values
    .map(value => ({
      label: labelOf(value.label),
      rows: rows.filter(row => row.values[first!.ref] === value.ref).map(row => ({ row, title: combinationName(row.values, rest) })),
    }))
    .filter(group => group.rows.length > 0)
}

export function VariantsV1({ studio }: { studio: Studio }) {
  const archive = useArchive(studio)
  const free = studio.possible - studio.rows.length - studio.archived.length
  const editor = <Editor key={studio.editing ?? 'none'} studio={studio} onArchive={id => void archive.request(id)} />

  return (
    <Block
      hint={studio.options.length > 0 ? `${studio.rows.length} of ${studio.possible} combinations are sold.` : 'No options, so this keepsake is one variant.'}
      icon={ProductsIcon}
      title="Variants"
      trailing={studio.editing !== 'new' && studio.canCreate && (
        <Button className="max-lg:hidden" size="sm" onPress={() => studio.open('new')}>
          <PlusIcon aria-hidden size={16} />
          Add variant
        </Button>
      )}
    >
      <Notice text={studio.notice} />
      {studio.editing !== 'new' && studio.canCreate && (
        <Button className="min-h-11 self-start lg:hidden" onPress={() => studio.open('new')}>
          <PlusIcon aria-hidden size={16} />
          Add variant
        </Button>
      )}
      {studio.editing === 'new' && editor}

      {studio.rows.length === 0 && studio.editing !== 'new' && (
        <p className="py-6 text-center text-sm text-pretty text-muted">{studio.options.length > 0 ? 'No variants yet. Add the first combination you sell.' : 'No variant yet. Give it a price to sell it.'}</p>
      )}

      <div className="flex flex-col gap-6">
        {groups(studio).map(group => (
          <section key={group.label ?? 'all'} aria-label={group.label} className="flex flex-col">
            {group.label && <h4 className="pb-0.5 text-label text-muted">{group.label}</h4>}
            <ul className="flex flex-col">
              {group.rows.map(({ row, title }) => (studio.editing === row.id
                ? <li key={row.id} className="py-1">{editor}</li>
                : <Row key={row.id} row={row} studio={studio} title={title} />))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <ArchivedList studio={studio} />
        <p className="text-xs text-pretty text-muted">
          {studio.options.length === 0
            ? 'Add an option, like a size, to sell more than one.'
            : free > 0 ? `${free} more ${free === 1 ? 'combination' : 'combinations'} could be sold. Stock is set in Inventory.` : 'Every combination is sold. Add a value in Options to sell more.'}
        </p>
      </div>
      {archive.dialog}
    </Block>
  )
}
