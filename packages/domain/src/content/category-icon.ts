/** The fixed set of icons a map category can carry (decision 2026-11-02). The front end maps each key to a drawing. */
export const categoryIcons = [
  'toilet', 'water', 'wifi', 'transport', 'locker', 'cash',
  'restaurant', 'cafe', 'bar', 'market', 'supermarket', 'shop',
  'landmark', 'church', 'bridge', 'monument', 'museum', 'viewpoint', 'square',
  'info', 'holiday', 'emergency', 'boat', 'mountain',
] as const
export type CategoryIcon = typeof categoryIcons[number]

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
