import { describe, expect, it } from 'vitest'

import { homeSectionOrder } from '@/features/home/lib/section-order'

const DEFAULT = ['must-visits', 'routes', 'stories', 'food-map', 'events', 'victorinox']

describe('homeSectionOrder', () => {
  it('is the default order with no answers', () => {
    expect(homeSectionOrder([])).toEqual(DEFAULT)
  })

  it('moves the food map first for food-drink only', () => {
    expect(homeSectionOrder(['food-drink'])).toEqual(['food-map', 'must-visits', 'routes', 'stories', 'events', 'victorinox'])
  })

  it('puts the matched sections first in the canonical interest order, whatever order the guest chose them in', () => {
    expect(homeSectionOrder(['local-activities', 'history-culture'])).toEqual(['must-visits', 'events', 'routes', 'stories', 'food-map', 'victorinox'])
  })

  it('moves the showcase first for shopping-keepsakes', () => {
    expect(homeSectionOrder(['shopping-keepsakes'])).toEqual(['victorinox', 'must-visits', 'routes', 'stories', 'food-map', 'events'])
  })

  it('never moves the stories up, and drops nothing, with all five interests', () => {
    const all = homeSectionOrder(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'])

    expect(all).toEqual(['must-visits', 'food-map', 'routes', 'victorinox', 'events', 'stories'])
    expect([...all].sort()).toEqual([...DEFAULT].sort())
  })

  it('ignores unknown codes and repeats', () => {
    expect(homeSectionOrder(['nope', 'food-drink', 'food-drink'])).toEqual(['food-map', 'must-visits', 'routes', 'stories', 'events', 'victorinox'])
  })
})
