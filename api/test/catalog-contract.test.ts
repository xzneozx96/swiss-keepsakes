import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const document = JSON.parse(readFileSync(fileURLToPath(new URL('../../packages/api-contract/generated/openapi.json', import.meta.url)), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>
  components: { schemas: Record<string, unknown> }
}

const catalogPaths = Object.keys(document.paths).filter(path => path.startsWith('/api/store/{storeId}/products'))
const catalogSchemas = ['Product', 'ProductList', 'ProductListItem', 'ProductCreateBody', 'ProductSaveBody', 'VariantSaveBody', 'ProductVariant', 'KeepsakeVariantWrite', 'PublishCheck', 'KeepsakeName', 'KeepsakeText']

describe('[E6.1][AC55] the catalog contract', () => {
  it('[E6.1][AC55] has the keepsake routes and nothing else under products', () => {
    expect(catalogPaths.sort()).toEqual([
      '/api/store/{storeId}/products',
      '/api/store/{storeId}/products/{productId}',
      '/api/store/{storeId}/products/{productId}/publish',
      '/api/store/{storeId}/products/{productId}/unpublish',
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
