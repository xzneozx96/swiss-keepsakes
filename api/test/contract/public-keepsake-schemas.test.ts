import {
  publicKeepsakeAvailabilitySchema,
  publicKeepsakeListSchema,
  publicKeepsakeSchema,
  publicPickupPointsSchema,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { contractApp, openApiDocument } from '../../scripts/contract.ts'

// A property name anywhere in a JSON schema.
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

// Every property name reachable from an OpenAPI schema, following $ref into components.
function reachableNames(node: unknown, components: Record<string, unknown>, seen = new Set<string>()): string[] {
  if (Array.isArray(node))
    return node.flatMap(child => reachableNames(child, components, seen))
  if (typeof node !== 'object' || node === null)
    return []
  const object = node as Record<string, unknown>
  if (typeof object.$ref === 'string') {
    const name = object.$ref.replace('#/components/schemas/', '')
    if (seen.has(name))
      return []
    seen.add(name)
    return reachableNames(components[name], components, seen)
  }
  const own = typeof object.properties === 'object' && object.properties !== null ? Object.keys(object.properties) : []
  return [...own, ...Object.values(object).flatMap(child => reachableNames(child, components, seen))]
}

const forbidden = /price|amount|currency|rappen|cost|fee|money|engrav/i

describe('[E6.4][AC54][AC55] the public keepsake list and detail', () => {
  it('[E6.4][AC54][AC55] AC-1 AC-6: the list and detail schemas have no price, amount, currency, rappen or engraving field', () => {
    for (const [name, schema] of Object.entries({ publicKeepsakeListSchema, publicKeepsakeSchema })) {
      const names = propertyNames(z.toJSONSchema(schema, { unrepresentable: 'any' }))
      expect(names.length, name).toBeGreaterThan(8)
      expect(names.filter(key => forbidden.test(key)), name).toEqual([])
    }
  })

  it('[E6.4][AC54][AC55] AC-1 AC-6: the OpenAPI schema of the list and of the detail has none either, however deep', () => {
    const document = openApiDocument(contractApp())
    const components = (document.components?.schemas ?? {}) as Record<string, unknown>
    const operation = (path: string) => (document.paths as Record<string, { get: { responses: Record<string, unknown> } }>)[path]!.get.responses['200']

    for (const path of ['/api/public/keepsakes', '/api/public/keepsakes/{slug}']) {
      expect(operation(path), path).toBeDefined()
      const names = reachableNames(operation(path), components)
      expect(names.length, path).toBeGreaterThan(8)
      expect(names.filter(key => forbidden.test(key)), path).toEqual([])
    }
  })

  it('[E6.4][AC52][AC53] AC-2: the availability schema is the one that carries price, currency and units, and the list shows no stock figure', () => {
    const names = propertyNames(z.toJSONSchema(publicKeepsakeAvailabilitySchema, { unrepresentable: 'any' }))
    const listNames = propertyNames(z.toJSONSchema(publicKeepsakeListSchema, { unrepresentable: 'any' }))

    expect(names).toEqual(expect.arrayContaining(['variantId', 'priceRappen', 'currency', 'available']))
    expect(listNames).toContain('soldOut')
    expect(listNames.filter(key => /^(?:available|stock|units|onHand|reserved)$/i.test(key))).toEqual([])
  })

  it('[E6.4][AC64] AC-5: the detail names the other language\'s slug and carries the language notice', () => {
    const names = Object.keys(publicKeepsakeSchema.shape)

    expect(names).toEqual(expect.arrayContaining(['otherSlug', 'language', 'requestedLanguage', 'fallback', 'availableLanguages', 'description', 'photos', 'options', 'variants']))
  })
})

describe('[E6.4][AC26] the public pickup points', () => {
  const internal = /^(?:storeId|store_id|latitude|longitude|lat|lng|position|archived|archivedAt|rowVersion|row_version)$/i

  it('[E6.4][AC26] AC-1: the schema names the guest fields and no store id, latitude, longitude, position, archived flag or row version', () => {
    const names = propertyNames(z.toJSONSchema(publicPickupPointsSchema, { unrepresentable: 'any' }))

    expect(names).toEqual(expect.arrayContaining(['items', 'id', 'name', 'address', 'instructions', 'mapsUrl', 'hours', 'weekday', 'opens', 'closes']))
    expect(names.filter(key => internal.test(key))).toEqual([])
  })

  it('[E6.4][AC26] AC-1: the OpenAPI response of the read has none either, however deep', () => {
    const document = openApiDocument(contractApp())
    const components = (document.components?.schemas ?? {}) as Record<string, unknown>
    const operation = (document.paths as Record<string, { get: { responses: Record<string, unknown> } }>)['/api/public/keepsakes/{slug}/pickup-points']?.get.responses['200']

    expect(operation).toBeDefined()
    const names = reachableNames(operation, components)
    expect(names.length).toBeGreaterThan(8)
    expect(names.filter(key => internal.test(key))).toEqual([])
  })

  it('[E6.4][AC26] AC-1: the schema refuses a body that carries a store id, and strips nothing silently', () => {
    const point = { id: '0190f0c2-0000-7000-8000-0000000000f1', name: 'Shop', address: 'Street 1', instructions: null, mapsUrl: 'https://maps.example', hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] }

    expect(publicPickupPointsSchema.safeParse({ items: [point] }).success).toBe(true)
    expect(publicPickupPointsSchema.safeParse({ items: [{ ...point, storeId: point.id }] }).success).toBe(false)
    expect(publicPickupPointsSchema.safeParse({ items: [{ ...point, latitude: 47 }] }).success).toBe(false)
  })
})
