import { describe, expect, it } from 'vitest'

import {
  commissionAmount,
  commissionBasis,
  offsetAmount,
  overpayment,
  partnerPosition,
  refundAdjustment,
  splitDiscount,
} from '../src/money'

describe('[E1.5][S9] commission basis and refunds', () => {
  const basis = commissionBasis({ price: 10_000, personalisation: 1000, discount: 1000, delivery: 500 })

  it('CHF 100 + 10 - 10 with delivery 5 gives basis 100, commission 10 at 10 percent', () => {
    expect(basis).toBe(10_000)
    expect(commissionAmount(basis, 0.1)).toBe(1000)
  })

  it('delivery never changes the basis', () => {
    expect(commissionBasis({ price: 10_000, personalisation: 1000, discount: 1000 })).toBe(10_000)
  })

  it('a refund of CHF 20 lowers commission by CHF 2', () => {
    expect(refundAdjustment({ basis, alreadyRefundedBasis: 0, refundedBasis: 2000, rate: 0.1 })).toBe(200)
  })

  it('a refund of delivery alone (no basis part) does not lower commission', () => {
    expect(refundAdjustment({ basis, alreadyRefundedBasis: 0, refundedBasis: 0, rate: 0.1 })).toBe(0)
  })

  it('refunds up to the whole basis bring the line to 0, never below', () => {
    const first = refundAdjustment({ basis, alreadyRefundedBasis: 0, refundedBasis: 2000, rate: 0.1 })
    const rest = refundAdjustment({ basis, alreadyRefundedBasis: 2000, refundedBasis: 9000, rate: 0.1 })

    expect(first + rest).toBe(1000)
  })

  it('many small refunds never drift from the commission on what is left', () => {
    const refundAll = (total: number, parts: number[], rate: number) => {
      let already = 0
      let adjusted = 0

      for (const part of parts) {
        adjusted += refundAdjustment({ basis: total, alreadyRefundedBasis: already, refundedBasis: part, rate })
        already += part
      }

      return commissionAmount(total, rate) - adjusted
    }

    expect(refundAll(15, [5, 5, 5], 0.1)).toBe(0)
    expect(refundAll(25, [12, 13], 0.1)).toBe(0)
    expect(refundAll(25, [12], 0.1)).toBe(commissionAmount(13, 0.1))

    for (let total = 0; total <= 60; total++) {
      for (const rate of [0.05, 0.1, 0.125, 0.15]) {
        expect(refundAll(total, Array.from({ length: total }, () => 1), rate)).toBe(0)
      }
    }
  })

  it('rounds half up to the Rappen and does not drift on 0.1', () => {
    expect(commissionAmount(5, 0.1)).toBe(1)
    expect(commissionAmount(4, 0.1)).toBe(0)
    expect(commissionAmount(19_990, 0.15)).toBe(2999)
  })
})

describe('[E1.5][S9] offsets against an overpaid partner', () => {
  it('overpaid 4, new commission 3 then 6: offsets 3 and 1, owed 5', () => {
    const paid = 400
    let earned = 0
    const offsets: number[] = []

    for (const commission of [300, 600]) {
      const offset = offsetAmount(overpayment({ paid, earned }), commission)

      offsets.push(offset)
      earned += commission
    }

    expect(offsets).toEqual([300, 100])
    expect(partnerPosition({ earned, paid })).toMatchObject({ owed: 500, toOffset: 0 })
  })

  it('shows what is still to offset after the first commission', () => {
    expect(partnerPosition({ earned: 300, paid: 400 })).toMatchObject({ owed: 0, toOffset: 100 })
  })

  it('nothing to offset when the partner was not overpaid', () => {
    expect(offsetAmount(overpayment({ paid: 100, earned: 300 }), 600)).toBe(0)
  })

  it('a refund adjustment raises the overpayment', () => {
    expect(overpayment({ paid: 1000, earned: 800 })).toBe(200)
  })
})

describe('[E1.5][Q9] discount split', () => {
  it('splits by line value; the parts sum to the discount', () => {
    expect(splitDiscount(1000, [6000, 4000])).toEqual([600, 400])
  })

  it('the last line takes the Rappen remainder when it does not divide evenly', () => {
    const parts = splitDiscount(100, [3333, 3333, 3334])

    expect(parts).toEqual([33, 33, 34])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('rounds each share and gives the difference to the last line', () => {
    const parts = splitDiscount(1000, [1000, 1000, 1000])

    expect(parts).toEqual([333, 333, 334])
  })

  it('always sums to the discount', () => {
    for (const [d, values] of [[1, [1, 1, 1]], [7, [10, 20, 30, 40]], [5, [1, 2, 3]], [5, [2, 3]]] as const) {
      expect(splitDiscount(d, [...values]).reduce((a, b) => a + b, 0)).toBe(d)
    }
  })

  it('one line takes it all; no lines and no discount give none', () => {
    expect(splitDiscount(250, [9000])).toEqual([250])
    expect(splitDiscount(0, [])).toEqual([])
    expect(splitDiscount(0, [0, 0])).toEqual([0, 0])
  })

  it('rejects a negative, fractional or oversized input', () => {
    expect(() => splitDiscount(-1, [100])).toThrow(RangeError)
    expect(() => splitDiscount(1.5, [100])).toThrow(RangeError)
    expect(() => splitDiscount(10, [100, -5])).toThrow(RangeError)
    expect(() => splitDiscount(10, [100.5])).toThrow(RangeError)
    expect(() => splitDiscount(101, [60, 40])).toThrow(RangeError)
    expect(() => splitDiscount(5, [])).toThrow(RangeError)
    expect(() => splitDiscount(Number.NaN, [100])).toThrow(RangeError)
  })
})
