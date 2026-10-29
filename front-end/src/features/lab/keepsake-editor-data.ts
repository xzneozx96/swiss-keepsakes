/**
 * Mock data for the keepsake editor lab (M12 with N14 and N15, slice S7, E6.1 to E6.3). The shape
 * follows the catalog section of `docs/specs/001-storytelling-pivot/data-model.md`: a product
 * with generic options (ADR-027), each with ordered values and an optional swatch, and sparse
 * SKUs (ADR-017), one per sold combination, with stock on hand and held in `inventory`
 * (ADR-009, ADR-016). Victorinox is one product (owner M9). Prices are in Rappen.
 *
 * Mock, open point O26: the theme list (the client's twelve concepts from `catalog/victorinox.ts`),
 * the colour list, design rights and every price. Nothing is saved.
 */

export type Language = 'en' | 'de'

export interface Localized {
  en: string
  de: string
}

export interface OptionValue {
  id: string
  label: Localized
  /** `#rrggbb`, lower case (the CHECK in `product_option_values`), or null. */
  swatch: string | null
}

export interface ProductOption {
  id: string
  name: Localized
  values: OptionValue[]
}

/** `published` is "For sale", `draft` is "Hidden", `archived` stays for old orders. */
export type SkuStatus = 'draft' | 'published' | 'archived'

export interface Sku {
  id: string
  code: string
  /** Rappen; 0 while a new SKU has no price yet. */
  price: number
  status: SkuStatus
  /** Option id → value id, one value per option. */
  values: Record<string, string>
  /** `inventory.stock_items.on_hand`. */
  onHand: number
  /** Units held for accepted orders; only the hold trigger changes it. */
  held: number
  /** Added in this session and never saved: switching it off removes it instead of archiving. */
  isNew?: boolean
}

export interface Keepsake {
  id: string
  isNew: boolean
  status: 'draft' | 'published'
  /** Published, with saved edits guests don't see yet (the draft jsonb differs, ADR-014). */
  editsNotLive?: boolean
  name: Localized
  text: Localized
  /** Media library ids (N18), in order; the first is the cover. */
  photos: string[]
  /** 0 to 0.5, as `products.commission_rate` (the editor caps it at 50 %). */
  commissionRate: number
  options: ProductOption[]
  skus: Sku[]
}

/** The lab's day: Thu 29 Oct 2026. */
export const LAB_TODAY = '2026-10-29'

export const LANG_NAME: Record<Language, string> = { en: 'English', de: 'German' }

// ---------------------------------------------------------------------------------------------
// Options and values

export const sizeOption: ProductOption = {
  id: 'opt-size',
  name: { en: 'Size', de: 'Grösse' },
  values: [
    { id: 'v-s', label: { en: 'Small · 58 mm Classic SD', de: 'Klein · 58 mm Classic SD' }, swatch: null },
    { id: 'v-m', label: { en: 'Medium · 91 mm Spartan', de: 'Mittel · 91 mm Spartan' }, swatch: null },
    { id: 'v-l', label: { en: 'Large · 111 mm Picknicker', de: 'Gross · 111 mm Picknicker' }, swatch: null },
  ],
}

/** The twelve designs of `catalog/victorinox.ts`, as values of one Theme option (O26: mock). */
export const themeOption: ProductOption = {
  id: 'opt-theme',
  name: { en: 'Theme', de: 'Motiv' },
  values: [
    { id: 'v-swan', label: { en: 'Swan on the lake', de: 'Schwan auf dem See' }, swatch: null },
    { id: 'v-chapel', label: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, swatch: null },
    { id: 'v-pilatus', label: { en: 'Pilatus', de: 'Pilatus' }, swatch: null },
    { id: 'v-lion', label: { en: 'Lion Monument', de: 'Löwendenkmal' }, swatch: null },
    { id: 'v-oldtown', label: { en: 'Old town on the Reuss', de: 'Altstadt an der Reuss' }, swatch: null },
    { id: 'v-steamboat', label: { en: 'Lake steamboat', de: 'Dampfschiff' }, swatch: null },
    { id: 'v-furka', label: { en: 'Furka Pass', de: 'Furkapass' }, swatch: null },
    { id: 'v-grimsel', label: { en: 'Grimsel Pass', de: 'Grimselpass' }, swatch: null },
    { id: 'v-susten', label: { en: 'Susten Pass', de: 'Sustenpass' }, swatch: null },
    { id: 'v-gotthard', label: { en: 'Gotthard Pass', de: 'Gotthardpass' }, swatch: null },
    { id: 'v-nufenen', label: { en: 'Nufenen Pass', de: 'Nufenenpass' }, swatch: null },
    // No German label yet: the publish card warns, the guest page shows the English one.
    { id: 'v-finsterwald', label: { en: 'Finsterwald bees', de: '' }, swatch: null },
  ],
}

/** The colour the "add an option" state adds. O26: no colour list is decided; mock values. */
export const colourOption: ProductOption = {
  id: 'opt-colour',
  name: { en: 'Colour', de: 'Farbe' },
  values: [
    { id: 'v-red', label: { en: 'Red', de: 'Rot' }, swatch: '#c8102e' },
    { id: 'v-black', label: { en: 'Black', de: 'Schwarz' }, swatch: '#1f1f1f' },
    { id: 'v-blue', label: { en: 'Navy', de: 'Marineblau' }, swatch: '#1f3a68' },
  ],
}

/** Photos the merchant can pick in N18 for the theme of a SKU (a cover per design). */
export const THEME_PHOTO: Record<string, string> = {
  'v-swan': 'img-vx-swan',
  'v-chapel': 'img-vx-chapel-bridge',
  'v-pilatus': 'img-vx-pilatus',
  'v-lion': 'img-vx-lion',
  'v-oldtown': 'img-vx-old-town',
  'v-steamboat': 'img-vx-steamboat',
  'v-furka': 'img-vx-furka',
  'v-grimsel': 'img-vx-grimsel',
  'v-susten': 'img-vx-susten',
  'v-gotthard': 'img-vx-gotthard',
  'v-nufenen': 'img-vx-nufenen',
  'v-finsterwald': 'img-vx-finsterwald',
}

// ---------------------------------------------------------------------------------------------
// SKUs: only the sold combinations exist (sparse)

const PRICE = { 'v-s': 4900, 'v-m': 5400, 'v-l': 6400 } as const

function sku(size: keyof typeof PRICE, theme: string, code: string, onHand: number, held: number, status: SkuStatus = 'published'): Sku {
  return {
    id: `sku-${code.toLowerCase()}`,
    code,
    price: PRICE[size],
    status,
    values: { 'opt-size': size, 'opt-theme': theme },
    onHand,
    held,
  }
}

/** Ten SKUs of 36 possible combinations: three are sold out, one hidden, one archived. */
export function victorinoxSkus(): Sku[] {
  return [
    sku('v-s', 'v-swan', 'VX-S-SWAN', 6, 2),
    sku('v-m', 'v-swan', 'VX-M-SWAN', 4, 1),
    // Every unit held for orders: sold out for guests, the other sizes stay for sale (AC53).
    sku('v-l', 'v-swan', 'VX-L-SWAN', 2, 2),
    sku('v-s', 'v-chapel', 'VX-S-CHAPEL', 8, 0),
    sku('v-m', 'v-chapel', 'VX-M-CHAPEL', 3, 0),
    sku('v-s', 'v-pilatus', 'VX-S-PILATUS', 5, 3),
    // Set to zero by the merchant: sold out.
    sku('v-s', 'v-lion', 'VX-S-LION', 0, 0),
    sku('v-l', 'v-lion', 'VX-L-LION', 1, 0),
    sku('v-m', 'v-steamboat', 'VX-M-STEAMBOAT', 12, 0, 'draft'),
    // No longer sold; old orders still point at it, so it is archived, not deleted.
    sku('v-s', 'v-oldtown', 'VX-S-OLDTOWN', 0, 0, 'archived'),
  ]
}

export function victorinox(): Keepsake {
  return {
    id: 'p-victorinox',
    isNew: false,
    status: 'published',
    name: {
      en: 'Victorinox pocket knife, Lucerne designs',
      de: 'Victorinox Taschenmesser, Luzerner Motive',
    },
    text: {
      en: 'A genuine Swiss Army Knife from Ibach, in the canton of Schwyz, with one of twelve designs from Lucerne and the Alps on the handle. Choose the size: the 58 mm Classic SD for a keyring, the 91 mm Spartan with a corkscrew and a can opener, or the 111 mm Picknicker with a lockable blade. Pocket knives are not allowed in cabin baggage, so pack it in your checked luggage.',
      de: 'Ein echtes Schweizer Taschenmesser aus Ibach im Kanton Schwyz, mit einem von zwölf Motiven aus Luzern und den Alpen auf dem Griff. Wählen Sie die Grösse: das 58 mm Classic SD für den Schlüsselbund, das 91 mm Spartan mit Korkenzieher und Dosenöffner oder das 111 mm Picknicker mit feststellbarer Klinge. Taschenmesser sind im Handgepäck nicht erlaubt, packen Sie es in den aufgegebenen Koffer.',
    },
    photos: ['img-vx-swan', 'img-vx-chapel-bridge', 'img-vx-lion', 'img-victorinox-spartan', 'img-victorinox-classic-sd'],
    commissionRate: 0.1,
    options: [structuredClone(sizeOption), structuredClone(themeOption)],
    skus: victorinoxSkus(),
  }
}

/** A new keepsake: no options yet, so exactly one SKU, with no code and no price. */
export function newKeepsake(): Keepsake {
  return {
    id: 'new',
    isNew: true,
    status: 'draft',
    name: { en: '', de: '' },
    text: { en: '', de: '' },
    photos: [],
    commissionRate: 0.1,
    options: [],
    skus: [{ id: 'sku-new-1', code: '', price: 0, status: 'published', values: {}, onHand: 0, held: 0, isNew: true }],
  }
}

// ---------------------------------------------------------------------------------------------
// Held by orders: `inventory.stock_holds` in state `held`, one row per order line

export interface Hold {
  skuId: string
  /** `orders.ref`: SK- and the display number. */
  orderRef: string
  guest: string
  /** ISO day the order was accepted and the units held. */
  createdAt: string
  quantity: number
}

/** The open holds; per SKU they add up to `held` (a test checks it). */
export const HOLDS: Hold[] = [
  { skuId: 'sku-vx-s-swan', orderRef: 'SK-1042', guest: 'Mei Tanaka', createdAt: '2026-10-27', quantity: 1 },
  { skuId: 'sku-vx-s-swan', orderRef: 'SK-1047', guest: 'Daniel Weber', createdAt: '2026-10-28', quantity: 1 },
  { skuId: 'sku-vx-m-swan', orderRef: 'SK-1047', guest: 'Daniel Weber', createdAt: '2026-10-28', quantity: 1 },
  { skuId: 'sku-vx-l-swan', orderRef: 'SK-1039', guest: 'Aiko Sato', createdAt: '2026-10-26', quantity: 2 },
  { skuId: 'sku-vx-s-pilatus', orderRef: 'SK-1044', guest: 'Liam O’Brien', createdAt: '2026-10-27', quantity: 2 },
  { skuId: 'sku-vx-s-pilatus', orderRef: 'SK-1049', guest: 'Sofia Rossi', createdAt: '2026-10-29', quantity: 1 },
]

// ---------------------------------------------------------------------------------------------
// The create flow's example: a second product line on the same generic options (ADR-027)

/**
 * What the create-flow states open on: a Victorinox SwissCard (a real Victorinox item, not yet
 * in this shop) with Colour and Theme. O26: the product, its colours and prices are mock.
 */
export function swissCardDraft(): Keepsake {
  return {
    id: 'new',
    isNew: true,
    status: 'draft',
    name: { en: 'Victorinox SwissCard, Lucerne designs', de: 'Victorinox SwissCard, Luzerner Motive' },
    text: {
      en: 'The credit-card-sized Victorinox tool with a Lucerne design on the front: scissors, a nail file, tweezers and a pen. It fits a wallet, but like a knife it goes in your checked luggage.',
      de: '',
    },
    photos: ['img-vx-swan', 'img-vx-chapel-bridge'],
    commissionRate: 0.1,
    options: [
      structuredClone(colourOption),
      { id: 'opt-theme', name: { en: 'Theme', de: 'Motiv' }, values: themeOption.values.slice(0, 3).map(v => ({ ...v })) },
    ],
    skus: [],
  }
}
