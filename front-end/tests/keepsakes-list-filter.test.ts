import { describe, expect, it } from 'vitest'

import { filterKeepsakes, isFiltered, noFilters, statusFilterOf } from '@/features/keepsakes/lib/list'

const item = (name: { en?: string, de?: string }, status: 'draft' | 'published' = 'draft', hasUnpublishedEdits = false) => ({ name, status, hasUnpublishedEdits })
const names = (items: ReturnType<typeof item>[]) => items.map(i => i.name.en ?? i.name.de)

const items = [
  item({ en: 'Victorinox Classic' }),
  item({ en: 'SwissCard Lite' }, 'published'),
  item({ de: 'Taschenmesser' }, 'published', true),
]

describe('[T-006][list] filtering the keepsakes', () => {
  it('[T-006] names the three states of the status chip', () => {
    expect(items.map(statusFilterOf)).toEqual(['draft', 'published', 'editsNotLive'])
  })

  it('[T-006] shows everything without a filter and without a search', () => {
    expect(filterKeepsakes(items, noFilters)).toHaveLength(3)
    expect(isFiltered(noFilters)).toBe(false)
  })

  it('[T-006] searches the English and the German name, ignoring case and outer spaces', () => {
    expect(names(filterKeepsakes(items, { ...noFilters, query: ' SWISS ' }))).toEqual(['SwissCard Lite'])
    expect(names(filterKeepsakes(items, { ...noFilters, query: 'taschen' }))).toEqual(['Taschenmesser'])
    expect(filterKeepsakes(items, { ...noFilters, query: 'nothing' })).toEqual([])
  })

  it('[T-006] a status filter is an OR among its options and narrows together with the search', () => {
    expect(names(filterKeepsakes(items, { ...noFilters, status: ['draft'] }))).toEqual(['Victorinox Classic'])
    expect(filterKeepsakes(items, { ...noFilters, status: ['published', 'editsNotLive'] })).toHaveLength(2)
    expect(names(filterKeepsakes(items, { query: 'lite', status: ['published', 'editsNotLive'] }))).toEqual(['SwissCard Lite'])
  })

  it('[T-006] counts a blank search as no filter', () => {
    expect(isFiltered({ ...noFilters, query: '   ' })).toBe(false)
    expect(isFiltered({ ...noFilters, query: 'a' })).toBe(true)
    expect(isFiltered({ ...noFilters, status: ['draft'] })).toBe(true)
  })
})
