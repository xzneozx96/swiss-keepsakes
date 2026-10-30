/** The steps of the keepsake editor, in order. `step` in the address names the one that is open; none means the first. */
export const KEEPSAKE_STEPS = ['details', 'options', 'variants', 'review'] as const

export type KeepsakeStep = (typeof KEEPSAKE_STEPS)[number]

export function isKeepsakeStep(value: unknown): value is KeepsakeStep {
  return KEEPSAKE_STEPS.includes(value as KeepsakeStep)
}

/**
 * What the keepsake page's route keeps of its address: the open step, none for the first. The old `?view=review`
 * address, which saved links and bookmarks still carry, opens Review and publish.
 */
export function keepsakeSearch(search: Record<string, unknown>): { step?: Exclude<KeepsakeStep, 'details'> } {
  const step = search.step ?? (search.view === 'review' ? 'review' : undefined)

  return { step: isKeepsakeStep(step) && step !== 'details' ? step : undefined }
}

export const KEEPSAKES_PATH = '/store/products'
export const KEEPSAKE_PATH = '/store/products/gifts/$productId'
export const NEW_KEEPSAKE_PATH = '/store/products/gifts/new'

/** The variant page of one keepsake (its own route; the keepsake page's route has no search for it). */
export const VARIANT_PATH = '/store/products/gifts/$productId/variants/$variantId'
