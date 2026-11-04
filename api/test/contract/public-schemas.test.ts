import {
  BODY_LIST_LEVELS,
  languageNoticeSchema,
  nextDateSchema,
  publicCategoryListSchema,
  publicCategorySchema,
  publicLanguageSchema,
  publicMapItemSchema,
  publicMapSchema,
  publicPinSchema,
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
    const expected = ['id', 'slug', 'latitude', 'longitude', 'title', 'language', 'categoryIds', 'stayTag', 'interests', 'nextDate', 'hasMainStory', 'mainStorySlug', 'photoUrl']
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

  it('[E4.4][AC54][AC61] the story detail adds versions, places, related cards and keepsake cards, and a keepsake card has no price', () => {
    expect(Object.keys(publicStorySchema.shape)).toEqual(expect.arrayContaining(['versions', 'places', 'related', 'keepsakes']))
    expect(Object.keys(publicStoryCardSchema.shape)).not.toEqual(expect.arrayContaining(['versions', 'keepsakes']))
    expect(Object.keys(publicStoryKeepsakeSchema.shape).sort()).toEqual(['cover', 'id', 'name', 'slug', 'soldOut'])
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
