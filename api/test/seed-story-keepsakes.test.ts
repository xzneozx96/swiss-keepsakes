import { describe, expect, it } from 'vitest'
import { loadData } from '../scripts/seed-curated.ts'
import { placeStories } from '../scripts/seed-data/place-stories.ts'
import { storyKeepsakeLinks } from '../scripts/seed-data/story-keepsake-links.ts'
import { planStoryKeepsakeLinks } from '../scripts/seed-story-keepsakes.ts'

const product = (code: string) => `product-${code}`
const products = new Map([['A', product('A')], ['B', product('B')], ['C', product('C')]])

describe('[E4.4][AC31] the story-keepsake link data', () => {
  it('[E4.4][AC31] names only seeded stories (by English slug) and seeded keepsakes (by SKU code), 1 to 6 per story, none twice', () => {
    const slugs = new Set(placeStories.map(story => story.slug.en))
    const codes = new Set(loadData().keepsakes.map(record => record.skuCode))

    expect(storyKeepsakeLinks.length).toBeGreaterThanOrEqual(3)
    expect(new Set(storyKeepsakeLinks.map(link => link.story)).size).toBe(storyKeepsakeLinks.length)
    for (const link of storyKeepsakeLinks) {
      expect(slugs.has(link.story), link.story).toBe(true)
      expect(link.keepsakes.length).toBeGreaterThanOrEqual(1)
      expect(link.keepsakes.length).toBeLessThanOrEqual(6)
      expect(new Set(link.keepsakes).size).toBe(link.keepsakes.length)
      for (const code of link.keepsakes)
        expect(codes.has(code), code).toBe(true)
    }
  })
})

describe('[E4.4][AC31] planning the links', () => {
  const specs = [{ story: 'lake-day', keepsakes: ['A', 'B'] }]

  it('[E4.4][AC31] AC-5: a story with no link gets each keepsake at the next positions, in the order of the data', () => {
    const plan = planStoryKeepsakeLinks(specs, { stories: new Map([['lake-day', { groupId: 'g1', links: [] }]]), products })

    expect(plan.adds).toEqual([
      { story: 'lake-day', code: 'A', groupId: 'g1', productId: product('A'), position: 1 },
      { story: 'lake-day', code: 'B', groupId: 'g1', productId: product('B'), position: 2 },
    ])
    expect(plan.skipped).toEqual([])
  })

  it('[E4.4][AC31] AC-5: a second run adds nothing, and a link a person made stays where it is with the new ones after it', () => {
    const second = planStoryKeepsakeLinks(specs, { stories: new Map([['lake-day', { groupId: 'g1', links: [{ position: 1, productId: product('A') }, { position: 2, productId: product('B') }] }]]), products })
    const withPersonLink = planStoryKeepsakeLinks(specs, { stories: new Map([['lake-day', { groupId: 'g1', links: [{ position: 1, productId: product('C') }] }]]), products })

    expect(second.adds).toEqual([])
    expect(withPersonLink.adds.map(add => [add.code, add.position])).toEqual([['A', 2], ['B', 3]])
  })

  it('[E4.4][AC31] AC-5: it never goes past 6 links, and says what it skipped and why', () => {
    const full = Array.from({ length: 5 }, (_, i) => ({ position: i + 1, productId: `other-${i}` }))
    const plan = planStoryKeepsakeLinks([{ story: 'lake-day', keepsakes: ['A', 'B'] }, { story: 'gone', keepsakes: ['A'] }, { story: 'lake-day-2', keepsakes: ['Z'] }], {
      stories: new Map([['lake-day', { groupId: 'g1', links: full }], ['lake-day-2', { groupId: 'g2', links: [] }]]),
      products,
    })

    expect(plan.adds.map(add => [add.code, add.position])).toEqual([['A', 6]])
    expect(plan.skipped).toEqual([
      { story: 'lake-day', code: 'B', reason: 'the story has 6 links already' },
      { story: 'gone', reason: 'no published story with this slug in the store' },
      { story: 'lake-day-2', code: 'Z', reason: 'no published keepsake with this SKU code in the store' },
    ])
  })
})
