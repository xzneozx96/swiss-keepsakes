import { z } from 'zod'
import { noNul } from './text.js'

// The merchant's pickup points and their weekly hours (E6.6). Request bodies are strict. Text accepts blank: the use
// case trims it and rules on blank, so the 422 names the field. A span's weekday and times carry no range check here
// for the same reason: the use case answers 422 with the path of the span that is wrong.

const NAME_MAX = 120
const ADDRESS_MAX = 300
const INSTRUCTIONS_MAX = 600
export const PICKUP_MAX_SPANS = 35
export const PICKUP_MAX_PLACES = 100

const localizedInput = (max: number) => z.strictObject({
  en: noNul(z.string().max(max)).optional(),
  de: noNul(z.string().max(max)).optional(),
})

const spanInputSchema = z.strictObject({
  weekday: z.int().meta({ description: '1 (Monday) to 7 (Sunday)' }),
  opens: z.string().max(10).meta({ description: 'HH:MM' }),
  closes: z.string().max(10).meta({ description: 'HH:MM, or 24:00. Before opens means the next morning; equal to opens is refused' }),
}).meta({ id: 'PickupSpanInput' })

const nameInput = localizedInput(NAME_MAX).meta({ id: 'PickupNameInput', description: 'Name per language, at most 120 characters each. At least one language must be left or the answer is 422' })
const addressInput = localizedInput(ADDRESS_MAX).meta({ id: 'PickupAddressInput', description: 'Address per language, at most 300 characters each. At least one language must be left or the answer is 422' })
const instructionsInput = localizedInput(INSTRUCTIONS_MAX).meta({ id: 'PickupInstructionsInput', description: 'Optional hand-over instructions per language, at most 600 characters each' })
const hoursInput = z.array(spanInputSchema).max(PICKUP_MAX_SPANS).meta({ description: 'The weekly spans. Several per day are allowed, overlapping too; one day cannot repeat the same opens' })

export const pickupPlaceWriteBodySchema = z.strictObject({
  name: nameInput,
  address: addressInput,
  instructions: instructionsInput.optional(),
  hours: hoursInput,
}).meta({ id: 'PickupPlaceWriteBody', description: 'A new pickup point, appended last' })

export const pickupPlacePatchBodySchema = z.strictObject({
  name: nameInput.optional(),
  address: addressInput.optional(),
  instructions: instructionsInput.optional(),
  hours: hoursInput.optional(),
}).refine(body => Object.values(body).some(value => value !== undefined), 'Give a name, an address, instructions or hours')
  .meta({ id: 'PickupPlacePatchBody', description: 'Fields left out stay as they are. Hours, when given, replace the whole set' })

export const pickupPlaceOrderBodySchema = z.strictObject({
  ids: z.array(z.uuid()).max(PICKUP_MAX_PLACES),
}).meta({ id: 'PickupPlaceOrderBody', description: 'The new order of the active pickup points. ids must be exactly the active points' })

const localizedOut = z.object({ en: z.string().optional(), de: z.string().optional() })

export const pickupPlaceSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  name: localizedOut,
  address: localizedOut,
  instructions: localizedOut.nullable(),
  position: z.int(),
  archived: z.boolean(),
  hours: z.array(z.object({ weekday: z.int(), opens: z.string(), closes: z.string() })),
  rowVersion: z.int(),
}).meta({ id: 'PickupPlace' })

export const pickupPlaceListSchema = z.object({
  items: z.array(pickupPlaceSchema).meta({ description: 'By position, then id' }),
}).meta({ id: 'PickupPlaceList' })

export const pickupPlaceListQuerySchema = z.object({
  archived: z.enum(['true', 'false']).optional().meta({ description: 'true lists the archived points; the default lists the active ones' }),
}).meta({ id: 'PickupPlaceListQuery' })

export type PickupPlaceWriteBody = z.infer<typeof pickupPlaceWriteBodySchema>
export type PickupPlacePatchBody = z.infer<typeof pickupPlacePatchBodySchema>
export type PickupPlaceOrderBody = z.infer<typeof pickupPlaceOrderBodySchema>
export type PickupPlace = z.infer<typeof pickupPlaceSchema>
export type PickupPlaceList = z.infer<typeof pickupPlaceListSchema>
export type PickupPlaceListQuery = z.infer<typeof pickupPlaceListQuerySchema>
