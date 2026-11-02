import { describe, expect, it } from 'vitest'
import { categoryIcons, isCategoryIcon, placeIcon } from '../src/content/index.ts'

const categories = [
  { id: 'food', parentId: null, icon: 'restaurant' as const },
  { id: 'pizza', parentId: 'food', icon: null },
  { id: 'bar', parentId: 'food', icon: 'bar' as const },
  { id: 'misc', parentId: null, icon: null },
  { id: 'misc-sub', parentId: 'misc', icon: null },
  { id: 'water', parentId: null, icon: 'water' as const },
]

describe('placeIcon', () => {
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
})

describe('categoryIcons', () => {
  it('has 24 unique keys and a guard', () => {
    expect(new Set(categoryIcons).size).toBe(24)
    expect(isCategoryIcon('toilet')).toBe(true)
    expect(isCategoryIcon('toilets')).toBe(false)
  })
})
