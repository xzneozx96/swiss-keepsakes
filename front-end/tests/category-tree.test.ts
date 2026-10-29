import { merchantCategorySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

import { canMove, displayOrder, matches, nameOf, refusalOf, reorderedIds, withOrder } from '@/features/categories/lib/category-tree'

const uuid = (n: number) => `0198a000-0000-7000-8000-00000000000${n}`
function make(n: number, parentId: number | null, en: string | null, de: string | null, counts = { childCount: 0, useCount: 0 }) {
  return merchantCategorySchema.parse({ id: uuid(n), slug: `c${n}`, name: { en, de }, parentId: parentId === null ? null : uuid(parentId), position: n, ...counts })
}

const sights = make(1, null, 'Sights', 'Sehenswürdigkeiten', { childCount: 2, useCount: 0 })
const town = make(2, 1, 'Old Town', 'Altstadt')
const views = make(3, 1, 'Viewpoints', null, { childCount: 0, useCount: 3 })
const food = make(4, null, null, 'Essen')
const museums = make(5, null, 'Museums', 'Museen', { childCount: 1, useCount: 0 })
const pond = make(6, 5, 'Pond', null)
const items = [sights, food, museums, town, views, pond]

describe('[E4.18] category tree helpers', () => {
  it('lists each parent followed by its sub-categories', () => {
    expect(displayOrder(items).map(c => c.id)).toEqual([sights.id, town.id, views.id, food.id, museums.id, pond.id])
  })

  it('returns the full sibling order after a move, and nothing when it does not change', () => {
    expect(reorderedIds(items, null, 0, 1)).toEqual([food.id, sights.id, museums.id])
    expect(reorderedIds(items, sights.id, 1, 0)).toEqual([views.id, town.id])
    expect(reorderedIds(items, null, 1, 1)).toBeUndefined()
    expect(reorderedIds(items, null, 0, 3)).toBeUndefined()
    // A group of one has nowhere to go.
    expect(reorderedIds(items, museums.id, 0, 1)).toBeUndefined()
  })

  it('applies an order to one group only', () => {
    expect(withOrder(items, sights.id, [views.id, town.id]).map(c => c.id)).toEqual([sights.id, food.id, museums.id, views.id, town.id, pond.id])
    // The other group keeps its parent and its place.
    expect(withOrder(items, sights.id, [views.id, town.id]).find(c => c.id === pond.id)?.parentId).toBe(museums.id)
  })

  it('stops moves at the ends of a sibling group', () => {
    expect(canMove(items, sights, -1)).toBe(false)
    expect(canMove(items, sights, 1)).toBe(true)
    expect(canMove(items, views, 1)).toBe(false)
    expect(canMove(items, pond, -1)).toBe(false)
    expect(canMove(items, pond, 1)).toBe(false)
  })

  it('searches both languages, blank matches all', () => {
    expect(matches(views, 'viewp')).toBe(true)
    expect(matches(food, 'ESS')).toBe(true)
    expect(matches(food, 'sights')).toBe(false)
    expect(matches(food, '  ')).toBe(true)
  })

  it('refuses a delete for sub-categories or uses, from the API counts', () => {
    expect(refusalOf(sights)).toEqual({ children: 2, uses: 0 })
    expect(refusalOf(views)).toEqual({ children: 0, uses: 3 })
    expect(refusalOf(town)).toBeNull()
  })

  it('reads English first and falls back to German', () => {
    expect(nameOf(sights)).toBe('Sights')
    expect(nameOf(food)).toBe('Essen')
  })
})
