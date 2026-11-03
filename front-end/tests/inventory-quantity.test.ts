import { describe, expect, it } from 'vitest'

import { parseQuantity, STOCK_MAX } from '@/features/inventory/lib/quantity'

describe('[E6.3][AC05][AC53] AC-2 the stock figure a merchant types', () => {
  it('[E6.3][AC05][AC53] AC-2 takes a whole number from 0 to 9999', () => {
    expect(parseQuantity('0')).toEqual({ ok: true, value: 0 })
    expect(parseQuantity('7')).toEqual({ ok: true, value: 7 })
    expect(parseQuantity(' 12 ')).toEqual({ ok: true, value: 12 })
    expect(parseQuantity('007')).toEqual({ ok: true, value: 7 })
    expect(parseQuantity(String(STOCK_MAX))).toEqual({ ok: true, value: 9999 })
  })

  it('[E6.3][AC05][AC53] AC-2 refuses what is not a whole number, 0 or more', () => {
    for (const text of ['', '   ', 'abc', '-3', '1.5', '1,5', '1e3', '+4', '5 6', '٣'])
      expect(parseQuantity(text), text).toEqual({ ok: false, reason: 'whole' })
  })

  it('[E6.3][AC05][AC53] AC-2 refuses more than 9999, however long the number is', () => {
    expect(parseQuantity('10000')).toEqual({ ok: false, reason: 'most' })
    expect(parseQuantity('9'.repeat(400))).toEqual({ ok: false, reason: 'most' })
  })
})
