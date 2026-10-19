import type { Rappen } from '../catalog/types'

export interface LineAmounts {
  price: Rappen
  personalisation: Rappen
  discount: Rappen
  /** Never part of the basis; accepted so a caller can pass the whole line. */
  delivery?: Rappen
}

/** Commission basis of a line (PRD L362): price plus personalisation minus discount. Delivery is excluded. */
export function commissionBasis(line: LineAmounts): Rappen {
  return Math.max(0, line.price + line.personalisation - line.discount)
}

/** Commission on a basis at a rate such as 0.1, rounded half up to the Rappen. Done in basis points so 0.1 does not drift. */
export function commissionAmount(basis: Rappen, rate: number): Rappen {
  const points = Math.round(rate * 10_000)

  return Math.floor((basis * points + 5000) / 10_000)
}

/**
 * Negative commission adjustment for a refund (UX S9), as a positive amount to subtract. Only
 * the part that counts toward the basis counts, and never more than the basis still left after
 * earlier refunds, so a line's commission cannot go below 0. The rate is the one stored on the line.
 * It is the drop in commission from the basis left before this refund to the basis left after it, so rounding
 * never adds up across many small refunds and a full refund always ends at exactly 0.
 */
export function refundAdjustment(input: {
  basis: Rappen
  alreadyRefundedBasis: Rappen
  refundedBasis: Rappen
  rate: number
}): Rappen {
  const left = Math.max(0, input.basis - input.alreadyRefundedBasis)
  const counted = Math.min(Math.max(0, input.refundedBasis), left)

  return commissionAmount(left, input.rate) - commissionAmount(left - counted, input.rate)
}

/**
 * Splits an order-level discount across lines in proportion to line value (Q9). Each line but
 * the last gets its share rounded to the Rappen, and the last line takes what is left, so the
 * parts always sum to the discount. A share never takes more than is left. Throws RangeError for a negative or
 * fractional amount, or a discount larger than the lines together.
 */
export function splitDiscount(discount: Rappen, lineValues: Rappen[]): Rappen[] {
  if (![discount, ...lineValues].every(v => Number.isInteger(v) && v >= 0))
    throw new RangeError('splitDiscount takes whole, non-negative Rappen amounts')

  const total = lineValues.reduce((sum, v) => sum + v, 0)

  if (discount > total)
    throw new RangeError(`The discount ${discount} is larger than the lines ${total}`)
  if (lineValues.length === 0)
    return []

  const parts: Rappen[] = []
  let left = discount

  for (const value of lineValues.slice(0, -1)) {
    const share = total === 0
      ? 0
      : Math.floor((2 * discount * value + total) / (2 * total))
    const part = Math.min(share, left)

    parts.push(part)
    left -= part
  }
  parts.push(left)

  return parts
}

/** What a partner was paid beyond what they earned: money paid minus recorded commission after adjustments. */
export function overpayment(input: { paid: Rappen, earned: Rappen }): Rappen {
  return Math.max(0, input.paid - input.earned)
}

/** The part of a newly recorded commission an existing overpayment covers (PRD L372). Offsets are not payments. */
export function offsetAmount(overpaid: Rappen, newCommission: Rappen): Rappen {
  return Math.min(Math.max(0, overpaid), Math.max(0, newCommission))
}

export interface PartnerPosition {
  /** Recorded commission minus adjustments. */
  earned: Rappen
  /** Money actually paid out; offsets never add to it. */
  paid: Rappen
  /** Still to pay. */
  owed: Rappen
  /** Overpaid and still to offset. */
  toOffset: Rappen
}

export function partnerPosition(input: { earned: Rappen, paid: Rappen }): PartnerPosition {
  return {
    ...input,
    owed: Math.max(0, input.earned - input.paid),
    toOffset: overpayment(input),
  }
}
