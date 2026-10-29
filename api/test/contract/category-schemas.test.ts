import {
  categoryKindSchema,
  categoryOrderBodySchema,
  categoryPatchBodySchema,
  categoryWriteBodySchema,
  merchantCategoryListSchema,
  merchantCategorySchema,
  problemTypes,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const uuid = '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d'
const uuid2 = '4f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2e'

describe('[E4.18][AC87] merchant category schemas', () => {
  it('kind is map or blog', () => {
    expect(categoryKindSchema.parse('map')).toBe('map')
    expect(categoryKindSchema.parse('blog')).toBe('blog')
    expect(categoryKindSchema.safeParse('tour').success).toBe(false)
  })

  it('a create body needs a name and takes an optional parent', () => {
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'Walks' } }).success).toBe(true)
    expect(categoryWriteBodySchema.safeParse({ name: { de: 'Wanderungen' }, parentId: null }).success).toBe(true)
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'Walks' }, parentId: uuid }).success).toBe(true)
    expect(categoryWriteBodySchema.safeParse({}).success).toBe(false)
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'Walks' }, parentId: 'root' }).success).toBe(false)
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'Walks' }, slug: 'walks' }).success).toBe(false)
  })

  it('a blank name passes the schema, so the use case can answer with its own 422', () => {
    const parsed = categoryWriteBodySchema.parse({ name: { en: '  ', de: '' } })
    expect(parsed.name).toEqual({ en: '  ', de: '' })
    expect(categoryWriteBodySchema.safeParse({ name: {} }).success).toBe(true)
  })

  it('a name refuses a NUL, an unknown language and text over 300 characters', () => {
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'a\u0000b' } }).success).toBe(false)
    expect(categoryWriteBodySchema.safeParse({ name: { fr: 'Balades' } }).success).toBe(false)
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'a'.repeat(301) } }).success).toBe(false)
    expect(categoryWriteBodySchema.safeParse({ name: { en: 'a'.repeat(300) } }).success).toBe(true)
  })

  it('a patch needs at least one field', () => {
    expect(categoryPatchBodySchema.safeParse({}).success).toBe(false)
    expect(categoryPatchBodySchema.safeParse({ name: { en: 'Walks' } }).success).toBe(true)
    expect(categoryPatchBodySchema.safeParse({ parentId: null }).success).toBe(true)
    expect(categoryPatchBodySchema.safeParse({ parentId: uuid }).success).toBe(true)
    expect(categoryPatchBodySchema.safeParse({ parentId: 'x' }).success).toBe(false)
    expect(categoryPatchBodySchema.safeParse({ position: 1 }).success).toBe(false)
  })

  it('an order body needs a parent (id or null) and a list of uuids (repeats are left to the use case)', () => {
    expect(categoryOrderBodySchema.safeParse({ parentId: null, ids: [uuid, uuid2] }).success).toBe(true)
    expect(categoryOrderBodySchema.safeParse({ parentId: uuid, ids: [] }).success).toBe(true)
    expect(categoryOrderBodySchema.safeParse({ ids: [uuid] }).success).toBe(false)
    expect(categoryOrderBodySchema.safeParse({ parentId: null }).success).toBe(false)
    expect(categoryOrderBodySchema.safeParse({ parentId: null, ids: ['nope'] }).success).toBe(false)
    expect(categoryOrderBodySchema.safeParse({ parentId: null, ids: [uuid, uuid] }).success).toBe(true)
  })

  it('a merchant category carries counts and nullable names', () => {
    const category = { id: uuid, slug: 'walks', name: { en: 'Walks', de: null }, parentId: null, position: 1, childCount: 0, useCount: 2 }
    expect(merchantCategorySchema.parse(category)).toEqual(category)
    expect(merchantCategoryListSchema.parse({ items: [category] }).items).toHaveLength(1)
    expect(merchantCategorySchema.safeParse({ ...category, useCount: undefined }).success).toBe(false)
  })

  it('the four category problems are known codes', () => {
    for (const type of ['category-has-children', 'category-in-use', 'category-too-deep', 'category-parent-has-children'])
      expect(problemTypes).toContain(type)
  })
})
