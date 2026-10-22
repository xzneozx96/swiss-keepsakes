import { z } from 'zod'

export const meStoreSchema = z.object({
  storeId: z.uuid(),
  role: z.enum(['owner', 'manager']),
  status: z.enum(['invited', 'onboarding', 'live', 'suspended']),
}).meta({ id: 'MeStore' })

export const meSchema = z.object({
  guestId: z.uuid().meta({ description: 'The guest profile that the guest\'s orders and bookings point at' }),
  stores: z.array(meStoreSchema).meta({ description: 'The stores the user belongs to, oldest membership first. Empty for a guest and for a Super Admin, who holds no store role' }),
}).meta({ id: 'Me' })
