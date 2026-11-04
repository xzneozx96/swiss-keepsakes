/** The steps of the keepsake editor, in order. `step` in the address names the one that is open; none means the first. */
export const KEEPSAKE_STEPS = ['details', 'options', 'review'] as const

export type KeepsakeStep = (typeof KEEPSAKE_STEPS)[number]

export function isKeepsakeStep(value: unknown): value is KeepsakeStep {
  return KEEPSAKE_STEPS.includes(value as KeepsakeStep)
}

/**
 * What the keepsake page's route keeps of its address: the open step, none for the first. The old `?view=review`
 * address, and the old `?step=variants` one (Options and Variants are one step now), which saved links and bookmarks
 * still carry, open Review and publish and the merged step.
 */
export function keepsakeSearch(search: Record<string, unknown>): { step?: Exclude<KeepsakeStep, 'details'> } {
  const asked = search.step ?? (search.view === 'review' ? 'review' : undefined)
  const step = asked === 'variants' ? 'options' : asked

  return { step: isKeepsakeStep(step) && step !== 'details' ? step : undefined }
}

export const KEEPSAKES_PATH = '/store/products'
export const KEEPSAKE_PATH = '/store/products/$productId'
export const NEW_KEEPSAKE_PATH = '/store/products/new'
