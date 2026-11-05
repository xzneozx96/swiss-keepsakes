import { describe, expect, it } from 'vitest'

import { isFiltered, KEEPSAKES_PAGE_SIZE, parseKeepsakesSearch } from '@/features/keepsakes/lib/list'

// ADR-033: the server filters, counts and searches; the address holds the ticks, the search and the page.
describe('[T-006][ADR-033] the keepsake table in the address', () => {
  it('reads the ticked statuses in the order of the chips, the search and the page', () => {
    expect(parseKeepsakesSearch({ status: 'editsNotLive,draft', q: 'knife', page: '3' })).toEqual({ status: ['draft', 'editsNotLive'], q: 'knife', page: 3 })
    expect(parseKeepsakesSearch({ status: ['published', 'archived'] })).toMatchObject({ status: ['published', 'archived'] })
  })

  it('drops what it does not know, so a hand-edited link still opens the page', () => {
    expect(parseKeepsakesSearch({ status: 'gone', q: '   ', page: 'x' })).toEqual({ status: undefined, q: undefined, page: undefined })
    expect(parseKeepsakesSearch({ page: '1' }).page).toBeUndefined()
    expect(parseKeepsakesSearch({ page: '1.5' }).page).toBeUndefined()
  })

  it('opens a page past the last one the API serves on that page', () => {
    expect(parseKeepsakesSearch({ page: '5000' }).page).toBe(Math.floor(10_000 / KEEPSAKES_PAGE_SIZE) + 1)
  })

  it('counts a blank search as no filter', () => {
    expect(isFiltered({})).toBe(false)
    expect(isFiltered({ q: '   ' })).toBe(false)
    expect(isFiltered({ q: 'a' })).toBe(true)
    expect(isFiltered({ status: ['draft'] })).toBe(true)
  })
})
