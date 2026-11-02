import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const document = JSON.parse(readFileSync(fileURLToPath(new URL('../../packages/api-contract/generated/openapi.json', import.meta.url)), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>
  components: { schemas: Record<string, unknown> }
}

const catalogPaths = Object.keys(document.paths).filter(path => path.startsWith('/api/store/{storeId}/products'))
const catalogSchemas = ['Product', 'ProductList', 'ProductListItem', 'ProductCreateBody', 'ProductSaveBody', 'VariantSaveBody', 'VariantCreateBody', 'ProductVariant', 'ProductOption', 'OptionsSaveBody', 'OptionWrite', 'OptionValueWrite', 'OptionName', 'ValueLabel', 'KeepsakeVariantWrite', 'VariantsSaveBody', 'PublishCheck', 'KeepsakeName', 'KeepsakeText']

describe('[E6.1][AC55] the catalog contract', () => {
  it('[E6.1][AC55] has the keepsake routes and nothing else under products', () => {
    expect(catalogPaths.sort()).toEqual([
      '/api/store/{storeId}/products',
      '/api/store/{storeId}/products/{productId}',
      '/api/store/{storeId}/products/{productId}/options',
      '/api/store/{storeId}/products/{productId}/publish',
      '/api/store/{storeId}/products/{productId}/unpublish',
      '/api/store/{storeId}/products/{productId}/variants',
      '/api/store/{storeId}/products/{productId}/variants/{skuId}',
    ])
  })

  it.each(['engrav', 'gravur', 'deposit', 'paylater', 'pay-later', 'subcategor', 'paymentdeadline'])('[E6.1][AC55] no catalog schema or path names "%s"', (word) => {
    const text = JSON.stringify([catalogPaths.map(path => document.paths[path]), catalogSchemas.map(name => document.components.schemas[name])]).toLowerCase()

    expect(catalogSchemas.every(name => document.components.schemas[name] !== undefined)).toBe(true)
    expect(text).not.toContain(word)
  })

  it('[E6.1][ADR-021] no route or schema reads or writes a category', () => {
    const text = JSON.stringify([catalogPaths, catalogSchemas.map(name => document.components.schemas[name])]).toLowerCase()

    expect(text).not.toContain('categor')
  })
})

describe('[E6.2][AC52] the options and variants contract', () => {
  interface Schema { properties?: Record<string, unknown>, required?: string[] }
  const schema = (name: string) => document.components.schemas[name] as Schema
  const operation = (path: string, method: string) => document.paths[`/api/store/{storeId}/products${path}`]?.[method] as { parameters?: { name: string, in: string }[], responses: Record<string, unknown> }

  it('[E6.2][AC52] the product carries its options and the value of each option for each variant', () => {
    expect(Object.keys(schema('Product').properties ?? {})).toEqual(expect.arrayContaining(['options', 'variants']))
    expect(Object.keys(schema('ProductVariant').properties ?? {})).toContain('values')
    expect(Object.keys(schema('ProductOption').properties ?? {})).toEqual(['id', 'name', 'values'])
  })

  it('[E6.2][AC52] saving the options takes the options, the new values of variants and the new variants in one body, with If-Match', () => {
    expect(Object.keys(schema('OptionsSaveBody').properties ?? {})).toEqual(['newVariants', 'options', 'variantValues'])
    expect(operation('/{productId}/options', 'put').parameters).toContainEqual(expect.objectContaining({ name: 'If-Match', in: 'header' }))
    expect(Object.keys(operation('/{productId}/options', 'put').responses)).toEqual(expect.arrayContaining(['200', 'default']))
  })

  it('[T-008][AC4] the new variants of an options save are for sale, with a description', () => {
    const text = JSON.stringify(document.components.schemas.OptionsSaveBody)

    expect(text).toContain('Variants to create in the same write')
    expect(text).toContain('KeepsakeVariantWrite')
  })

  it('[T-008][AC4] changing several variants is a PATCH of variants with no If-Match, 1 to 300 rows', () => {
    const patch = operation('/{productId}/variants', 'patch')

    expect(patch.parameters?.some(p => p.name === 'If-Match')).toBe(false)
    expect(Object.keys(patch.responses)).toEqual(expect.arrayContaining(['200', 'default']))
    expect(Object.keys(schema('VariantsSaveBody').properties ?? {})).toEqual(['variants'])
    expect(JSON.stringify(document.components.schemas.VariantsSaveBody)).toContain('"minItems":1')
    expect(JSON.stringify(document.components.schemas.VariantsSaveBody)).toContain('"maxItems":300')
  })

  it('[E6.2][AC52] creating a variant is a POST that answers 201 and has no row version', () => {
    expect(Object.keys(operation('/{productId}/variants', 'post').responses)).toEqual(expect.arrayContaining(['201', 'default']))
    expect(operation('/{productId}/variants', 'post').parameters?.some(p => p.name === 'If-Match')).toBe(false)
  })

  it('[E6.2][AC52] a refusal carries a code and its numbers', () => {
    const problem = document.components.schemas.Problem as { properties: { errors: { items: Schema } } }

    expect(Object.keys(problem.properties.errors.items.properties ?? {})).toEqual(expect.arrayContaining(['code', 'params']))
  })

  it('[E6.2][AC52] a swatch is a lowercase # colour, and the status archived is a status, not a restore', () => {
    const text = JSON.stringify(document.components.schemas.OptionValueWrite)

    expect(text).toContain('^#[0-9a-f]{6}$')
    expect(JSON.stringify(document.components.schemas.VariantSaveBody)).toContain('archived')
    expect(JSON.stringify(catalogPaths)).not.toContain('restore')
  })
})
