import { describe, expect, it } from 'vitest'

import * as catalog from '../src/catalog'
import { order, product, variant } from './fixtures'

describe('[E1.2] catalog/pickup', () => {
  it('reads the Zurich calendar day across the midnight shift', () => {
    expect(catalog.zurichDate(new Date('2026-10-18T23:30:00Z'))).toBe('2026-10-19')
    expect(catalog.zurichDayOf('2026-01-10T23:30:00Z')).toBe('2026-01-11')
  })

  it('counts calendar days and skips Sundays', () => {
    const monday = new Date('2026-10-19T08:00:00Z')

    expect(catalog.earliestPickupDate(2, 'calendar-days', monday)).toBe('2026-10-21')
    expect(catalog.earliestPickupDate(2, 'calendar-days', new Date('2026-10-23T08:00:00Z'))).toBe('2026-10-26')
    expect(catalog.isPickupClosed('2026-10-25')).toBe(true)
  })

  it('skips the weekend for working-day products', () => {
    expect(catalog.earliestPickupDate(2, 'working-days', new Date('2026-10-22T08:00:00Z'))).toBe('2026-10-26')
  })
})

describe('[E1.2] catalog/stock', () => {
  it('subtracts the units held by accepted orders', () => {
    const p = product()

    expect(catalog.availableUnits(p, p.variants[0], [order()])).toBe(8)
    expect(catalog.availableUnits(p, p.variants[0], [order({ status: 'handed_over' })])).toBe(10)
  })

  it('treats a variant not for sale as sold out and prices from the cheapest on sale', () => {
    const p = product({ variants: [variant({ notForSale: true, price: 100 }), variant({ id: 'v2', price: 700 })] })

    expect(catalog.availableUnits(p, p.variants[0], [])).toBe(0)
    expect(catalog.isSoldOut(p, [])).toBe(false)
    expect(catalog.fromPrice(p)).toBe(700)
  })
})

describe('[E1.2] catalog/publish', () => {
  it('counts a missing flag as published and hides drafts and archived gifts', () => {
    expect(catalog.isPublished(product())).toBe(true)
    expect(catalog.isPublished(product({ published: false }))).toBe(false)
    expect(catalog.isPublished(product({ archivedAt: '2026-10-01T00:00:00Z' }))).toBe(false)
  })
})

describe('[E1.2] catalog/review', () => {
  it('shortens the reviewer name and keys a review by order and product', () => {
    expect(catalog.reviewerName('Anna Maria Keller')).toBe('Anna K.')
    expect(catalog.reviewerName('Anna')).toBe('Anna')
    expect(catalog.reviewId('o1', 'p1')).toBe('rv-o1-p1')
  })
})

describe('[E1.2] catalog/completeness', () => {
  const fields = [
    { id: 'name', text: { en: 'Knife', de: 'Messer' } },
    { id: 'story', text: { en: 'A story' } },
  ] as const

  it('lists the fields still empty in each language', () => {
    const missing = catalog.missingText([...fields])

    expect(missing).toEqual({ en: [], de: ['story'] })
    expect(catalog.languageStatus(missing)).toBe('de-missing')
  })

  it('is incomplete when no language has every field', () => {
    const missing = catalog.missingText([{ id: 'name', text: { en: 'a' } }, { id: 'story', text: { de: 'b' } }])

    expect(catalog.languageStatus(missing)).toBe('incomplete')
  })
})

describe('[E1.2] catalog/validation', () => {
  it('lets a draft save with nothing and flags a field empty in both languages otherwise', () => {
    const fields = [{ id: 'name' as const, text: {} }]

    expect(catalog.textErrors(fields, 'draft')).toEqual({ any: [] })
    expect(catalog.textErrors(fields, 'publish').any).toEqual(['name'])
  })
})
