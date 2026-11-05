import { z } from 'zod'
import { pageOf } from './page.ts'
import { languageNoticeSchema } from './public.ts'

// What the public keepsake reads return (E6.4). The list and the detail carry text, photos and options and never a
// price, an amount, a currency or a stock figure (AC54), and no engraving (AC55). The price and the units live in the
// availability read only, which a guest's browser loads on its own.

export const publicKeepsakePhotoSchema = z.object({
  url: z.string().meta({ description: 'The original file' }),
  variants: z.array(z.object({ width: z.int(), url: z.string() })).meta({ description: 'The webp copies, smallest first' }),
}).meta({ id: 'PublicKeepsakePhoto', description: 'A photo of a keepsake, with its public addresses' })

export const publicKeepsakeCardSchema = z.object({
  id: z.uuid(),
  slug: z.string().meta({ description: 'The slug of the language carried' }),
  name: z.string(),
  cover: publicKeepsakePhotoSchema.nullable().meta({ description: 'The first photo, null when it is not ready' }),
  soldOut: z.boolean().meta({ description: 'True when every combination for sale has no unit available' }),
  ...languageNoticeSchema.shape,
}).meta({ id: 'PublicKeepsakeCard' })

export const publicKeepsakeListSchema = pageOf(publicKeepsakeCardSchema, 'PublicKeepsakeList', {
  total: z.int().min(0).meta({ description: 'How many published keepsakes match the filters, on every page' }),
})

// Stored data is not checked again on a read, so a description here is only known to be a document of nodes.
const descriptionSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(z.unknown()).optional(),
    text: z.string().optional(),
    marks: z.array(z.unknown()).optional(),
  })),
}).meta({ id: 'PublicKeepsakeDescription', description: 'The description as one Tiptap document: paragraphs, hard breaks, lists, bold, italic and links' })

const optionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  values: z.array(z.object({ id: z.uuid(), label: z.string() })).meta({ description: 'In the order guests see them' }),
}).meta({ id: 'PublicKeepsakeOption' })

const combinationSchema = z.object({
  id: z.uuid().meta({ description: 'The variant id, the key of the availability read' }),
  values: z.record(z.uuid(), z.uuid()).meta({ description: 'The value id of each option id. Empty for a keepsake with no option' }),
  photo: publicKeepsakePhotoSchema.nullable().meta({ description: 'The photo of the combination, null for none' }),
}).meta({ id: 'PublicKeepsakeCombination', description: 'A combination that is for sale. A combination that is not listed is not sold (ADR-017)' })

export const publicKeepsakeSchema = publicKeepsakeCardSchema.extend({
  description: descriptionSchema,
  photos: z.array(publicKeepsakePhotoSchema).meta({ description: 'The ready photos in the merchant\'s order' }),
  options: z.array(optionSchema),
  variants: z.array(combinationSchema),
  otherSlug: z.string().nullable().meta({ description: 'The slug of the other language, for the language switcher. Null when that language has no version' }),
}).meta({ id: 'PublicKeepsake' })

export const publicKeepsakeAvailabilitySchema = z.object({
  items: z.array(z.object({
    variantId: z.uuid(),
    priceRappen: z.int().meta({ description: 'The price in rappen (CHF 0.01)' }),
    currency: z.literal('CHF'),
    available: z.int().meta({ description: 'Units on hand minus units reserved, never below 0' }),
  })),
}).meta({ id: 'PublicKeepsakeAvailability', description: 'The price and the units of each combination for sale. The only public keepsake read with a price. Cached for 5 seconds' })

// The pickup points of the store that owns a keepsake (E6.4). Strict, so a store id, a pin or a row version added by
// mistake fails the contract test. The text is in the language asked for, or the other one when that point has none.
const pickupSpanSchema = z.strictObject({
  weekday: z.int().meta({ description: '1 (Monday) to 7 (Sunday)' }),
  opens: z.string().meta({ description: 'HH:MM' }),
  closes: z.string().meta({ description: 'HH:MM, or 24:00. Before opens means the next morning: the span belongs to the day it starts' }),
}).meta({ id: 'PublicPickupSpan' })

const pickupPointSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  instructions: z.string().nullable().meta({ description: 'Hand-over instructions, null for none' }),
  mapsUrl: z.string().meta({ description: 'The Google Maps link of the point, for directions' }),
  hours: z.array(pickupSpanSchema).meta({ description: 'The weekly spans, by weekday then opening time. Empty when the merchant gave none' }),
}).meta({ id: 'PublicPickupPoint' })

export const publicPickupPointsSchema = z.strictObject({
  items: z.array(pickupPointSchema).meta({ description: 'The active pickup points by the merchant\'s order. No store id, pin, position, archived flag or row version' }),
}).meta({ id: 'PublicPickupPoints', description: 'The active pickup points of the store that owns a published keepsake' })

export type PublicKeepsakePhoto = z.infer<typeof publicKeepsakePhotoSchema>
export type PublicKeepsakeCard = z.infer<typeof publicKeepsakeCardSchema>
export type PublicKeepsakeList = z.infer<typeof publicKeepsakeListSchema>
export type PublicKeepsake = z.infer<typeof publicKeepsakeSchema>
export type PublicKeepsakeAvailability = z.infer<typeof publicKeepsakeAvailabilitySchema>
export type PublicPickupPoints = z.infer<typeof publicPickupPointsSchema>
