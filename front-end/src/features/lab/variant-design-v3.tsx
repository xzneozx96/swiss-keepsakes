/**
 * V3, say it in a sentence. The top of the block is one line that reads as what it does: "Sell [Medium] [Edelweiss]
 * for [CHF 39.00]". Each word in a pill is a native select or the price, so the whole create is three taps and Add.
 * The variants sit under it as quiet tiles; a tile loads into the same sentence to edit. SKU and On sale wait behind
 * "Details". A sold combination says so under the sentence and offers to open that variant instead.
 */
import type { OptionDraft } from './keepsake-options-data'
import type { VRow } from './variant-design-data'
import type { Studio } from './variant-design-state'

import { Button } from '@heroui/react'
import { useId, useState } from 'react'

import { Block } from '@/components/form-block'
import { ChevronDownIcon, ProductsIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { combinationName, labelOf } from './keepsake-options-rules'
import { ArchivedList, DetailsLine, Notice, OnSaleSwitch, Problem, SkuField, TextLink } from './variant-design-parts'
import { priceText, rowFacts, useArchive } from './variant-design-state'

const TOKEN = 'relative inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-surface px-3 align-middle font-medium shadow-surface transition-shadow duration-150 has-focus-visible:focus-ring'

function ValueToken({ studio, option }: { studio: Studio, option: OptionDraft }) {
  const chosen = option.values.find(value => value.ref === studio.draft.values[option.ref])
  const clash = studio.twin !== undefined

  return (
    <span className={`${TOKEN} ${chosen ? (clash ? 'text-danger' : '') : 'text-muted'}`}>
      <Swatch className="size-3.5" color={chosen?.swatch ?? null} />
      <select
        aria-label={labelOf(option.name)}
        className={`cursor-pointer appearance-none bg-transparent pe-5 outline-none [field-sizing:content] ${chosen ? '' : 'font-normal text-muted'}`}
        value={chosen?.ref ?? ''}
        onChange={event => studio.setValue(option.ref, event.target.value)}
      >
        <option disabled value="">{labelOf(option.name).toLowerCase()}</option>
        {option.values.map((value) => {
          const sold = studio.soldWith(option.ref, value.ref)

          // The chosen one stays plain in the pill; the line under the sentence explains a clash.
          return <option key={value.ref} value={value.ref}>{sold && value.ref !== chosen?.ref ? `${labelOf(value.label)} (sold)` : labelOf(value.label)}</option>
        })}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute end-2.5 text-muted" size={14} />
    </span>
  )
}

const NOT_NUMBER = /[^\d.]/g

function PriceToken({ studio }: { studio: Studio }) {
  const id = useId()
  const [text, setText] = useState(studio.draft.price === undefined ? '' : studio.draft.price.toFixed(2))

  return (
    <span className={`${TOKEN} ${studio.shown.price ? 'text-danger' : ''}`}>
      <label className="text-muted" htmlFor={id}>CHF</label>
      <input
        aria-invalid={studio.shown.price !== undefined || undefined}
        aria-label="Price in CHF"
        className="min-w-12 bg-transparent tabular-nums outline-none placeholder:font-normal placeholder:text-muted [field-sizing:content]"
        id={id}
        inputMode="decimal"
        placeholder="0.00"
        value={text}
        onChange={(event) => {
          const clean = event.target.value.replace(',', '.').replace(NOT_NUMBER, '')

          setText(clean)
          studio.setPrice(clean === '' ? undefined : Number(clean))
        }}
      />
    </span>
  )
}

function Composer({ studio, onArchive }: { studio: Studio, onArchive: (id: string) => void }) {
  const row = studio.current
  const [details, setDetails] = useState(false)
  const showDetails = details || studio.shown.code !== undefined
  const hasOptions = studio.options.length > 0
  const blocked = !studio.canCreate && !row

  if (blocked) {
    return (
      <p className="rounded-3xl bg-surface-secondary p-5 text-sm text-pretty text-muted">
        {hasOptions ? 'Every combination is sold. Add a value in Options to sell more.' : 'No options, so this keepsake is one variant, and it exists. Add an option, like a size, to sell more than one.'}
      </p>
    )
  }

  return (
    <form
      aria-label={row ? `Edit ${row.code}` : 'New variant'}
      className="flex flex-col gap-4 rounded-3xl bg-surface-secondary p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        studio.save()
      }}
    >
      {row && <p className="text-sm text-muted">{`Editing ${row.code} · ${row.stock} in stock`}</p>}
      {/* From 640 px Add variant ends the sentence's line; on a phone it comes last, after any problem (the other copy is display: none). */}
      <div className="flex items-center gap-6">
        <p className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-2.5 text-lg lg:text-xl">
          <span>Sell</span>
          {studio.options.map(option => <ValueToken key={option.ref} option={option} studio={studio} />)}
          {!hasOptions && <span>it</span>}
          <span>for</span>
          <PriceToken studio={studio} />
        </p>
        {!row && <Button className="shrink-0 max-sm:hidden" type="submit">Add variant</Button>}
      </div>

      {studio.shown.values && (
        <Problem action={studio.openable && <TextLink onPress={() => studio.open(studio.openable!.id)}>Edit that one</TextLink>}>{studio.shown.values}</Problem>
      )}
      {studio.shown.price && <Problem>{studio.shown.price}</Problem>}

      {showDetails
        ? (
            <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <SkuField focusOnOpen={details && !studio.shown.code} studio={studio} />
              <div className="sm:pt-6">
                <OnSaleSwitch studio={studio} />
              </div>
            </div>
          )
        : (
            <DetailsLine studio={studio} onOpen={() => setDetails(true)} />
          )}

      {studio.refusal && studio.refusal.id === row?.id && <Problem>{studio.refusal.text}</Problem>}

      {!row && <Button className="min-h-12 w-full sm:hidden" type="submit">Add variant</Button>}
      {row && (
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
          <Button className="max-sm:min-h-12 max-sm:w-full" type="submit">Save</Button>
          <div className="flex justify-center gap-6 sm:me-auto sm:gap-5">
            <TextLink onPress={studio.close}>Cancel</TextLink>
            <TextLink tone="danger" onPress={() => onArchive(row.id)}>Archive</TextLink>
          </div>
        </div>
      )}
    </form>
  )
}

function Tile({ studio, row }: { studio: Studio, row: VRow }) {
  const title = studio.options.length > 0 ? combinationName(row.values, studio.options) : row.code
  const facts = rowFacts(row)
  const active = studio.editing === row.id

  return (
    <li>
      <button
        aria-current={active || undefined}
        className={`flex h-full w-full flex-col items-start gap-1 rounded-2xl p-3.5 text-start transition-[background-color,box-shadow] duration-150 outline-none focus-visible:focus-ring ${active ? 'bg-surface shadow-surface ring-2 ring-foreground' : 'bg-default/40 hover:bg-default/70'}`}
        type="button"
        onClick={() => studio.open(active ? null : row.id)}
      >
        <span className="line-clamp-2 text-sm font-medium">{title}</span>
        <span className="text-sm tabular-nums">{priceText(row)}</span>
        <span className="text-xs text-muted">{facts.length > 0 ? facts.join(' · ') : `${row.stock} in stock`}</span>
      </button>
    </li>
  )
}

export function VariantsV3({ studio }: { studio: Studio }) {
  const archive = useArchive(studio)

  return (
    <Block hint={studio.options.length > 0 ? `${studio.rows.length} of ${studio.possible} combinations are sold.` : 'No options, so this keepsake is one variant.'} icon={ProductsIcon} title="Variants">
      <Composer key={studio.editing ?? 'new'} studio={studio} onArchive={id => void archive.request(id)} />
      <Notice text={studio.notice} />
      {studio.rows.length > 0 && (
        <ul aria-label="Variants. Choose one to edit it in the sentence above." className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {studio.rows.map(row => <Tile key={row.id} row={row} studio={studio} />)}
        </ul>
      )}
      <ArchivedList studio={studio} />
      {archive.dialog}
    </Block>
  )
}
