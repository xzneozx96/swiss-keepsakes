import type { CategoryIcon } from '@sk/api-contract'

/**
 * The topic photo of a kind in the home's food filter, chosen by the category's icon (owner, 05.11.2026: a photo of the topic,
 * never a place's own photo). The photos are in src/assets/photos and credited in CREDITS.txt. An icon with no photo here, or
 * a category with no icon, shows the icon on a soft tile instead.
 */
const TOPIC_PHOTOS: Partial<Record<CategoryIcon, string>> = {
  cafe: 'food-topic-cafe',
  bakery: 'food-topic-bakery',
  restaurant: 'food-topic-restaurant',
  bar: 'food-topic-bar',
  brewery: 'food-topic-brewery',
  market: 'food-topic-market',
  supermarket: 'food-topic-supermarket',
  dessert: 'food-topic-dessert',
}

/** The face of "All": a general food photo. */
export const ALL_FOOD_PHOTO = 'food-topic-all'

/** The photo slug for a category icon, or undefined when the topic has none. */
export function topicPhoto(icon: CategoryIcon | null): string | undefined {
  return icon ? TOPIC_PHOTOS[icon] : undefined
}
