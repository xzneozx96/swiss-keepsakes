import { z } from 'zod'

// The merchant category API for the map and blog lists (E4.18). Request bodies are strict. A name accepts blank text:
// the use case trims it and rules on blank, so the 422 carries the message for the name field.

export const categoryKindSchema = z.enum(['map', 'blog']).meta({ id: 'CategoryKind', description: 'Which list: map categories (pins) or blog categories (story groups)' })

// Postgres text and jsonb refuse U+0000, and a lone UTF-16 surrogate cannot be written as UTF-8.
const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
const nameText = z.string().max(300)
  .refine(value => !value.includes('\u0000'), 'Text may not contain a NUL character')
  .refine(value => !loneSurrogate.test(value), 'Text may not contain an unpaired surrogate')

const categoryNameInputSchema = z.strictObject({
  en: nameText.optional(),
  de: nameText.optional(),
}).meta({ id: 'CategoryNameInput', description: 'Name per language, at most 300 characters each. Blank counts as missing; at least one language must be left or the answer is 422' })

export const categoryWriteBodySchema = z.strictObject({
  name: categoryNameInputSchema,
  parentId: z.uuid().nullable().optional(),
}).meta({ id: 'CategoryWriteBody', description: 'A new category, appended last among its siblings. The slug is made from the name and never changes' })

export const categoryPatchBodySchema = z.strictObject({
  name: categoryNameInputSchema.optional(),
  parentId: z.uuid().nullable().optional(),
}).refine(body => body.name !== undefined || body.parentId !== undefined, 'Give a name or a parentId')
  .meta({ id: 'CategoryPatchBody', description: 'A name replaces both languages. A changed parentId appends the category last under the new parent' })

export const categoryOrderBodySchema = z.strictObject({
  parentId: z.uuid().nullable(),
  ids: z.array(z.uuid()).max(500).refine(ids => new Set(ids.map(id => id.toLowerCase())).size === ids.length, 'Each id may appear once'),
}).meta({ id: 'CategoryOrderBody', description: 'The new order of the siblings under parentId (null for the top level). ids must be exactly the current siblings' })

export const merchantCategorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.object({ en: z.string().nullable(), de: z.string().nullable() }),
  parentId: z.uuid().nullable(),
  position: z.int(),
  childCount: z.int(),
  useCount: z.int().meta({ description: 'Pins (map) or story groups (blog) tagged with it, whatever their status' }),
}).meta({ id: 'MerchantCategory' })

export const merchantCategoryListSchema = z.object({
  items: z.array(merchantCategorySchema).meta({ description: 'Top-level categories first, then sub-categories, each by position' }),
}).meta({ id: 'MerchantCategoryList' })

export type CategoryKind = z.infer<typeof categoryKindSchema>
export type CategoryWriteBody = z.infer<typeof categoryWriteBodySchema>
export type CategoryPatchBody = z.infer<typeof categoryPatchBodySchema>
export type CategoryOrderBody = z.infer<typeof categoryOrderBodySchema>
export type MerchantCategory = z.infer<typeof merchantCategorySchema>
export type MerchantCategoryList = z.infer<typeof merchantCategoryListSchema>
