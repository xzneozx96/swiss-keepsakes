import { z } from '@hono/zod-openapi'
import { requestIdHeader } from '../../../platform/http/responses.ts'

export const json = <S extends z.ZodType>(schema: S) => ({ 'application/json': { schema } })

const ifMatchHeader = z.string().optional().meta({ description: 'The row version you opened, as `3`, `"3"` or `W/"3"`' })
export const withIfMatch = { headers: z.object({ 'If-Match': ifMatchHeader }) }

export const storeParams = z.object({ storeId: z.uuid() })
export const etagHeaders = { ...requestIdHeader, ETag: { description: 'The row version, as `"<rowVersion>"`', schema: { type: 'string' } } } as const
