import { z } from '@hono/zod-openapi'

export const json = <S extends z.ZodType>(schema: S) => ({ 'application/json': { schema } })

export const storeParams = z.object({ storeId: z.uuid() })
export const itemParams = z.object({ storeId: z.uuid(), skuId: z.uuid() })
