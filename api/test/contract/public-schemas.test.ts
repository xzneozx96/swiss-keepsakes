import {
  languageNoticeSchema,
  nextDateSchema,
  publicCategoryListSchema,
  publicCategorySchema,
  publicLanguageSchema,
  publicMapItemSchema,
  publicMapSchema,
  publicPinSchema,
  publicStoryCardSchema,
  publicStoryListSchema,
  publicStorySchema,
  publicTourCardSchema,
  publicTourListSchema,
  publicTourSchema,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const schemas = {
  publicLanguageSchema,
  languageNoticeSchema,
  nextDateSchema,
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
})
