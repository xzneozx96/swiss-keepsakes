import type { LabState } from './keepsake-editor-search-params'

/**
 * The screens of the lab frame, Medusa-shaped: products list → product page → variant page, and
 * inventory list → inventory item → back to the variant. `start` is the lab state the first screen
 * opens with (a sheet open, a refusal shown); screens reached by navigating have none.
 */
export type Screen
  = | { name: 'products' }
    | { name: 'product', id: string, start?: LabState }
    | { name: 'create', start?: LabState }
    | { name: 'variant', skuId: string }
    | { name: 'inventory' }
    /** `from`: opened from the variant page, so its back arrow returns there. */
    | { name: 'item', skuId: string, start?: LabState, from?: 'variant' }

export type Go = (screen: Screen) => void
