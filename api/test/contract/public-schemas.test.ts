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
    const expected = ['id', 'slug', 'latitude', 'longitude', 'title', 'language', 'categoryIds', 'stayTag', 'interests', 'nextDate', 'hasMainStory', 'mainStorySlug', 'photoKey']
    expect(Object.keys(publicMapItemSchema.shape).sort()).toEqual([...expected].sort())
  })

  it('[E2.13] the public body unrolls lists as deep as the write body', () => {
    const listNodes = (schema: z.ZodType) => JSON.stringify(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })).split('"bulletList"').length - 1
    expect(listNodes(publicStoryBodySchema)).toBe(listNodes(storyBodySchema))
    // The top bulletList plus one nested list type per level in each of the two top lists
    expect(listNodes(storyBodySchema)).toBe(1 + 2 * BODY_LIST_LEVELS)
  })
})
