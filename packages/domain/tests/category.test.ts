import { describe, expect, it } from 'vitest'
import { categorySlugBase, checkNesting, nextFreeSlug, normalizeCategoryName } from '../src/content/index.ts'

describe('[E4.18][AC87] normalizeCategoryName', () => {
  it('keeps EN only', () => {
    expect(normalizeCategoryName({ en: ' Walks ' })).toEqual({ en: 'Walks' })
  })
  it('keeps DE only', () => {
    expect(normalizeCategoryName({ de: 'Wanderungen' })).toEqual({ de: 'Wanderungen' })
  })
  it('keeps both', () => {
    expect(normalizeCategoryName({ en: 'Walks', de: 'Wanderungen' })).toEqual({ en: 'Walks', de: 'Wanderungen' })
  })
  it('returns undefined when nothing is left', () => {
    expect(normalizeCategoryName({ en: '  ' })).toBeUndefined()
    expect(normalizeCategoryName({})).toBeUndefined()
    expect(normalizeCategoryName({ en: null, de: null })).toBeUndefined()
  })
  it('drops the blank key', () => {
    const result = normalizeCategoryName({ en: '', de: 'Wanderungen' })
    expect(result).toEqual({ de: 'Wanderungen' })
    expect(result).not.toHaveProperty('en')
  })
})

describe('[E4.18][AC87] categorySlugBase', () => {
  it('folds the EN name', () => {
    expect(categorySlugBase({ en: 'Café & Spa' })).toBe('cafe-spa')
  })
  it('prefers EN over DE', () => {
    expect(categorySlugBase({ en: 'Walks', de: 'Wanderungen' })).toBe('walks')
  })
  it('falls back to DE', () => {
    expect(categorySlugBase({ de: 'Küche' })).toBe('kueche')
  })
  it('falls back to DE when the EN name folds to nothing', () => {
    expect(categorySlugBase({ en: '???', de: 'Küche' })).toBe('kueche')
  })
  it('falls back to "category" when nothing survives folding', () => {
    expect(categorySlugBase({ en: '???' })).toBe('category')
    expect(categorySlugBase({})).toBe('category')
  })
})

describe('[E4.18][AC87] nextFreeSlug', () => {
  it('returns the base when free', () => {
    expect(nextFreeSlug('walks', new Set())).toBe('walks')
  })
  it('numbers from 2', () => {
    expect(nextFreeSlug('walks', new Set(['walks']))).toBe('walks-2')
    expect(nextFreeSlug('walks', new Set(['walks', 'walks-2', 'walks-3']))).toBe('walks-4')
  })
})

describe('[E4.18][AC87] checkNesting', () => {
  const b = { id: 'b', parentId: null, childCount: 0 }
  it('refuses a category under a sub-category', () => {
    expect(checkNesting({ category: b, target: { id: 'c', parentId: 'a' } })).toBe('too-deep')
  })
  it('refuses a category with children becoming a sub', () => {
    expect(checkNesting({ category: { id: 'a', parentId: null, childCount: 2 }, target: { id: 'b', parentId: null } })).toBe('has-children')
  })
  it('allows a childless category under a root', () => {
    expect(checkNesting({ category: b, target: { id: 'a', parentId: null } })).toBe('ok')
  })
  it('refuses a category under itself', () => {
    expect(checkNesting({ category: b, target: { id: 'b', parentId: null } })).toBe('own-parent')
  })
  it('allows moving to the top level', () => {
    expect(checkNesting({ category: { id: 'b', parentId: 'a', childCount: 0 }, target: null })).toBe('ok')
  })
  it('allows keeping the current parent', () => {
    expect(checkNesting({ category: { id: 'b', parentId: 'a', childCount: 0 }, target: { id: 'a', parentId: null } })).toBe('ok')
  })
})
