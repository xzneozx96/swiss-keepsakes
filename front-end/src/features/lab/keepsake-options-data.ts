/**
 * Lab: option management (A) and variant creation (B) for the keepsake editor. Mock data in memory, nothing is stored.
 * The shapes follow the keepsake editor's own (features/keepsakes/lib/option-rules.ts), cut down to what the lab needs.
 */

export type Lang = 'en' | 'de'
export interface Text { en: string, de: string }

export interface ValueDraft { ref: string, label: Text, swatch: string | null }
export interface OptionDraft { ref: string, name: Text, values: ValueDraft[] }

export interface Variant {
  id: string
  code: string
  /** CHF. */
  price: number
  status: 'published' | 'hidden'
  /** Read only in the editor: stock is set in Inventory. */
  stock: number
  /** One value ref per option ref. */
  values: Record<string, string>
}

export interface Keepsake {
  id: ProductId
  name: string
  /** The start of a suggested code: VX-S-LUCERNE. */
  prefix: string
  options: OptionDraft[]
  variants: Variant[]
}

export type ProductId = 'knife' | 'swisscard' | 'empty'
export type DesignId = 'a1' | 'a2' | 'a3' | 'b1' | 'b2' | 'b3'
export type Scenario = 'normal' | 'new-option' | 'problems' | 'taken'
export type LabWidth = 'laptop' | 'phone'

export interface OptionsLabSearch {
  design: DesignId
  width: LabWidth
  product: ProductId
  scenario: Scenario
  /** 1 inside the frame: only the design, at the frame's own width. */
  embed?: 1
}

const text = (en: string, de = ''): Text => ({ en, de })

export const SWATCH_PRESETS = ['#c8102e', '#1a1a1a', '#f5f5f5', '#1f3a5f', '#2f7d4f', '#f2c230', '#8a5a2b', '#888888'] as const
export const DEFAULT_SWATCH = '#888888'

const knifeOptions: OptionDraft[] = [
  {
    ref: 'size',
    name: text('Size', 'Grösse'),
    values: [
      { ref: 'size-s', label: text('Small', 'Klein'), swatch: null },
      { ref: 'size-m', label: text('Medium'), swatch: null },
      { ref: 'size-l', label: text('Large', 'Gross'), swatch: null },
    ],
  },
  {
    ref: 'theme',
    name: text('Theme', 'Motiv'),
    values: [
      { ref: 'theme-lu', label: text('Lucerne', 'Luzern'), swatch: null },
      { ref: 'theme-cb', label: text('Chapel Bridge', 'Kapellbrücke'), swatch: null },
      { ref: 'theme-ed', label: text('Edelweiss', 'Edelweiss'), swatch: null },
    ],
  },
]

function knifeVariant(id: string, code: string, size: string, theme: string, price: number, status: Variant['status'] = 'published', stock = 12): Variant {
  return { id, code, price, status, stock, values: { size, theme } }
}

const knifeVariants: Variant[] = [
  knifeVariant('v1', 'VX-S-LUCERNE', 'size-s', 'theme-lu', 29),
  knifeVariant('v2', 'VX-S-CHAPEL', 'size-s', 'theme-cb', 29),
  knifeVariant('v3', 'VX-S-EDELWEISS', 'size-s', 'theme-ed', 29, 'hidden', 0),
  knifeVariant('v4', 'VX-M-LUCERNE', 'size-m', 'theme-lu', 39, 'published', 4),
  knifeVariant('v5', 'VX-M-CHAPEL', 'size-m', 'theme-cb', 39),
  knifeVariant('v6', 'VX-L-LUCERNE', 'size-l', 'theme-lu', 49, 'published', 7),
]

export const keepsakes: Record<ProductId, Keepsake> = {
  knife: { id: 'knife', name: 'Victorinox Classic SD', prefix: 'VX', options: knifeOptions, variants: knifeVariants },
  swisscard: {
    id: 'swisscard',
    name: 'Victorinox SwissCard',
    prefix: 'SC',
    options: [{
      ref: 'colour',
      name: text('Colour', 'Farbe'),
      values: [
        { ref: 'col-red', label: text('Red', 'Rot'), swatch: '#c8102e' },
        { ref: 'col-black', label: text('Black', 'Schwarz'), swatch: '#1a1a1a' },
      ],
    }],
    variants: [{ id: 'c1', code: 'SC-RED', price: 39, status: 'published', stock: 9, values: { colour: 'col-red' } }],
  },
  empty: { id: 'empty', name: 'New keepsake', prefix: 'KS', options: [], variants: [] },
}

export const products: { id: ProductId, label: string }[] = [
  { id: 'knife', label: 'Knife: Size and Theme, 6 variants' },
  { id: 'swisscard', label: 'SwissCard: Colour with swatches, 1 variant' },
  { id: 'empty', label: 'New keepsake: no options yet' },
]

export const designs: { id: DesignId, control: 'options' | 'variants', title: string }[] = [
  { id: 'a1', control: 'options', title: 'A1 · Type values, drag the rows' },
  { id: 'a2', control: 'options', title: 'A2 · Values table in a sheet' },
  { id: 'a3', control: 'options', title: 'A3 · Chips with a small editor' },
  { id: 'b1', control: 'variants', title: 'B1 · Sheet with live check' },
  { id: 'b2', control: 'variants', title: 'B2 · Pick a free cell' },
  { id: 'b3', control: 'variants', title: 'B3 · Add row under the table' },
]

export const scenarios: { id: Scenario, label: string, controls: ('options' | 'variants')[] }[] = [
  { id: 'normal', label: 'As opened', controls: ['options', 'variants'] },
  { id: 'new-option', label: 'A new option on a keepsake with variants', controls: ['options'] },
  { id: 'problems', label: 'Problems after a refused Save', controls: ['options'] },
  { id: 'taken', label: 'A combination that is already sold', controls: ['variants'] },
]

const DESIGN_IDS = new Set<string>(designs.map(d => d.id))
const PRODUCT_IDS = new Set<string>(Object.keys(keepsakes))
const SCENARIO_IDS = new Set<string>(scenarios.map(s => s.id))

/** Read the URL's search into a safe state; anything unknown falls back to the first design. */
export function parseSearch(search: Record<string, unknown>): OptionsLabSearch {
  const design = String(search.design ?? '')
  const product = String(search.product ?? '')
  const scenario = String(search.scenario ?? '')

  return {
    design: DESIGN_IDS.has(design) ? design as DesignId : 'a1',
    width: search.width === 'phone' ? 'phone' : 'laptop',
    product: PRODUCT_IDS.has(product) ? product as ProductId : 'knife',
    scenario: SCENARIO_IDS.has(scenario) ? scenario as Scenario : 'normal',
    ...(String(search.embed) === '1' && { embed: 1 as const }),
  }
}
