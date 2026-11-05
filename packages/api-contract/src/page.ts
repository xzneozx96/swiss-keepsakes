import { z } from 'zod'

// The cursor mode of ADR-033: `limit` and `cursor` in, `{ items, nextCursor }` out. The numbered mode (`page`,
// `pageSize`, `total`) is below.

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

// The numbered mode of ADR-033 section 6, for the per-store merchant tables: `page` and `pageSize` in, `{ items, total, page, pageSize }` out.

/** The most rows a numbered page may skip: `(page - 1) * pageSize`. A larger skip is a 400 on `page`. */
export const MAX_OFFSET = 10_000

const pageNumberSchema = z.coerce.number().int().min(1).default(1).meta({ description: 'The page, from 1. A page past the end answers no items and the real total' })
const pageSizeSchema = z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(10).meta({ description: `Rows a page, 1 to ${MAX_PAGE_LIMIT}` })

/**
 * The query of a numbered list: `page`, `pageSize` and the table's own filters (`filters`, a zod shape). The skip limit is
 * checked here, so every route answers the same `validation-failed` on `page`.
 */
export function numberedPageQuery<F extends z.ZodRawShape = Record<never, never>>(filters: F = {} as F) {
  return z.object({ ...filters, page: pageNumberSchema, pageSize: pageSizeSchema }).refine(
    (query) => {
      const { page, pageSize } = query as { page: number, pageSize: number }
      return (page - 1) * pageSize <= MAX_OFFSET
    },
    { message: `A page may not skip more than ${MAX_OFFSET} rows`, path: ['page'] },
  )
}

/** The answer of a numbered list. `extra` adds the facet counts the tabs show. Each list gives its own `.meta({ id })` through `id`. */
export function numberedPageOf<S extends z.ZodType, E extends z.ZodRawShape = Record<never, never>>(itemSchema: S, id: string, extra: E = {} as E) {
  return z.object({
    items: z.array(itemSchema),
    total: z.int().min(0).meta({ description: 'The rows that match the filters, before paging' }),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    ...extra,
  }).meta({ id })
}
