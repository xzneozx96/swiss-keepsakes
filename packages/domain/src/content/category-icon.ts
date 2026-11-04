/**
 * The fixed set of icons a map category can carry (decisions 2026-11-02 and 2026-11-04, gate G-S9-D-SMALL), in labelled
 * groups. The group is part of the list; the flat key list is derived from it. The database CHECK, the API validation,
 * the contract enum and the picker all read this one list. The front end maps each key to a drawing and labels the
 * groups and keys in English and German.
 */
export const categoryIconGroups = [
  { key: 'essentials', icons: ['toilet', 'water', 'wifi', 'locker', 'cash', 'bank', 'info', 'emergency', 'pharmacy', 'hospital', 'post'] },
  { key: 'transport', icons: ['transport', 'train', 'boat', 'bicycle', 'scooter', 'car', 'airport', 'fuel', 'parking', 'charging', 'taxi'] },
  { key: 'food-and-drink', icons: ['restaurant', 'cafe', 'bar', 'brewery', 'bakery', 'pizza', 'dessert', 'tea', 'market', 'supermarket'] },
  { key: 'sights', icons: ['landmark', 'church', 'castle', 'tower', 'bridge', 'monument', 'museum', 'viewpoint', 'square', 'old-town', 'photo-spot', 'art', 'theatre', 'library'] },
  { key: 'shopping', icons: ['shop', 'souvenirs', 'watches', 'clothing', 'jewellery', 'books', 'bags'] },
  { key: 'nature-and-outdoors', icons: ['mountain', 'park', 'tree', 'lake', 'snow', 'sun', 'hiking', 'cycling', 'swimming', 'campfire'] },
  { key: 'events-and-leisure', icons: ['event', 'festival', 'concert', 'tickets', 'fair', 'sport', 'wellness', 'family', 'pets'] },
  { key: 'travel-and-stay', icons: ['holiday', 'hotel', 'laundry', 'tour', 'route', 'walk'] },
] as const

export type CategoryIconGroup = typeof categoryIconGroups[number]['key']
export type CategoryIcon = typeof categoryIconGroups[number]['icons'][number]

export const categoryIcons: readonly CategoryIcon[] = categoryIconGroups.flatMap(group => group.icons)

export function isCategoryIcon(value: string): value is CategoryIcon {
  return (categoryIcons as readonly string[]).includes(value)
}

/** The part of a map category the icon rule reads. */
export interface IconCategory { id: string, parentId: string | null, icon: CategoryIcon | null }

/**
 * The icon of a place that has no photo: the icon of its first category that has one, in the order of `categoryIds`.
 * A sub-category without an icon takes the icon of its parent. Null when no category gives one.
 */
export function placeIcon(categoryIds: readonly string[], categories: readonly IconCategory[]): CategoryIcon | null {
  const byId = new Map(categories.map(c => [c.id, c]))
  for (const id of categoryIds) {
    const category = byId.get(id)
    if (!category)
      continue
    const icon = category.icon ?? (category.parentId === null ? null : byId.get(category.parentId)?.icon ?? null)
    if (icon)
      return icon
  }
  return null
}
