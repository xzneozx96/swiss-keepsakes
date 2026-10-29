import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import {
  categoryName,
  countHighlighted,
  isHighlighted,
  keepHighlighted,
  topLevelCategories,
} from '@/features/map/lib/categories'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, parentId: string | null, position: number, en: string | null, de: string | null = null): PublicCategory {
  return { id: id(n), slug: `c${n}`, name: { en, de }, parentId, position }
}

function pin(n: number, categoryIds: string[]): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    title: `Pin ${n}`,
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoKey: null,
  }
}

const walks = category(1, null, 0, 'Walks', 'Spaziergänge')
const photo = category(2, null, 1, 'Photo spots', 'Fotospots')
const food = category(3, null, 2, 'Food and drink', 'Essen und Trinken')
const bakeries = category(4, food.id, 0, 'Bakeries')
const categories = [bakeries, food, photo, walks]

// A is in two categories, B has none, C only in a sub-category, D only in Food directly.
const a = pin(1, [walks.id, photo.id])
const b = pin(2, [])
const c = pin(3, [bakeries.id])
const d = pin(4, [food.id])
const pins = [a, b, c, d]

describe('[E4.6][AC88] category filter', () => {
  it('highlights every pin under All, including a pin with no category', () => {
    expect(pins.map(p => isHighlighted(p, [], categories))).toEqual([true, true, true, true])
  })

  it('highlights a pin in two categories under each chosen category', () => {
    expect(isHighlighted(a, [walks.id], categories)).toBe(true)
    expect(isHighlighted(a, [photo.id], categories)).toBe(true)
    expect(isHighlighted(a, [food.id], categories)).toBe(false)
  })

  it('highlights a pin in two categories when both are chosen', () => {
    expect(isHighlighted(a, [walks.id, photo.id], categories)).toBe(true)
  })

  it('dims a pin with no category as soon as any category is chosen', () => {
    expect(isHighlighted(b, [walks.id], categories)).toBe(false)
    expect(isHighlighted(b, [walks.id, photo.id, food.id], categories)).toBe(false)
  })

  it('lets a parent cover a pin tagged only with one of its sub-categories', () => {
    expect(isHighlighted(c, [food.id], categories)).toBe(true)
    expect(isHighlighted(c, [walks.id], categories)).toBe(false)
  })

  it('also covers the sub-category when the server already added the parent id', () => {
    expect(isHighlighted(pin(5, [bakeries.id, food.id]), [food.id], categories)).toBe(true)
  })

  it('keeps only the chosen pins, in the order given', () => {
    expect(keepHighlighted(pins, [food.id], categories).map(p => p.slug)).toEqual(['pin-3', 'pin-4'])
    expect(keepHighlighted(pins, [walks.id, food.id], categories).map(p => p.slug)).toEqual(['pin-1', 'pin-3', 'pin-4'])
  })

  it('keeps every pin under All', () => {
    expect(keepHighlighted(pins, [], categories)).toEqual(pins)
  })

  it('never removes a pin from the list it is given when counting for the sheet', () => {
    expect(countHighlighted(pins, walks.id, categories)).toBe(1)
    expect(countHighlighted(pins, food.id, categories)).toBe(2)
    expect(pins).toHaveLength(4)
  })
})

describe('[E4.6][AC88] category list', () => {
  it('lists only top-level categories, in the merchant order', () => {
    expect(topLevelCategories(categories).map(cat => cat.slug)).toEqual(['c1', 'c2', 'c3'])
  })

  it('names a category in the visitor language, then in the other language, then by slug', () => {
    expect(categoryName(walks, 'de')).toBe('Spaziergänge')
    expect(categoryName(bakeries, 'de')).toBe('Bakeries')
    expect(categoryName(category(9, null, 0, null, null), 'en')).toBe('c9')
  })
})
