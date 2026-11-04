import { describe, expect, it } from 'vitest'

import { type InterestCode, rankItems, type StayTag } from '../src/content'

interface Item { id: string, stay: StayTag, interests: InterestCode[] }

const item = (id: string, stay: StayTag, ...interests: InterestCode[]): Item => ({ id, stay, interests })
const frozen = (entry: Item): Item => Object.freeze({ ...entry, interests: Object.freeze([...entry.interests]) as Item['interests'] })
const ids = (items: readonly Item[]) => items.map(entry => entry.id)

// C is newer than D, so the server list (newest first) holds C before D.
const restaurants = [
  item('A', 'short_stay', 'food-drink'),
  item('B', 'multi_day', 'food-drink'),
  item('C', 'both'),
  item('D', 'short_stay'),
]
const reorder = (list: Item[]) => [list[3], list[2], list[1], list[0]]

describe('[E4.4][AC38] rankItems orders by stay, then interests, then input order', () => {
  it('puts the short-stay match with the interest first, then both, then the other short stay, and the multi-day last', () => {
    const ranked = rankItems([restaurants[2], restaurants[3], restaurants[1], restaurants[0]], { stay: 'short_stay', interests: ['food-drink'] })

    expect(ids(ranked)).toEqual(['A', 'C', 'D', 'B'])
  })

  it('puts the multi-day restaurant first when the stay changes, and keeps all four', () => {
    const ranked = rankItems([restaurants[2], restaurants[3], restaurants[1], restaurants[0]], { stay: 'multi_day', interests: ['food-drink'] })

    expect(ranked[0].id).toBe('B')
    expect([...ids(ranked)].sort()).toEqual(['A', 'B', 'C', 'D'])
  })

  it('returns the input order when there is no stay and no interest', () => {
    const list = reorder(restaurants)

    expect(ids(rankItems(list, { stay: null, interests: [] }))).toEqual(ids(list))
    expect(ids(rankItems(list, {}))).toEqual(ids(list))
  })

  it('puts the item with more chosen interests first inside one stay level', () => {
    const list = [
      item('zero', 'both'),
      item('two', 'both', 'food-drink', 'history-culture'),
      item('one', 'both', 'food-drink'),
    ]

    expect(ids(rankItems(list, { stay: 'short_stay', interests: ['food-drink', 'history-culture'] }))).toEqual(['two', 'one', 'zero'])
  })

  it('counts only the chosen interests', () => {
    const list = [item('other', 'both', 'shopping-keepsakes', 'local-activities'), item('match', 'both', 'food-drink')]

    expect(ids(rankItems(list, { interests: ['food-drink'] }))).toEqual(['match', 'other'])
  })

  it('ranks by interest alone when there is no stay', () => {
    const list = [item('x', 'multi_day'), item('y', 'short_stay', 'food-drink')]

    expect(ids(rankItems(list, { stay: null, interests: ['food-drink'] }))).toEqual(['y', 'x'])
  })

  it('keeps the input order for items that tie on every rule, on repeated runs, and leaves the input unchanged', () => {
    const list = Object.freeze([
      frozen(item('p', 'short_stay')),
      frozen(item('q', 'both')),
      frozen(item('r', 'short_stay')),
    ]) as readonly Item[]
    const prefs = { stay: 'short_stay' as const, interests: ['food-drink' as const] }

    const first = rankItems(list, prefs)
    const second = rankItems(list, prefs)

    expect(ids(first)).toEqual(['p', 'q', 'r'])
    expect(ids(second)).toEqual(['p', 'q', 'r'])
    expect(first).not.toBe(list)
    expect(ids(list)).toEqual(['p', 'q', 'r'])
  })

  it('returns an empty list for an empty list', () => {
    expect(rankItems([], { stay: 'short_stay', interests: ['food-drink'] })).toEqual([])
  })
})

describe('[E4.5][AC44] ranking sinks an item and never hides it', () => {
  it('puts a multi-day pin after every short-stay and both pin for a short stay, and keeps it', () => {
    const pins = [
      item('walk', 'multi_day', 'food-drink'),
      item('square', 'short_stay'),
      item('lake', 'both'),
    ]

    const ranked = rankItems(pins, { stay: 'short_stay', interests: ['food-drink'] })

    expect(ids(ranked)).toEqual(['square', 'lake', 'walk'])
    expect(ranked).toHaveLength(pins.length)
  })
})
