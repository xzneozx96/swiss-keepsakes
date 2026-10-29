import type { CheckTarget } from './story-editor-rules'

/** The Details cards on the Review screen, in order; each check names the card where it is fixed. */
export type CardId = Exclude<CheckTarget, 'cover' | 'title' | 'excerpt' | 'body' | 'language'> | 'stay' | 'interests'

export const CARD_IDS: CardId[] = ['link', 'review', 'categories', 'pins', 'stay', 'interests', 'keepsakes', 'related']

export const cardAnchor = (id: CardId) => `details-${id}`
