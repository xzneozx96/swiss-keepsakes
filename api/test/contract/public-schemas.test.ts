import {
  BODY_LIST_LEVELS,
  languageNoticeSchema,
  nextDateSchema,
  publicCategoryListSchema,
  publicCategorySchema,
  publicKeepsakeListSchema,
  publicKeepsakeSchema,
  publicLanguageSchema,
  publicMapItemSchema,
  publicMapSchema,
  publicPinSchema,
  publicSearchListSchema,
  publicStoryBodySchema,
  publicStoryCardSchema,
  publicStoryKeepsakeSchema,
  publicStoryListSchema,
  publicStorySchema,
  publicTourCardSchema,
  publicTourListSchema,
  publicTourSchema,
  storyBodySchema,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const schemas = {
  publicLanguageSchema,
  languageNoticeSchema,
  nextDateSchema,
  publicStoryBodySchema,
  publicStoryCardSchema,
  publicStoryKeepsakeSchema,
  publicStoryListSchema,
  publicStorySchema,
  publicPinSchema,
  publicMapItemSchema,
  publicMapSchema,
  publicTourCardSchema,
  publicTourListSchema,
  publicTourSchema,
  publicCategorySchema,
  publicCategoryListSchema,
}

// every property name at any depth of a JSON schema
function propertyNames(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach(item => propertyNames(item, found))
  }
  else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && value !== null && typeof value === 'object')
        found.push(...Object.keys(value))
      propertyNames(value, found)
    }
  }
  return found
}

describe('[E2.12] public read schemas', () => {
  it('[E2.12][AC54] no public schema has a price-shaped field', () => {
    for (const [name, schema] of Object.entries(schemas)) {
      const names = propertyNames(z.toJSONSchema(schema, { unrepresentable: 'any' }))
      expect(names.filter(n => /price|amount|cost|fee|currency|money/i.test(n)), name).toEqual([])
    }
    expect(propertyNames(z.toJSONSchema(publicTourSchema)).length).toBeGreaterThan(10)
  })

  it('[E2.12][AC88] the map item has exactly the ADR-006 fields', () => {
    const expected = ['id', 'slug', 'latitude', 'longitude', 'address', 'weeklyHours', 'title', 'language', 'categoryIds', 'stayTag', 'interests', 'nextDate', 'hasMainStory', 'mainStorySlug', 'photoUrl', 'photoVariants', 'mustVisit', 'tip']
    expect(Object.keys(publicMapItemSchema.shape).sort()).toEqual([...expected].sort())
  })

  it('[E4.7][AC49][AC42] the pin card carries the outbound link, the photos and the stories a card that opens needs, and no booking or price field', () => {
    for (const field of ['link', 'photos', 'mainStory', 'otherStories', 'mapsLink'])
      expect(Object.keys(publicPinSchema.shape), field).toContain(field)
    expect(Object.keys(publicPinSchema.shape).filter(name => /book|buy|pay|cart|checkout|review|rating/i.test(name))).toEqual([])
    const missing = publicPinSchema.safeParse({}).error?.issues.map(issue => issue.path[0])
    expect(missing).toEqual(expect.arrayContaining(['link', 'photos', 'mainStory', 'otherStories']))
  })

  it('[E4.4][AC61] the story card carries the cover next to its key, as an address with variants or null', () => {
    expect(Object.keys(publicStoryCardSchema.shape)).toEqual(expect.arrayContaining(['coverKey', 'cover']))
    const missing = publicStoryCardSchema.safeParse({}).error?.issues.map(issue => issue.path[0])
    expect(missing).toContain('cover')
  })

  it('the tour card carries the cover next to its key, as an address with variants or null', () => {
    expect(Object.keys(publicTourCardSchema.shape)).toEqual(expect.arrayContaining(['coverKey', 'cover']))
    expect(publicTourCardSchema.safeParse({}).error?.issues.map(issue => issue.path[0])).toContain('cover')
  })

  it('[E4.4][AC54][AC61] the story detail adds versions, places, related cards and keepsake cards, and a keepsake card has no price', () => {
    expect(Object.keys(publicStorySchema.shape)).toEqual(expect.arrayContaining(['versions', 'places', 'related', 'keepsakes']))
    expect(Object.keys(publicStoryCardSchema.shape)).not.toEqual(expect.arrayContaining(['versions', 'keepsakes']))
    expect(Object.keys(publicStoryKeepsakeSchema.shape).sort()).toEqual(['cover', 'id', 'name', 'slug', 'soldOut', 'subtitle'])
    const names = propertyNames(z.toJSONSchema(publicStoryKeepsakeSchema, { unrepresentable: 'any' }))
    expect(names.filter(n => /price|amount|cost|fee|currency|money|rappen/i.test(n))).toEqual([])
  })

  it('[E4.4][AC61] the body image and audio carry an address next to the key', () => {
    const image = publicStoryBodySchema.safeParse({ type: 'doc', content: [{ type: 'image', attrs: { key: 'k', url: 'https://m/k', variants: [], alt: '', caption: '' } }, { type: 'audio', attrs: { key: null, url: null, title: '', caption: '' } }] })
    expect(image.success).toBe(true)
  })

  it('[E2.13] the public body unrolls lists as deep as the write body', () => {
    const listNodes = (schema: z.ZodType) => JSON.stringify(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })).split('"bulletList"').length - 1
    expect(listNodes(publicStoryBodySchema)).toBe(listNodes(storyBodySchema))
    // The top bulletList plus one nested list type per level in each of the two top lists
    expect(listNodes(storyBodySchema)).toBe(1 + 2 * BODY_LIST_LEVELS)
  })
})

// ADR-033 section 12: an SPA that ships before the API still gets the old answer, with none of the new card fields.
describe('the keepsake card fields added with the swipeable cards have defaults', () => {
  const id = '0190f0c2-0000-7000-8000-000000000001'
  const notice = { language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] }
  const oldCard = { id, slug: 'pocket-knife', name: 'Pocket knife', cover: null, soldOut: false, ...notice }
  const expected = { photos: [], subtitle: null, storeName: '' }

  it('the list parses an old-shape card', () => {
    const list = publicKeepsakeListSchema.parse({ items: [oldCard], nextCursor: null, total: 1 })
    expect(list.items[0]).toMatchObject(expected)
  })

  it('the detail parses an old-shape keepsake', () => {
    const detail = publicKeepsakeSchema.parse({ ...oldCard, description: { type: 'doc', content: [] }, options: [], variants: [], otherSlug: null })
    expect(detail).toMatchObject(expected)
  })

  it('the search parses an old-shape keepsake hit', () => {
    const counts = { story: 0, place: 0, tour: 0, keepsake: 1 }
    const list = publicSearchListSchema.parse({ items: [{ kind: 'keepsake', card: oldCard }], nextCursor: null, total: 1, counts })
    expect(list.items[0]).toMatchObject({ card: expected })
  })

  it('a story keepsake parses without a subtitle', () => {
    const keepsake = { id, slug: 'pocket-knife', name: 'Pocket knife', cover: null, soldOut: false }
    expect(publicStoryKeepsakeSchema.parse(keepsake).subtitle).toBeNull()
    expect(publicStorySchema.shape.keepsakes.parse([keepsake])[0]?.subtitle).toBeNull()
  })
})
