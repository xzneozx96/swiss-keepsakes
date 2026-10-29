import type { z } from 'zod'

// Postgres text and jsonb refuse U+0000, so it is a 400 here and not a 500 there. A lone UTF-16 surrogate cannot be
// written as UTF-8 either, so it is refused with it (String.prototype.isWellFormed needs lib ES2024).
const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
export function noNul<T extends z.ZodString>(schema: T): T {
  return schema
    .refine(value => !value.includes('\u0000'), 'Text may not contain a NUL character')
    .refine(value => !loneSurrogate.test(value), 'Text may not contain an unpaired surrogate') as T
}
