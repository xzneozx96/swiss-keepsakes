import { z } from 'zod'
import { mediaSchema } from './media.ts'
import { numberedPageOf, numberedPageQuery } from './page.ts'

// Stock per variant (E6.3, DM-6, ADR-016). A row is one live variant of the store. `reserved` is the units open orders
// hold, `available` is `onHand - reserved` and never below 0. A set writes `onHand` only: the reserved units belong to
// the orders. Request bodies are strict.

export const STOCK_MAX = 9999
export const STOCK_BATCH_MAX = 200

const onHand = z.int().min(0).max(STOCK_MAX).meta({ description: 'The units on the shelf, 0 to 9999. Never below the reserved units' })

const localizedSchema = z.object({
  en: z.string().optional(),
  de: z.string().optional(),
}).meta({ id: 'StockText', description: 'A text per language. A language with no text is left out' })

export const stockSetBodySchema = z.strictObject({ onHand }).meta({ id: 'StockSetBody', description: 'The units in stock for one variant' })

export const stockManySetBodySchema = z.strictObject({
  items: z.array(z.strictObject({ skuId: z.uuid(), onHand }))
    .min(1)
    .max(STOCK_BATCH_MAX)
    .refine(items => new Set(items.map(item => item.skuId.toLowerCase())).size === items.length, 'Each variant may appear once'),
}).meta({ id: 'StockManySetBody', description: 'The units in stock for up to 200 variants, set in one transaction: all or nothing' })

export const stockRowSchema = z.object({
  skuId: z.uuid(),
  productId: z.uuid(),
  code: z.string().nullable().meta({ description: 'The SKU code. Null when the variant has none' }),
  keepsakeName: localizedSchema,
  variantTitle: localizedSchema.meta({ description: 'The option values joined by " / " ("XS / Red"). Empty for a keepsake with no option' }),
  photo: mediaSchema.nullable().meta({ description: 'The photo of the variant, else the first photo of the keepsake. Null for none' }),
  onHand: z.int(),
  reserved: z.int(),
  available: z.int(),
}).meta({ id: 'StockRow', description: 'The stock of one live variant' })

export const stockReservationSchema = z.object({
  orderId: z.uuid(),
  orderRef: z.string().nullable().meta({ description: 'The order reference. Null until the orders module exists' }),
  guestName: z.string().nullable().meta({ description: 'The guest. Null until the orders module exists' }),
  acceptedAt: z.iso.datetime().meta({ description: 'When the hold was made' }),
  quantity: z.int(),
}).meta({ id: 'StockReservation', description: 'An open order that holds units of the variant' })

export const stockItemSchema = stockRowSchema.extend({
  reservations: z.array(stockReservationSchema).meta({ description: 'The open holds, oldest first. Empty when nothing is reserved' }),
}).meta({ id: 'StockItem', description: 'The stock of one variant with the orders that hold it' })

export const stockFilterSchema = z.enum(['all', 'in-stock', 'sold-out']).meta({ id: 'StockFilter', description: '`in-stock`: at least one unit available. `sold-out`: none available' })

export const stockListQuerySchema = numberedPageQuery({
  filter: stockFilterSchema.optional(),
  q: z.string().trim().max(200).optional().meta({ description: 'Matches the code, the variant title or the keepsake name, in any case' }),
  sort: z.enum(['name', 'newest']).default('name').meta({ description: '`name`: keepsake name, variant title, code, then variant id descending. `newest`: variant id descending (a `uuidv7`, so newest first)' }),
})

export const stockListSchema = numberedPageOf(stockRowSchema, 'StockList', {
  counts: z.object({
    all: z.int(),
    inStock: z.int(),
    soldOut: z.int(),
  }).meta({ description: 'The tab figures of the whole store, counted before the filter and the search' }),
}).meta({ id: 'StockList', description: 'One page of the live variants of the store with their stock' })

export const stockManySchema = z.object({
  items: z.array(stockRowSchema),
}).meta({ id: 'StockMany', description: 'The rows that were set, in the order of the request' })

export type StockSetBody = z.infer<typeof stockSetBodySchema>
export type StockManySetBody = z.infer<typeof stockManySetBodySchema>
export type StockRow = z.infer<typeof stockRowSchema>
export type StockReservation = z.infer<typeof stockReservationSchema>
export type StockItem = z.infer<typeof stockItemSchema>
export type StockFilter = z.infer<typeof stockFilterSchema>
export type StockList = z.infer<typeof stockListSchema>
export type StockMany = z.infer<typeof stockManySchema>
