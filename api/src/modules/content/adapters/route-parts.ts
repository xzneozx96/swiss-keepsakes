import { z } from '@hono/zod-openapi'

export const json = <S extends z.ZodType>(schema: S) => ({ 'application/json': { schema } })

const ifMatchHeader = z.string().optional().meta({ description: 'The row version you opened, as `3`, `"3"` or `W/"3"`' })
export const withIfMatch = { headers: z.object({ 'If-Match': ifMatchHeader }) }
