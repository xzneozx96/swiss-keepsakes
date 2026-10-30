/**
 * Lab v2: three calmer designs for a keepsake's options (O1 to O3), after the owner turned down A1 to A3 as too dense
 * (30.10.2026). The route's search lives here (AGENTS.md rule 1). Mock data comes from the first lab; nothing is stored.
 */
import type { ProductId } from './keepsake-options-data'

export type { ProductId }
export type DesignId = 'o1' | 'o2' | 'o3'
export type DesignState = 'normal' | 'errors' | 'refused' | 'new-option'
export type LabWidth = 'laptop' | 'phone'

export interface OptionDesignSearch {
  design: DesignId
  width: LabWidth
  product: ProductId
  state: DesignState
  /** 1 inside the frame: only the design, at the frame's own width. */
  embed?: 1
}

export const designs: { id: DesignId, title: string, short: string }[] = [
  { id: 'o1', title: 'O1 · Summary, then one at a time', short: 'O1 Summary' },
  { id: 'o2', title: 'O2 · A plain page you type on', short: 'O2 Page' },
  { id: 'o3', title: 'O3 · List and detail', short: 'O3 List + detail' },
]

export const products: { id: ProductId, label: string }[] = [
  { id: 'knife', label: 'Knife · Size, Theme · 6 variants' },
  { id: 'swisscard', label: 'SwissCard · Colour swatches · 1 variant' },
  { id: 'empty', label: 'New keepsake · no options' },
]

export const states: { id: DesignState, label: string }[] = [
  { id: 'normal', label: 'As opened' },
  { id: 'errors', label: 'Errors: empty name, duplicate value' },
  { id: 'refused', label: 'Delete refused' },
  { id: 'new-option', label: 'New option, keepsake has variants' },
]

const DESIGN_IDS = new Set<string>(designs.map(d => d.id))
const PRODUCT_IDS = new Set<string>(products.map(p => p.id))
const STATE_IDS = new Set<string>(states.map(s => s.id))

/** Read the URL's search into a safe state; anything unknown falls back to the first choice. */
export function parseSearch(search: Record<string, unknown>): OptionDesignSearch {
  const design = String(search.design ?? '')
  const product = String(search.product ?? '')
  const state = String(search.state ?? '')

  return {
    design: DESIGN_IDS.has(design) ? design as DesignId : 'o1',
    width: search.width === 'phone' ? 'phone' : 'laptop',
    product: PRODUCT_IDS.has(product) ? product as ProductId : 'knife',
    state: STATE_IDS.has(state) ? state as DesignState : 'normal',
    ...(String(search.embed) === '1' && { embed: 1 as const }),
  }
}
