/** `?start=dates`: Add event opens a new place on the dates step. Read by the editor route's `validateSearch`. */
export const START_STEPS = ['dates'] as const
export type StartStep = typeof START_STEPS[number]

export const PLACES_PATH = '/store/content/places' as const
export const NEW_PLACE_ID = 'new'
