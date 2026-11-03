/** The most units a variant can hold. The same figure as `STOCK_MAX` in `@sk/api-contract`, which is not imported here because it carries Zod and loads on the first API call only. */
export const STOCK_MAX = 9999

export type QuantityResult = { ok: true, value: number } | { ok: false, reason: 'whole' | 'most' }

const DIGITS = /^\d+$/

/** What the merchant typed in the In stock box: digits only, so a sign, a decimal, an exponent and letters are all "whole". An empty box is "whole" too. */
export function parseQuantity(text: string): QuantityResult {
  const trimmed = text.trim()

  if (!DIGITS.test(trimmed))
    return { ok: false, reason: 'whole' }

  const value = Number(trimmed)

  return value > STOCK_MAX ? { ok: false, reason: 'most' } : { ok: true, value }
}
