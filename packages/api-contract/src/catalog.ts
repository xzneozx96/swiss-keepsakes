import { z } from 'zod'
import { mediaSchema } from './media.ts'
import { noNul } from './text.ts'

// The merchant keepsake catalog (M11, M12). A keepsake is a product with a name and a text per language, photos, a
// commission and variants (SKUs). Request bodies are strict, so an engraving, a deposit or any other unknown key is a
// 400. A save is a PATCH: a left-out field stays, a list replaces. E6.2 adds options and several variants.

export const MAX_COMMISSION = 0.5
export const MAX_PHOTOS = 12
export const NAME_MAX = 90
export const TEXT_MAX = 1200
export const MAX_PRICE_RAPPEN = 100_000_000

const language = z.enum(['en', 'de'])

// Trimmed first, so "  " is empty and refused. A key left out means no text in that language.
const keepsakeNameSchema = z.strictObject({
  en: noNul(z.string().trim().min(1).max(NAME_MAX)).optional(),
  de: noNul(z.string().trim().min(1).max(NAME_MAX)).optional(),
}).meta({ id: 'KeepsakeName', description: 'The name per language, at most 90 characters each. A present key is non-empty' })

const keepsakeTextSchema = z.strictObject({
  en: noNul(z.string().trim().min(1).max(TEXT_MAX)).optional(),
  de: noNul(z.string().trim().min(1).max(TEXT_MAX)).optional(),
}).meta({ id: 'KeepsakeText', description: 'The text per language, at most 1200 characters each. A present key is non-empty' })

const photoIds = z.array(z.uuid()).max(MAX_PHOTOS)
  .refine(ids => new Set(ids.map(id => id.toLowerCase())).size === ids.length, 'Each photo may appear once')
const commissionRate = z.number().min(0).max(MAX_COMMISSION).meta({ description: 'The share of a sale that a referral partner earns, from 0 to 0.5' })

export const keepsakeVariantWriteSchema = z.strictObject({
  skuCode: noNul(z.string().trim().min(1).max(60)).meta({ description: 'Letters and digits joined by - _ or ., unique in the shop' }),
  priceRappen: z.int().min(1).max(MAX_PRICE_RAPPEN).meta({ description: 'The price in Rappen, above 0' }),
}).meta({ id: 'KeepsakeVariantWrite', description: 'A variant to create: a code and a price. It is for sale' })

// What the create flow sends: the details, and the one variant of a keepsake with no options. A name in one language
// is required. The draft is made with that variant for sale.
export const productCreateBodySchema = z.strictObject({
  name: keepsakeNameSchema,
  text: keepsakeTextSchema.optional(),
  photoIds: photoIds.optional(),
  commissionRate: commissionRate.optional(),
  variants: z.array(keepsakeVariantWriteSchema).length(1).meta({ description: 'Exactly one variant until options exist (E6.2)' }),
}).meta({ id: 'ProductCreateBody', description: 'A new keepsake as a draft, with its one variant' })

export const productSaveBodySchema = z.strictObject({
  name: keepsakeNameSchema.optional(),
  text: keepsakeTextSchema.optional(),
  photoIds: photoIds.optional(),
  commissionRate: commissionRate.optional(),
}).meta({ id: 'ProductSaveBody', description: 'The autosave. name, text and photoIds replace the draft. commissionRate is saved live' })

export const variantSaveBodySchema = z.strictObject({
  skuCode: noNul(z.string().trim().min(1).max(60)).optional(),
  priceRappen: z.int().min(1).max(MAX_PRICE_RAPPEN).optional(),
  status: z.enum(['published', 'draft']).optional().meta({ description: 'published is for sale, draft is hidden from guests' }),
}).meta({ id: 'VariantSaveBody', description: 'A change to one variant' })

const localizedView = z.object({ en: z.string().optional(), de: z.string().optional() })

export const productVariantSchema = z.object({
  id: z.uuid(),
  skuCode: z.string(),
  priceRappen: z.int(),
  status: z.enum(['published', 'draft']).meta({ description: 'published is for sale, draft is hidden from guests' }),
}).meta({ id: 'ProductVariant', description: 'A variant (SKU) of a keepsake' })

export const publishCheckSchema = z.object({
  code: z.enum(['language', 'photos', 'variant-for-sale', 'other-language', 'hidden', 'commission-zero']),
  card: z.enum(['basics', 'photos', 'variants', 'commission']).meta({ description: 'The card of the edit screen that fixes it' }),
  count: z.int().optional(),
  codes: z.array(z.string()).optional().meta({ description: 'SKU codes the check names' }),
  language: language.optional().meta({ description: 'With other-language: the language that has no full text' }),
}).meta({ id: 'PublishCheck', description: 'One thing the publish card reports' })

export const productSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  status: z.enum(['draft', 'published']),
  name: localizedView.meta({ description: 'The working copy: the draft, else the published text' }),
  text: localizedView,
  photos: z.array(mediaSchema).meta({ description: 'The working photos in order, the first is the cover' }),
  commissionRate: z.number(),
  slug: localizedView.nullable().meta({ description: 'The web address per language, set at the first publish' }),
  hasUnpublishedEdits: z.boolean().meta({ description: 'A published keepsake whose draft differs from the live copy' }),
  variants: z.array(productVariantSchema),
  blocking: z.array(publishCheckSchema).meta({ description: 'What stops publishing, empty when it can go live' }),
  warnings: z.array(publishCheckSchema),
  rowVersion: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'Product', description: 'A keepsake with its working copy, variants and publish checks' })

export const productListItemSchema = z.object({
  id: z.uuid(),
  name: localizedView,
  status: z.enum(['draft', 'published']),
  hasUnpublishedEdits: z.boolean(),
  cover: mediaSchema.nullable().meta({ description: 'The first photo' }),
  variantCount: z.int().meta({ description: 'Variants that are not archived' }),
  soldOutCount: z.int().meta({ description: 'Variants with no unit available. Always 0 until stock exists (E6.3)' }),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'ProductListItem', description: 'One row of the keepsake list' })

export const productListSchema = z.object({
  items: z.array(productListItemSchema),
}).meta({ id: 'ProductList', description: 'The keepsakes of the store, newest first' })

export type ProductCreateBody = z.infer<typeof productCreateBodySchema>
export type ProductSaveBody = z.infer<typeof productSaveBodySchema>
export type VariantSaveBody = z.infer<typeof variantSaveBodySchema>
export type ProductVariant = z.infer<typeof productVariantSchema>
export type PublishCheck = z.infer<typeof publishCheckSchema>
export type Product = z.infer<typeof productSchema>
export type ProductListItem = z.infer<typeof productListItemSchema>
export type ProductList = z.infer<typeof productListSchema>
