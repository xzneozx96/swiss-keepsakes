import { z } from 'zod'
import { mediaSchema } from './media.ts'
import { noNul } from './text.ts'

// The merchant keepsake catalog (M11, M12). A keepsake is a product with a name and a text per language, photos, a
// commission, options and variants (SKUs). Request bodies are strict, so an engraving, a deposit or any other unknown
// key is a 400. A save is a PATCH: a left-out field stays, a list replaces. The options of a keepsake save in one
// PUT with the new values of its variants, and a refusal comes back as a 422 with a code and the numbers.

export const MAX_COMMISSION = 0.5
export const MAX_PHOTOS = 12
export const NAME_MAX = 90
export const TEXT_MAX = 1200
export const MAX_PRICE_RAPPEN = 100_000_000
export const MAX_OPTIONS = 5
export const MAX_VALUES = 50
export const MAX_VARIANTS = 300
export const OPTION_NAME_MAX = 60
export const VALUE_LABEL_MAX = 80
export const SWATCH_PATTERN = /^#[0-9a-f]{6}$/

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

// A label in English, German or both. A key left out means no label in that language.
const labelSchema = (max: number) => z.strictObject({
  en: noNul(z.string().trim().min(1).max(max)).optional(),
  de: noNul(z.string().trim().min(1).max(max)).optional(),
})

const ref = z.string().min(1).max(64)
const fewKeys = (values: Record<string, string>) => Object.keys(values).length <= MAX_OPTIONS
const valueRefs = z.record(ref, ref).refine(fewKeys, { message: `At most ${MAX_OPTIONS} options` })
const valueIds = z.record(z.uuid(), z.uuid()).refine(fewKeys, { message: `At most ${MAX_OPTIONS} options` })

export const optionValueWriteSchema = z.strictObject({
  ref: ref.meta({ description: 'The id of a value that exists, or a key you choose for a new one' }),
  label: labelSchema(VALUE_LABEL_MAX).meta({ id: 'ValueLabel', description: 'The label per language. One language is enough' }),
  swatch: z.string().regex(SWATCH_PATTERN).nullable().optional().meta({ description: 'A colour as # and six lowercase hexadecimal digits, or null for none' }),
}).meta({ id: 'OptionValueWrite', description: 'A value of an option' })

export const optionWriteSchema = z.strictObject({
  ref: ref.meta({ description: 'The id of an option that exists, or a key you choose for a new one' }),
  name: labelSchema(OPTION_NAME_MAX).meta({ id: 'OptionName', description: 'The name per language. One language is enough' }),
  values: z.array(optionValueWriteSchema).max(MAX_VALUES).meta({ description: 'In the order guests see them. At least one' }),
}).meta({ id: 'OptionWrite', description: 'An option with its values' })

const optionList = z.array(optionWriteSchema).max(MAX_OPTIONS)

export const keepsakeVariantWriteSchema = z.strictObject({
  skuCode: noNul(z.string().trim().min(1).max(60)).meta({ description: 'Letters and digits joined by - _ or ., unique in the shop' }),
  priceRappen: z.int().min(1).max(MAX_PRICE_RAPPEN).meta({ description: 'The price in Rappen, above 0' }),
  values: valueRefs.optional().meta({ description: 'The value ref of each option ref. A keepsake with no option sends none' }),
}).meta({ id: 'KeepsakeVariantWrite', description: 'A variant to create: a code, a price and one value of each option. It is for sale' })

// What the create flow sends: the details, the options and a variant for each combination that is sold. A name in one
// language is required. The draft is made with those variants for sale. A keepsake with no option has one variant.
export const productCreateBodySchema = z.strictObject({
  name: keepsakeNameSchema,
  text: keepsakeTextSchema.optional(),
  photoIds: photoIds.optional(),
  commissionRate: commissionRate.optional(),
  options: optionList.optional(),
  variants: z.array(keepsakeVariantWriteSchema).min(1).max(MAX_VARIANTS),
}).meta({ id: 'ProductCreateBody', description: 'A new keepsake as a draft, with its options and variants' })

export const optionsSaveBodySchema = z.strictObject({
  options: optionList.meta({ description: 'Every option the keepsake should have, in order. One that is left out is deleted, if no variant uses it' }),
  variantValues: z.array(z.strictObject({
    variantId: z.uuid(),
    values: valueRefs.meta({ description: 'The value ref of each option ref, for a new option or a changed value' }),
  })).max(MAX_VARIANTS).optional().meta({ description: 'The new values of existing variants, archived ones too. A variant keeps the values it has for options that stay' }),
}).meta({ id: 'OptionsSaveBody', description: 'The options of a keepsake with the new values of its variants, saved in one request' })

export const variantCreateBodySchema = z.strictObject({
  skuCode: noNul(z.string().trim().min(1).max(60)),
  priceRappen: z.int().min(1).max(MAX_PRICE_RAPPEN),
  status: z.enum(['published', 'draft']).optional().meta({ description: 'published is for sale, draft is hidden. For sale when left out' }),
  values: valueIds.optional().meta({ description: 'The value id of each option id' }),
}).meta({ id: 'VariantCreateBody', description: 'One more variant of a keepsake' })

export const productSaveBodySchema = z.strictObject({
  name: keepsakeNameSchema.optional(),
  text: keepsakeTextSchema.optional(),
  photoIds: photoIds.optional(),
  commissionRate: commissionRate.optional(),
}).meta({ id: 'ProductSaveBody', description: 'The autosave. name, text and photoIds replace the draft. commissionRate is saved live' })

export const variantSaveBodySchema = z.strictObject({
  skuCode: noNul(z.string().trim().min(1).max(60)).optional(),
  priceRappen: z.int().min(1).max(MAX_PRICE_RAPPEN).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional().meta({ description: 'published is for sale, draft is hidden from guests, archived keeps the variant for old orders and is final' }),
  values: valueIds.optional().meta({ description: 'The value id of every option id. Replaces the values' }),
}).meta({ id: 'VariantSaveBody', description: 'A change to one variant' })

const localizedView = z.object({ en: z.string().optional(), de: z.string().optional() })

export const productVariantSchema = z.object({
  id: z.uuid(),
  skuCode: z.string(),
  priceRappen: z.int(),
  status: z.enum(['published', 'draft', 'archived']).meta({ description: 'published is for sale, draft is hidden from guests, archived stays for old orders' }),
  values: z.record(z.uuid(), z.uuid()).meta({ description: 'The value id of each option id. Empty for a keepsake with no option' }),
}).meta({ id: 'ProductVariant', description: 'A variant (SKU) of a keepsake' })

export const productOptionSchema = z.object({
  id: z.uuid(),
  name: localizedView,
  values: z.array(z.object({
    id: z.uuid(),
    label: localizedView,
    swatch: z.string().nullable(),
  })).meta({ description: 'In the order guests see them' }),
}).meta({ id: 'ProductOption', description: 'An option of one keepsake, such as Size or Theme' })

export const publishCheckSchema = z.object({
  code: z.enum(['language', 'photos', 'variant-for-sale', 'other-language', 'hidden', 'commission-zero', 'option-labels']),
  card: z.enum(['basics', 'photos', 'options', 'variants', 'commission']).meta({ description: 'The card of the edit screen that fixes it' }),
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
  options: z.array(productOptionSchema).meta({ description: 'In the order guests see them' }),
  variants: z.array(productVariantSchema).meta({ description: 'Every variant, archived ones too' }),
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
export type OptionsSaveBody = z.infer<typeof optionsSaveBodySchema>
export type OptionWrite = z.infer<typeof optionWriteSchema>
export type VariantCreateBody = z.infer<typeof variantCreateBodySchema>
export type ProductOption = z.infer<typeof productOptionSchema>
export type ProductSaveBody = z.infer<typeof productSaveBodySchema>
export type VariantSaveBody = z.infer<typeof variantSaveBodySchema>
export type ProductVariant = z.infer<typeof productVariantSchema>
export type PublishCheck = z.infer<typeof publishCheckSchema>
export type Product = z.infer<typeof productSchema>
export type ProductListItem = z.infer<typeof productListItemSchema>
export type ProductList = z.infer<typeof productListSchema>
