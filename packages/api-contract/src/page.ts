import { z } from 'zod'

// The cursor mode of ADR-033: `limit` and `cursor` in, `{ items, nextCursor }` out. The numbered mode (`page`,
// `pageSize`, `total`) is added with the merchant tables.

/** The most rows one cursor page may hold. A larger `limit` is a 400, never silently lowered. */
export const MAX_PAGE_LIMIT = 20

const limitSchema = z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).meta({ description: `How many items to return, 1 to ${MAX_PAGE_LIMIT}` })
const cursorSchema = z.string().max(512).regex(/^[\w-]+$/, 'Not a cursor').meta({ description: 'The `nextCursor` of the previous page. Opaque: pass it back unchanged and never build one. Absent on the first page' })

/**
 * The query of a cursor list. A route gives its own default `limit`. A route that is moving to paging (ADR-033 section 12)
 * leaves `defaultLimit` out, so `limit` stays optional and a request without it still gets the whole list.
 */
export function pageQuery(options: { defaultLimit: number }): z.ZodObject<{ limit: z.ZodDefault<typeof limitSchema>, cursor: z.ZodOptional<typeof cursorSchema> }>
export function pageQuery(options?: { defaultLimit?: undefined }): z.ZodObject<{ limit: z.ZodOptional<typeof limitSchema>, cursor: z.ZodOptional<typeof cursorSchema> }>
export function pageQuery(options: { defaultLimit?: number } = {}) {
  return z.object({
    limit: options.defaultLimit === undefined ? limitSchema.optional() : limitSchema.default(options.defaultLimit),
    cursor: cursorSchema.optional(),
  })
}

/** The answer of a cursor list. `extra` adds fields such as `total`. Each list gives its own `.meta({ id })` through `id`. */
export function pageOf<S extends z.ZodType, E extends z.ZodRawShape = Record<never, never>>(itemSchema: S, id: string, extra: E = {} as E) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable().meta({ description: 'Pass it as `cursor` for the next page. Null on the last page, and only there' }),
    ...extra,
  }).meta({ id })
}
