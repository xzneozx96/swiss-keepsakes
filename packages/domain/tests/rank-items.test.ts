import { describe, expect, it } from 'vitest'

import { type InterestCode, isInterestCode, rankByTags, rankItems, type StayTag } from '../src/content'

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

describe('[E4.4][AC38] rankItems with several interests, ties and mixed stay tags', () => {
  const [history, food, lake, shopping, activities] = ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'] as const

  it('[E4.4][AC38] three chosen interests: items with 3, 2, 1 and 0 of them come in that order', () => {
    const list = [
      item('none', 'both'),
      item('one', 'both', lake),
      item('three', 'both', food, history, lake),
      item('two', 'both', history, food),
    ]

    expect(ids(rankItems(list, { stay: null, interests: [food, history, lake] }))).toEqual(['three', 'two', 'one', 'none'])
  })

  it('[E4.4][AC38] all five interests chosen: the count of matches decides', () => {
    const list = [
      item('c1', 'both', shopping),
      item('c5', 'both', history, food, lake, shopping, activities),
      item('c0', 'both'),
      item('c3', 'both', history, lake, activities),
      item('c4', 'both', history, food, lake, activities),
    ]

    expect(ids(rankItems(list, { stay: 'short_stay', interests: [history, food, lake, shopping, activities] }))).toEqual(['c5', 'c4', 'c3', 'c1', 'c0'])
  })

  it('[E4.4][AC38] two items that match one different chosen interest each keep the input order, both ways round', () => {
    const a = item('a', 'both', food)
    const b = item('b', 'both', history)
    const prefs = { stay: null, interests: [food, history] }

    expect(ids(rankItems([a, b], prefs))).toEqual(['a', 'b'])
    expect(ids(rankItems([b, a], prefs))).toEqual(['b', 'a'])
  })

  it('[E4.4][AC38] interests with no stay ignore the stay tags: the count decides and ties keep the input order', () => {
    const list = [
      item('multi0', 'multi_day'),
      item('short1', 'short_stay', food),
      item('both2', 'both', food, history),
      item('multi1', 'multi_day', history),
      item('both0', 'both'),
    ]

    expect(ids(rankItems(list, { stay: null, interests: [food, history] }))).toEqual(['both2', 'short1', 'multi1', 'multi0', 'both0'])
  })

  it('[E4.4][AC38] the stay outweighs interests: a multi-day item with all three interests ranks after a short-stay item with none', () => {
    const list = [
      item('multiAll', 'multi_day', food, history, lake),
      item('shortNone', 'short_stay'),
    ]

    expect(ids(rankItems(list, { stay: 'short_stay', interests: [food, history, lake] }))).toEqual(['shortNone', 'multiAll'])
  })
})

describe('[E4.4][AC38] rankByTags ranks anything with a stay tag and interest strings', () => {
  const tagged = (id: string, stayTag: StayTag, interests: string[]) => ({ id, stayTag, interests })

  it('orders like rankItems and drops nothing', () => {
    const list = [tagged('a', 'multi_day', ['food-drink']), tagged('b', 'short_stay', []), tagged('c', 'both', ['food-drink'])]

    expect(rankByTags(list, { stay: 'short_stay', interests: ['food-drink'] }).map(entry => entry.id)).toEqual(['c', 'b', 'a'])
    expect(rankByTags(list, {})).toEqual(list)
  })

  it('ignores an interest string outside the closed list', () => {
    const list = [tagged('odd', 'both', ['not-an-interest']), tagged('food', 'both', ['food-drink'])]

    expect(rankByTags(list, { interests: ['food-drink'] }).map(entry => entry.id)).toEqual(['food', 'odd'])
  })
})

describe('[E4.5][AC37] isInterestCode', () => {
  it('accepts the closed list and nothing else, whatever the type', () => {
    expect(isInterestCode('food-drink')).toBe(true)
    expect(isInterestCode('Food-Drink')).toBe(false)
    expect(isInterestCode(3)).toBe(false)
    expect(isInterestCode(null)).toBe(false)
  })
})
