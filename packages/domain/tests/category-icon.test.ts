import { describe, expect, it } from 'vitest'
import { categoryIconGroups, categoryIcons, isCategoryIcon, placeIcon } from '../src/content/index.ts'

const categories = [
  { id: 'food', parentId: null, icon: 'restaurant' as const },
  { id: 'pizza', parentId: 'food', icon: null },
  { id: 'bar', parentId: 'food', icon: 'bar' as const },
  { id: 'misc', parentId: null, icon: null },
  { id: 'misc-sub', parentId: 'misc', icon: null },
  { id: 'water', parentId: null, icon: 'water' as const },
]

describe('[E4.13][AC4] placeIcon', () => {
  it('takes the icon of the first category that has one', () => {
    expect(placeIcon(['misc', 'water', 'food'], categories)).toBe('water')
  })

  it('lets a sub-category without an icon fall back to its parent', () => {
    expect(placeIcon(['pizza'], categories)).toBe('restaurant')
  })

  it('prefers the own icon of a sub-category over its parent', () => {
    expect(placeIcon(['bar'], categories)).toBe('bar')
  })

  it('skips a category with no icon in its chain and takes the next one', () => {
    expect(placeIcon(['misc-sub', 'water'], categories)).toBe('water')
  })

  it('is null when no category gives an icon, or the ids are unknown', () => {
    expect(placeIcon(['misc', 'misc-sub', 'ghost'], categories)).toBeNull()
    expect(placeIcon([], categories)).toBeNull()
  })

  it('[AC4] Bakeries (no icon, parent Food and drink with cafe) before Sights (landmark) resolves to cafe', () => {
    const tree = [
      { id: 'drink', parentId: null, icon: 'cafe' as const },
      { id: 'bakeries', parentId: 'drink', icon: null },
      { id: 'sights', parentId: null, icon: 'landmark' as const },
    ]
    expect(placeIcon(['bakeries', 'sights'], tree)).toBe('cafe')
    expect(placeIcon(['sights', 'bakeries'], tree)).toBe('landmark')
  })
})

describe('[E4.13][AC5] the category icon list', () => {
  const oldKeys = [
    'toilet', 'water', 'wifi', 'transport', 'locker', 'cash', 'restaurant', 'cafe', 'bar', 'market', 'supermarket', 'shop',
    'landmark', 'church', 'bridge', 'monument', 'museum', 'viewpoint', 'square', 'info', 'holiday', 'emergency', 'boat', 'mountain',
  ]

  it('holds 60 to 80 keys with no duplicate, and the flat list is the groups in order', () => {
    expect(categoryIcons.length).toBeGreaterThanOrEqual(60)
    expect(categoryIcons.length).toBeLessThanOrEqual(80)
    expect(new Set(categoryIcons).size).toBe(categoryIcons.length)
    expect([...categoryIcons]).toEqual(categoryIconGroups.flatMap(group => [...group.icons]))
  })

  it('has labelled groups, each key in exactly one, every group non-empty with a unique key', () => {
    expect(categoryIconGroups.length).toBeGreaterThanOrEqual(2)
    expect(new Set(categoryIconGroups.map(group => group.key)).size).toBe(categoryIconGroups.length)
    for (const group of categoryIconGroups) {
      expect(group.key).toMatch(/^[a-z-]+$/)
      expect(group.icons.length).toBeGreaterThan(0)
    }
    for (const icon of categoryIcons)
      expect(categoryIconGroups.filter(group => (group.icons as readonly string[]).includes(icon))).toHaveLength(1)
  })

  it('keeps the 24 old keys, and every key is kebab-case', () => {
    for (const key of oldKeys)
      expect(isCategoryIcon(key)).toBe(true)
    for (const key of categoryIcons)
      expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  it('guards a key', () => {
    expect(isCategoryIcon('toilet')).toBe(true)
    expect(isCategoryIcon('toilets')).toBe(false)
    expect(isCategoryIcon('')).toBe(false)
  })
})
