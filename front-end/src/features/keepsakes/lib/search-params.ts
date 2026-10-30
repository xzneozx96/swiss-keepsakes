/** The screens of one keepsake page: the edit screen, and Review and publish. */
export const KEEPSAKE_VIEWS = ['edit', 'review'] as const

export type KeepsakeView = (typeof KEEPSAKE_VIEWS)[number]

export function isKeepsakeView(value: unknown): value is KeepsakeView {
  return KEEPSAKE_VIEWS.includes(value as KeepsakeView)
}

export const KEEPSAKES_PATH = '/store/products'
export const KEEPSAKE_PATH = '/store/products/gifts/$productId'
export const NEW_KEEPSAKE_PATH = '/store/products/gifts/new'

/** The variant page of one keepsake (its own route; the keepsake page's route has no search for it). */
export const VARIANT_PATH = '/store/products/gifts/$productId/variants/$variantId'
