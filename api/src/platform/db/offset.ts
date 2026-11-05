import { MAX_OFFSET } from '@sk/api-contract'

// The offset half of ADR-033 (numbered pages of the per-store merchant tables).

/**
 * The rows to skip for `page` (from 1). The route's schema already answers 400 for a larger skip, so a RangeError here
 * is a programming error, never a user's.
 */
export function offsetOf(page: number, pageSize: number): number {
  const offset = (page - 1) * pageSize
  if (!Number.isInteger(page) || !Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET)
    throw new RangeError(`Page ${page} of ${pageSize} skips more than ${MAX_OFFSET} rows`)
  return offset
}
