/**
 * Lab (v2): three calm designs for a keepsake's variants: see them, create one, edit one. Mock data in memory, nothing
 * is stored. The options and the knife's variants come from the first variant lab (keepsake-options-data.ts); this file
 * adds what the new designs need: an archived status, reserved units, a sold-out variant and a keepsake with no options.
 */
import type { OptionDraft, ProductId } from './keepsake-options-data'

import { keepsakes as base } from './keepsake-options-data'

export type VDesignId = 'v1' | 'v2' | 'v3'
export type VState = 'normal' | 'taken' | 'invalid' | 'refused' | 'new'
export type VWidth = 'laptop' | 'phone'

export interface VRow {
  id: string
  code: string
  /** CHF. */
  price: number
  status: 'published' | 'hidden' | 'archived'
  /** Read only here: stock is set in Inventory. */
  stock: number
  /** Units held by open orders: such a variant can't be archived. */
  reserved: number
  /** One value ref per option ref. */
  values: Record<string, string>
}

export interface VKeepsake {
  id: ProductId
  name: string
  prefix: string
  options: OptionDraft[]
  rows: VRow[]
}

export interface VariantLabSearch {
  design: VDesignId
  width: VWidth
  product: ProductId
  state: VState
  /** 1 inside the frame: only the design, at the frame's own width. */
  embed?: 1
}

const knifeRows: VRow[] = base.knife.variants.map(variant => ({
  ...variant,
  // The one sold out (on sale, nothing left) and one hidden, so the list shows both quiet states.
  status: variant.id === 'v5' ? 'hidden' : 'published',
  stock: variant.id === 'v3' ? 0 : variant.stock,
  reserved: variant.id === 'v4' ? 2 : 0,
}))

export const vKeepsakes: Record<ProductId, VKeepsake> = {
  knife: { id: 'knife', name: base.knife.name, prefix: base.knife.prefix, options: base.knife.options, rows: knifeRows },
  swisscard: {
    id: 'swisscard',
    name: base.swisscard.name,
    prefix: base.swisscard.prefix,
    options: base.swisscard.options,
    rows: base.swisscard.variants.map(variant => ({ ...variant, reserved: 0 })),
  },
  empty: {
    id: 'empty',
    name: 'Chapel Bridge postcard set',
    prefix: 'PC',
    options: [],
    rows: [{ id: 'p1', code: 'PC-SET', price: 12, status: 'published', stock: 30, reserved: 0, values: {} }],
  },
}

export const vProducts: { id: ProductId, label: string }[] = [
  { id: 'knife', label: 'Knife: Size × Theme, 6 of 9 sold' },
  { id: 'swisscard', label: 'SwissCard: Colour with swatches' },
  { id: 'empty', label: 'Postcards: no options, one variant' },
]

export const vDesigns: { id: VDesignId, title: string, short: string }[] = [
  { id: 'v1', title: 'V1 · Quiet list, opens in place', short: 'Opens in place' },
  { id: 'v2', title: 'V2 · One variant at a time', short: 'One at a time' },
  { id: 'v3', title: 'V3 · Say it in a sentence', short: 'A sentence' },
]

export const vStates: { id: VState, label: string }[] = [
  { id: 'normal', label: 'As opened' },
  { id: 'taken', label: 'Combination already sold' },
  { id: 'invalid', label: 'Invalid SKU and price' },
  { id: 'refused', label: 'Archive refused' },
  { id: 'new', label: 'New keepsake, no variants yet' },
]

const DESIGN_IDS = new Set<string>(vDesigns.map(d => d.id))
const PRODUCT_IDS = new Set<string>(Object.keys(vKeepsakes))
const STATE_IDS = new Set<string>(vStates.map(s => s.id))

/** Read the URL's search into a safe state; anything unknown falls back to the first choice. */
export function parseVariantSearch(search: Record<string, unknown>): VariantLabSearch {
  const design = String(search.design ?? '')
  const product = String(search.product ?? '')
  const state = String(search.state ?? '')

  return {
    design: DESIGN_IDS.has(design) ? design as VDesignId : 'v1',
    width: search.width === 'phone' ? 'phone' : 'laptop',
    product: PRODUCT_IDS.has(product) ? product as ProductId : 'knife',
    state: STATE_IDS.has(state) ? state as VState : 'normal',
    ...(String(search.embed) === '1' && { embed: 1 as const }),
  }
}
