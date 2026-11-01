/**
 * V2, one variant at a time. The block shows a short list; a variant (or Add variant) replaces the list with that one
 * variant, like a settings page: its name large at the top, then a few rows, label on the left and value on the right.
 * A value row is a native select laid over the row, so a phone opens its own picker. Back returns to the list.
 */
import type { OptionDraft } from './keepsake-options-data'
import type { VRow } from './variant-design-data'
import type { Studio } from './variant-design-state'

import { Button } from '@heroui/react'
import { useId, useState } from 'react'

import { Block } from '@/components/form-block'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, ProductsIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { combinationName, labelOf } from './keepsake-options-rules'
import { ArchivedList, Notice, OnSaleSwitch, Problem, TextLink } from './variant-design-parts'
import { priceText, rowFacts, useArchive } from './variant-design-state'

const ROW = 'relative flex min-h-13 items-center gap-3 px-4'
const GROUP = 'flex flex-col divide-y divide-separator/70 overflow-hidden rounded-2xl bg-surface-secondary'

function ValueRow({ studio, option }: { studio: Studio, option: OptionDraft }) {
  const id = useId()
  const chosen = option.values.find(value => value.ref === studio.draft.values[option.ref])
  const invalid = studio.shown.values !== undefined

  return (
    <div className={`${ROW} transition-colors duration-150 has-[select:focus-visible]:bg-default/60 hover:bg-default/40`}>
      <span className="text-sm" id={`${id}-label`}>{labelOf(option.name)}</span>
      <span className={`ms-auto flex items-center gap-2 text-sm ${chosen ? (invalid && studio.twin ? 'text-danger' : 'font-medium') : 'text-muted'}`}>
        <Swatch className="size-3.5" color={chosen?.swatch ?? null} />
        {chosen ? labelOf(chosen.label) : 'Choose'}
      </span>
      <ChevronDownIcon aria-hidden className="shrink-0 text-muted" size={16} />
      <select
        aria-describedby={invalid ? `${id}-problem` : undefined}
        aria-labelledby={`${id}-label`}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={chosen?.ref ?? ''}
        onChange={event => studio.setValue(option.ref, event.target.value)}
      >
        <option disabled value="">Choose</option>
        {option.values.map((value) => {
          const sold = studio.soldWith(option.ref, value.ref)

          return <option key={value.ref} value={value.ref}>{sold ? `${labelOf(value.label)} (sold as ${sold.code})` : labelOf(value.label)}</option>
        })}
      </select>
    </div>
  )
}

/** A text entry that reads as the row's value: right-aligned, no box until focused. */
function InlineInput({ label, value, placeholder, invalid, mono, inputMode, onChange }: {
  label: string
  value: string
  placeholder: string
  invalid: boolean
  mono?: boolean
  inputMode?: 'decimal'
  onChange: (next: string) => void
}) {
  const id = useId()

  return (
    <div className={`${ROW} has-[input:focus-visible]:bg-default/60`}>
      <label className="shrink-0 text-sm" htmlFor={id}>{label}</label>
      <input
        aria-invalid={invalid || undefined}
        className={`min-w-0 flex-1 bg-transparent py-3 text-end text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted ${mono ? 'font-mono' : 'tabular-nums'} ${invalid ? 'text-danger' : ''}`}
        id={id}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  )
}

const NOT_NUMBER = /[^\d.]/g

/** The price as typed ("39." stays "39."), read as a number for the checks. */
function PriceRow({ studio }: { studio: Studio }) {
  const [text, setText] = useState(studio.draft.price === undefined ? '' : studio.draft.price.toFixed(2))

  return (
    <InlineInput
      inputMode="decimal"
      invalid={studio.shown.price !== undefined}
      label="Price, CHF"
      placeholder="0.00"
      value={text}
      onChange={(next) => {
        const clean = next.replace(',', '.').replace(NOT_NUMBER, '')

        setText(clean)
        studio.setPrice(clean === '' ? undefined : Number(clean))
      }}
    />
  )
}

function Detail({ studio, onArchive }: { studio: Studio, onArchive: (id: string) => void }) {
  const isNew = studio.editing === 'new'
  const row = studio.current
  const hasOptions = studio.options.length > 0
  const title = hasOptions ? (studio.complete ? studio.combination : 'New variant') : (row?.code ?? studio.keepsake.name)
  const problems = [studio.shown.values, studio.shown.price, studio.shown.code].filter(Boolean)

  return (
    <form
      aria-label={isNew ? 'New variant' : `Edit ${row!.code}`}
      className="flex w-full max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        studio.save()
      }}
    >
      <div className="flex flex-col gap-3">
        <Button className="-ms-2 self-start max-lg:h-11 lg:hidden" variant="ghost" onPress={studio.close}>
          <ChevronLeftIcon aria-hidden size={16} />
          All variants
        </Button>
        <div className="flex flex-col gap-1">
          <h4 className="font-serif text-title text-balance">{title}</h4>
          <p className="text-sm text-muted">{isNew ? 'Starts with 0 in stock. Stock is set in Inventory.' : `${row!.stock} in stock · ${row!.reserved > 0 ? `${row!.reserved} reserved · ` : ''}set in Inventory`}</p>
        </div>
      </div>

      {hasOptions && (
        <div className="flex flex-col gap-2">
          <div className={GROUP}>
            {studio.options.map(option => <ValueRow key={option.ref} option={option} studio={studio} />)}
          </div>
          {studio.shown.values && (
            <Problem action={studio.openable && <TextLink onPress={() => studio.open(studio.openable!.id)}>{`Open ${studio.openable.code}`}</TextLink>}>
              {studio.shown.values}
            </Problem>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className={GROUP}>
          <PriceRow studio={studio} />
          <InlineInput mono invalid={studio.shown.code !== undefined} label="SKU" placeholder={studio.suggestion || 'Made from the values'} value={studio.draft.typedCode ?? ''} onChange={studio.setCode} />
          <div className={ROW}>
            <OnSaleSwitch spread studio={studio} />
          </div>
        </div>
        {studio.shown.price && <Problem>{studio.shown.price}</Problem>}
        {studio.shown.code && <Problem>{studio.shown.code}</Problem>}
      </div>

      {studio.refusal && studio.refusal.id === row?.id && <Problem>{studio.refusal.text}</Problem>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        <Button className="max-sm:min-h-12 max-sm:w-full" type="submit">{isNew ? 'Add variant' : 'Save'}</Button>
        {!isNew && (
          <Button className="text-danger max-sm:h-11 max-sm:self-center sm:-ms-4 sm:me-auto" variant="ghost" onPress={() => onArchive(row!.id)}>Archive variant</Button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{problems.length > 1 ? `${problems.length} things to fix` : ''}</p>
    </form>
  )
}

/** A variant in the list: O3's row (name over a muted line, rounded hover, the open one tinted from 1024 px). */
function ListRow({ studio, row }: { studio: Studio, row: VRow }) {
  const title = studio.options.length > 0 ? combinationName(row.values, studio.options) : row.code
  const facts = rowFacts(row)
  const current = studio.editing === row.id

  return (
    <li>
      <button
        aria-current={current ? 'true' : undefined}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start transition-colors duration-150 outline-none hover:bg-default/50 focus-visible:focus-ring lg:aria-[current]:bg-default"
        type="button"
        onClick={() => studio.open(row.id)}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{title}</span>
          <span className="truncate text-sm text-muted">{[priceText(row), ...facts].join(' · ')}</span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0 text-muted lg:hidden" size={18} />
      </button>
    </li>
  )
}

export function VariantsV2({ studio }: { studio: Studio }) {
  const archive = useArchive(studio)
  const open = studio.editing !== null
  const add = studio.canCreate && (
    <Button className="-ms-1 self-start max-lg:h-11" variant={studio.rows.length === 0 ? 'primary' : 'ghost'} onPress={() => studio.open('new')}>
      <PlusIcon aria-hidden size={16} />
      Add variant
    </Button>
  )

  return (
    <Block
      hint={studio.options.length > 0 ? `${studio.rows.length} of ${studio.possible} combinations are sold.` : 'No options, so this keepsake is one variant.'}
      icon={ProductsIcon}
      title="Variants"
    >
      <Notice text={studio.notice} />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Variants" className={`flex flex-col gap-1 ${open ? 'max-lg:hidden' : ''}`}>
          {studio.rows.length === 0
            ? <p className="px-1 pb-2 text-sm text-pretty text-muted">No variants yet.</p>
            : <ul className="flex flex-col gap-1">{studio.rows.map(row => <ListRow key={row.id} row={row} studio={studio} />)}</ul>}
          {add}
          <div className="px-1 pt-2">
            <ArchivedList studio={studio} />
          </div>
        </nav>
        <div className={open ? '' : 'max-lg:hidden'}>
          {open
            ? <Detail key={studio.editing} studio={studio} onArchive={id => void archive.request(id)} />
            : (
                <p className="pt-3 text-sm text-pretty text-muted">
                  {studio.canCreate ? 'Choose a variant to change it, or add one.' : 'Choose a variant to change it.'}
                </p>
              )}
        </div>
      </div>
      {archive.dialog}
    </Block>
  )
}
