import { z } from 'zod'
import { noNul } from './text.js'

// The merchant category API for the map and blog lists (E4.18). Request bodies are strict. A name accepts blank text:
// the use case trims it and rules on blank, so the 422 carries the message for the name field.

export const categoryKindSchema = z.enum(['map', 'blog']).meta({ id: 'CategoryKind', description: 'Which list: map categories (pins) or blog categories (story groups)' })

// The same list as `categoryIcons` in @sk/domain (the contract does not import the domain; a test keeps the two equal, group by group in the same order).
export const categoryIconSchema = z.enum([
  'toilet', 'water', 'wifi', 'locker', 'cash', 'bank', 'info', 'emergency', 'pharmacy', 'hospital', 'post',
  'transport', 'train', 'boat', 'bicycle', 'scooter', 'car', 'airport', 'fuel', 'parking', 'charging', 'taxi',
  'restaurant', 'cafe', 'bar', 'brewery', 'bakery', 'pizza', 'dessert', 'tea', 'market', 'supermarket',
  'landmark', 'church', 'castle', 'tower', 'bridge', 'monument', 'museum', 'viewpoint', 'square', 'old-town', 'photo-spot', 'art', 'theatre', 'library',
  'shop', 'souvenirs', 'watches', 'clothing', 'jewellery', 'books', 'bags',
  'mountain', 'park', 'tree', 'lake', 'snow', 'sun', 'hiking', 'cycling', 'swimming', 'campfire',
  'event', 'festival', 'concert', 'tickets', 'fair', 'sport', 'wellness', 'family', 'pets',
  'holiday', 'hotel', 'laundry', 'tour', 'route', 'walk',
])
  .meta({ id: 'CategoryIcon', description: 'The icon of a map category, one of a fixed set. A place with no photo shows the icon of its first category that has one; a sub-category with none takes its parent\'s' })

const nameText = noNul(z.string().max(300))

const categoryNameInputSchema = z.strictObject({
  en: nameText.optional(),
  de: nameText.optional(),
}).meta({ id: 'CategoryNameInput', description: 'Name per language, at most 300 characters each. Blank counts as missing; at least one language must be left or the answer is 422' })

export const categoryWriteBodySchema = z.strictObject({
  name: categoryNameInputSchema,
  parentId: z.uuid().nullable().optional(),
  icon: categoryIconSchema.nullable().optional().meta({ description: 'Map categories only; a blog category with an icon is 422' }),
  showOnHome: z.boolean().optional().meta({ description: 'Map categories only: list it on the home\'s "Sorted before you unpack" row. A blog category with true is 422' }),
}).meta({ id: 'CategoryWriteBody', description: 'A new category, appended last among its siblings. The slug is made from the name and never changes' })

export const categoryPatchBodySchema = z.strictObject({
  name: categoryNameInputSchema.optional(),
  parentId: z.uuid().nullable().optional(),
  icon: categoryIconSchema.nullable().optional().meta({ description: 'Map categories only; null clears the icon' }),
  showOnHome: z.boolean().optional().meta({ description: 'Map categories only' }),
}).refine(body => body.name !== undefined || body.parentId !== undefined || body.icon !== undefined || body.showOnHome !== undefined, 'Give a name, a parentId, an icon or showOnHome')
  .meta({ id: 'CategoryPatchBody', description: 'A name replaces both languages. A changed parentId appends the category last under the new parent. icon sets or clears the icon, showOnHome sets the home switch' })

export const categoryOrderBodySchema = z.strictObject({
  parentId: z.uuid().nullable(),
  ids: z.array(z.uuid()).max(500),
}).meta({ id: 'CategoryOrderBody', description: 'The new order of the siblings under parentId (null for the top level). ids must be exactly the current siblings' })

export const merchantCategorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.object({ en: z.string().nullable(), de: z.string().nullable() }),
  parentId: z.uuid().nullable(),
  icon: categoryIconSchema.nullable().meta({ description: 'Always null for a blog category' }),
  showOnHome: z.boolean().meta({ description: 'Always false for a blog category' }),
  position: z.int(),
  childCount: z.int(),
  useCount: z.int().meta({ description: 'Pins (map) or story groups (blog) tagged with it, whatever their status' }),
}).meta({ id: 'MerchantCategory' })

export const merchantCategoryListSchema = z.object({
  items: z.array(merchantCategorySchema).meta({ description: 'Top-level categories first, then sub-categories, each by position' }),
}).meta({ id: 'MerchantCategoryList' })

export type CategoryIcon = z.infer<typeof categoryIconSchema>
export type CategoryKind = z.infer<typeof categoryKindSchema>
export type CategoryWriteBody = z.infer<typeof categoryWriteBodySchema>
export type CategoryPatchBody = z.infer<typeof categoryPatchBodySchema>
export type CategoryOrderBody = z.infer<typeof categoryOrderBodySchema>
export type MerchantCategory = z.infer<typeof merchantCategorySchema>
export type MerchantCategoryList = z.infer<typeof merchantCategoryListSchema>
