import { z } from 'zod'

export const meSchema = z.object({
  guestId: z.uuid().meta({ description: 'The guest profile that the guest\'s orders and bookings point at' }),
}).meta({ id: 'Me' })
