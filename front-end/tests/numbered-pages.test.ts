import { describe, expect, it, vi } from 'vitest'

import { MAX_PAGES, readAllNumberedPages } from '@/features/data-client'
import { parsePlacesSearch } from '@/features/places/lib/search-params'
import { parseStoriesSearch } from '@/features/stories/lib/list-search'

describe('[ADR-033] readAllNumberedPages', () => {
  const rows = Array.from({ length: 45 }, (_, index) => index)
  const read = vi.fn(async (page: number) => ({ items: rows.slice((page - 1) * 20, page * 20), total: rows.length }))

  it('reads page after page until it holds the total, and no page more', async () => {
    read.mockClear()

    expect(await readAllNumberedPages(read, 'things')).toEqual(rows)
    expect(read.mock.calls.map(([page]) => page)).toEqual([1, 2, 3])
  })

  it('stops on an empty page, even when the total says there is more', async () => {
    const short = vi.fn(async (page: number) => ({ items: page === 1 ? [1, 2] : [], total: 99 }))

    expect(await readAllNumberedPages(short, 'things')).toEqual([1, 2])
    expect(short).toHaveBeenCalledTimes(2)
  })

  it('stops after MAX_PAGES and logs an error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const endless = vi.fn(async () => ({ items: [1], total: 1_000_000 }))

    expect(await readAllNumberedPages(endless, 'things')).toHaveLength(MAX_PAGES)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('things'))
    error.mockRestore()
  })
})

describe('[ADR-033] the table search params', () => {
  it('stories: the tab, the search and the page; anything else is dropped', () => {
    expect(parseStoriesSearch({ status: 'drafts', q: 'wall', page: '3', tab: 'x', junk: 1 })).toEqual({ status: 'drafts', q: 'wall', page: 3 })
    expect(parseStoriesSearch({ status: 'all', q: '  ', page: '1' })).toEqual({ status: undefined, q: undefined, page: undefined })
    expect(parseStoriesSearch({ page: '-2' }).page).toBeUndefined()
  })

  it('a page past the 10,000-row skip limit opens at the last page the API serves', () => {
    expect(parseStoriesSearch({ page: '2000' }).page).toBe(1001)
    expect(parsePlacesSearch({ page: '2000' }).page).toBe(1001)
  })

  it('pins: each group is a list of known options, from a comma string or an array', () => {
    expect(parsePlacesSearch({ status: 'draft,ended,nope', stay: ['both'], type: 'event', category: 'none,0190f0c2-0000-7000-8000-0000000000a1', q: 'x', page: '2' })).toEqual({
      status: ['draft', 'ended'],
      category: ['none', '0190f0c2-0000-7000-8000-0000000000a1'],
      stay: ['both'],
      type: ['event'],
      q: 'x',
      page: 2,
    })
    expect(parsePlacesSearch({ status: 'nope', category: '', page: 'x' })).toEqual({ status: undefined, category: undefined, stay: undefined, type: undefined, q: undefined, page: undefined })
  })
})
