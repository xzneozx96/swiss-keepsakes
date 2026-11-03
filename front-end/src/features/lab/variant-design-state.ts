/**
 * The variants and the one variant being created or edited, shared by V1 to V3. The rules stay (ADR-017, ADR-027): a
 * combination is sold once, every variant has one value of every option, a keepsake with no options is one variant,
 * archiving a variant with reserved units is refused, and an archived variant can't come back.
 */
import type { ProductId } from './keepsake-options-data'
import type { VRow, VState } from './variant-design-data'

import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'

import { combinationName, isCode, isComplete, labelOf, suggestCode } from './keepsake-options-rules'
import { vKeepsakes } from './variant-design-data'

export type Editing = null | 'new' | string

export interface Draft {
  values: Record<string, string>
  /** Undefined while the code follows the suggestion. */
  typedCode?: string
  price?: number
  status: 'published' | 'hidden'
}

export interface Shown { values?: string, code?: string, price?: string }

/** The variant with exactly these values, archived ones too (an archived combination stays taken). */
function rowAt(rows: VRow[], options: { ref: string }[], values: Record<string, string>) {
  return rows.find(row => options.every(option => row.values[option.ref] === values[option.ref]))
}

const EMPTY: Draft = { values: {}, status: 'published' }

const DASH = /-/g

/** A SKU that never breaks at its dashes inside a sentence. */
export const nb = (code: string) => code.replace(DASH, '\u2011')

export const chf = (price: number) => `CHF ${price.toFixed(2)}`

export function reservedText(row: VRow) {
  return `Can’t archive ${nb(row.code)}. ${row.reserved} ${row.reserved === 1 ? 'unit is' : 'units are'} reserved by open orders. Archive it once they are handed over or released.`
}

function seed(product: ProductId, state: VState) {
  const keepsake = vKeepsakes[product]
  const rows = state === 'new' ? [] : keepsake.rows
  const first = rows[0]
  const reservedRow = rows.find(row => row.reserved > 0) ?? first
  const freeValues = Object.fromEntries(keepsake.options.map((option, index) => [option.ref, option.values[Math.min(index + 1, option.values.length - 1)]!.ref]))

  if (state === 'taken' && first)
    return { rows, editing: 'new' as Editing, draft: { ...EMPTY, values: { ...first.values }, price: first.price }, tried: false, refusal: undefined }
  if (state === 'invalid')
    return { rows, editing: 'new' as Editing, draft: { ...EMPTY, values: keepsake.options.length > 0 ? freeValues : {}, typedCode: 'VX M EDEL!', price: undefined }, tried: true, refusal: undefined }
  if (state === 'refused' && reservedRow) {
    const row = reservedRow.reserved > 0 ? reservedRow : { ...reservedRow, reserved: 3 }

    return {
      rows: rows.map(r => (r.id === row.id ? row : r)),
      editing: row.id as Editing,
      draft: { values: { ...row.values }, typedCode: row.code, price: row.price, status: row.status === 'hidden' ? 'hidden' as const : 'published' as const },
      tried: false,
      refusal: { id: row.id, text: reservedText(row) },
    }
  }

  return { rows, editing: null as Editing, draft: EMPTY, tried: false, refusal: undefined }
}

export function useVariantStudio(product: ProductId, state: VState) {
  const keepsake = vKeepsakes[product]
  const { options, prefix } = keepsake
  const [start] = useState(() => seed(product, state))
  const [rows, setRows] = useState<VRow[]>(start.rows)
  const [editing, setEditing] = useState<Editing>(start.editing)
  const [draft, setDraft] = useState<Draft>(start.draft)
  const [tried, setTried] = useState(start.tried)
  const [refusal, setRefusal] = useState<{ id: string, text: string } | undefined>(start.refusal)
  const [notice, setNotice] = useState('')

  const live = rows.filter(row => row.status !== 'archived')
  const archived = rows.filter(row => row.status === 'archived')
  const current = editing && editing !== 'new' ? rows.find(row => row.id === editing) : undefined
  // Every variant keeps its combination, archived ones too: an archived combination stays taken.
  const others = rows.filter(row => row.id !== current?.id)
  const possible = options.length === 0 ? 1 : options.reduce((n, option) => n * option.values.length, 1)
  const canCreate = others.length < possible || current !== undefined
  const complete = isComplete(options, draft.values)
  const twin = options.length > 0 && complete ? rowAt(others, options, draft.values) : undefined
  const suggestion = complete ? suggestCode(prefix, draft.values, options) : ''
  const code = (draft.typedCode ?? suggestion).trim()

  const errors: Shown = {}

  if (!complete) {
    errors.values = `Choose ${options.map(option => `a ${labelOf(option.name).toLowerCase()}`).join(' and ')}.`
  }
  else if (twin) {
    errors.values = twin.status === 'archived'
      ? `${combinationName(draft.values, options)} was sold as ${nb(twin.code)}, now archived. An archived combination stays taken.`
      : `${combinationName(draft.values, options)} is already sold as ${nb(twin.code)}.`
  }
  if (!code)
    errors.code = 'Enter a SKU.'
  else if (!isCode(code))
    errors.code = 'Use capital letters, digits and dashes only, like VX-M-LUCERNE.'
  else if (others.some(row => row.code === code))
    errors.code = `${nb(code)} is used by another variant.`
  if (draft.price === undefined || Number.isNaN(draft.price) || draft.price <= 0)
    errors.price = 'Enter a price above CHF 0.'

  const shown: Shown = {
    // A sold combination is information, so it shows at once; the rest waits for a refused save.
    values: twin ? errors.values : tried ? errors.values : undefined,
    code: tried ? errors.code : undefined,
    price: tried ? errors.price : undefined,
  }

  function open(target: Editing) {
    setTried(false)
    setRefusal(undefined)
    setNotice('')
    setEditing(target)
    if (target === null || target === 'new') {
      setDraft(EMPTY)

      return
    }
    const row = rows.find(r => r.id === target)!

    setDraft({ values: { ...row.values }, typedCode: row.code, price: row.price, status: row.status === 'hidden' ? 'hidden' : 'published' })
  }

  return {
    keepsake,
    options,
    rows: live,
    archived,
    editing,
    current,
    draft,
    code,
    suggestion,
    twin,
    /** The clashing variant when it can be opened (not archived). */
    openable: twin && twin.status !== 'archived' ? twin : undefined,
    complete,
    shown,
    hasErrors: Boolean(errors.values || errors.code || errors.price),
    refusal,
    notice,
    possible,
    canCreate,
    combination: combinationName(draft.values, options),

    /** The live variant a value would collide with, once the other options are chosen. Ignores the variant being edited. */
    soldWith(optionRef: string, valueRef: string) {
      const values = { ...draft.values, [optionRef]: valueRef }

      return isComplete(options, values) ? rowAt(others, options, values) : undefined
    },
    open,
    close: () => open(null),
    setValue(optionRef: string, valueRef: string) {
      setDraft(d => ({ ...d, values: { ...d.values, [optionRef]: valueRef } }))
    },
    setCode: (next: string) => setDraft(d => ({ ...d, typedCode: next.toUpperCase() })),
    setPrice: (next: number | undefined) => setDraft(d => ({ ...d, price: next === undefined || Number.isNaN(next) ? undefined : next })),
    setStatus: (status: Draft['status']) => setDraft(d => ({ ...d, status })),
    /** Create or save. False (and errors shown) when something stops it. */
    save(): boolean {
      setTried(true)
      if (errors.values || errors.code || errors.price || !canCreate)
        return false
      if (current) {
        setRows(all => all.map(row => (row.id === current.id ? { ...row, code, price: draft.price!, status: draft.status, values: { ...draft.values } } : row)))
        setNotice(`${code} saved.`)
      }
      else {
        setRows(all => [...all, { id: `new-${all.length + 1}-${code}`, code, price: draft.price!, status: draft.status, stock: 0, reserved: 0, values: { ...draft.values } }])
        setNotice(`${code} added with 0 in stock. Set its stock in Inventory.`)
      }
      setEditing(null)
      setDraft(EMPTY)
      setTried(false)

      return true
    },
    setStatusNow(id: string, status: 'published' | 'hidden') {
      const row = rows.find(r => r.id === id)!

      setRows(all => all.map(r => (r.id === id ? { ...r, status } : r)))
      setNotice(`${row.code} ${status === 'published' ? 'is on sale' : 'is hidden'}.`)
    },
    /** True when the variant may be archived (the caller asks first). A variant with reserved units is refused here. */
    canArchive(id: string) {
      const row = rows.find(r => r.id === id)!

      if (row.reserved > 0) {
        setRefusal({ id, text: reservedText(row) })

        return false
      }
      setRefusal(undefined)

      return true
    },
    archive(id: string) {
      const row = rows.find(r => r.id === id)!

      setRows(all => all.map(r => (r.id === id ? { ...r, status: 'archived' } : r)))
      setEditing(null)
      setDraft(EMPTY)
      setNotice(`${row.code} archived. Its combination stays taken.`)
    },
  }
}

export type Studio = ReturnType<typeof useVariantStudio>

/** "Hidden", "Sold out": the only words a row needs besides its name and price. On sale with stock says nothing. */
export function rowFacts(row: VRow): string[] {
  return [row.status === 'hidden' ? 'Hidden' : '', row.stock === 0 ? 'Sold out' : ''].filter(Boolean)
}

export const priceText = (row: VRow) => chf(row.price)

/** Archive asks first, but a variant with reserved units is refused before the question: no point asking. */
export function useArchive(studio: Studio) {
  const { confirm, dialog } = useConfirm()

  const request = async (id: string) => {
    const row = studio.current?.id === id ? studio.current : undefined

    if (!studio.canArchive(id))
      return
    if (await confirm({ title: `Archive ${row?.code ?? 'this variant'}?`, body: 'It leaves the keepsake page and its combination stays taken. Old orders keep it. It can’t be put back on sale.', confirmLabel: 'Archive variant' }))
      studio.archive(id)
  }

  return { request, dialog }
}
