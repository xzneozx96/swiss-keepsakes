import type { FilterGroup } from '@/components/filter-bar'
import type { Language } from '@/contexts/locale-context'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FilterButtons, FilterChips, filterGroup, FilterToolbar } from '@/components/filter-bar'
import { loadDictionary, LocaleOverride } from '@/contexts/locale-context'

const viewport = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => viewport.wide }))

beforeAll(async () => {
  await loadDictionary('en')
  await loadDictionary('de')
})

beforeEach(() => {
  viewport.wide = true
})

const STATUS = [
  { id: 'draft', label: 'Draft', count: 3 },
  { id: 'published', label: 'Published', count: 5 },
  { id: 'hidden', label: 'Hidden', count: 1 },
]

interface Setup {
  statusSelected?: string[]
  categories?: FilterGroup['options']
  categorySelected?: string[]
  language?: Language
  toolbar?: boolean
}

/** A stateful host, as a screen holds its filters. Returns the latest selections. */
function setup({ statusSelected = [], categories = [], categorySelected = [], language = 'en', toolbar = false }: Setup = {}) {
  const latest = { status: statusSelected, category: categorySelected }
  const onStatus = vi.fn()
  const onCategory = vi.fn()

  function Host() {
    const [status, setStatus] = useState(statusSelected)
    const [category, setCategory] = useState(categorySelected)
    const groups = [
      filterGroup({ id: 'status', label: 'Status', options: STATUS, selected: status as never[], onChange: (next) => { setStatus(next); latest.status = next; onStatus(next) } }),
      filterGroup({ id: 'category', label: 'Categories', options: categories, selected: category, onChange: (next) => { setCategory(next); latest.category = next; onCategory(next) } }),
    ]

    return toolbar
      ? <FilterToolbar groups={groups} />
      : (
          <>
            <FilterButtons groups={groups} />
            <FilterChips groups={groups} />
          </>
        )
  }

  render(
    <LocaleOverride language={language}>
      <Host />
    </LocaleOverride>,
  )

  return { latest, onStatus, onCategory }
}

const many = Array.from({ length: 12 }, (_, index) => ({ id: `c${index}`, label: `Place ${index}`, count: index + 1 }))
const optionNames = () => screen.getAllByRole('checkbox').map(box => box.closest('label')?.textContent ?? '')

describe('filterBar: one button per group', () => {
  it('shows a button named like each group and no menu of every group', async () => {
    setup({ categories: many })

    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('opens only that group in a popover and ticks live', async () => {
    const { onStatus } = setup({ categories: many })

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    const dialog = await screen.findByRole('dialog', { name: 'Status' })

    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(3)
    expect(within(dialog).queryByText('Place 1')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Published/ }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Draft/ }))

    // The ids come back in the options' order, not in the order they were ticked.
    expect(onStatus).toHaveBeenLastCalledWith(['draft', 'published'])
  })

  it('puts the number of ticked options on the button and in its name', () => {
    setup({ statusSelected: ['draft', 'hidden'] })

    expect(screen.getByRole('button', { name: 'Status, 2 selected' })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: 'Categories' })).not.toHaveTextContent(/\d/)
  })

  it('shows the filter toolbar as the buttons with the chips under them', () => {
    setup({ statusSelected: ['draft'], toolbar: true })

    expect(screen.getByRole('button', { name: 'Status, 1 selected' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove filter Status: Draft' })).toBeInTheDocument()
  })
})

describe('filterBar: applied chips', () => {
  it('draws nothing while nothing is ticked', () => {
    setup()

    expect(screen.queryByRole('group', { name: 'Applied filters' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it('shows one chip per group, labelled like the column, with its own remove name', () => {
    setup({ statusSelected: ['draft', 'hidden'], categories: many, categorySelected: ['c2'] })

    const chips = within(screen.getByRole('group', { name: 'Applied filters' }))

    expect(chips.getByRole('button', { name: 'Remove filter Status: Draft, Hidden' })).toHaveTextContent('Status: Draft, Hidden')
    expect(chips.getByRole('button', { name: 'Remove filter Categories: Place 2' })).toBeInTheDocument()
  })

  it('removes only its own group when pressed', async () => {
    const { latest } = setup({ statusSelected: ['draft', 'hidden'], categories: many, categorySelected: ['c2'] })

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Status: Draft, Hidden' }))

    expect(latest.status).toEqual([])
    expect(latest.category).toEqual(['c2'])
    expect(screen.queryByRole('button', { name: /Remove filter Status/ })).not.toBeInTheDocument()
  })

  it('can be reached and removed with the keyboard', async () => {
    const { latest } = setup({ statusSelected: ['published'] })

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Remove filter Status: Published' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(latest.status).toEqual([])
  })

  it('clears every group with Clear all, which then disappears', async () => {
    const { latest } = setup({ statusSelected: ['draft'], categories: many, categorySelected: ['c1', 'c2'] })

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(latest).toEqual({ status: [], category: [] })
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it('says all of it in German', async () => {
    setup({ statusSelected: ['draft'], categories: many, language: 'de' })

    expect(screen.getByRole('button', { name: 'Filter Status: Draft entfernen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alle löschen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    expect(await screen.findByRole('searchbox', { name: 'Optionen suchen' })).toBeInTheDocument()
  })
})

describe('filterBar: the options of a group', () => {
  it('searches a long list and says when nothing matches', async () => {
    setup({ categories: many })

    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    const search = await screen.findByRole('searchbox', { name: 'Search options' })

    expect(optionNames()).toHaveLength(12)
    await userEvent.type(search, 'place 1')
    expect(optionNames()).toHaveLength(3)
    expect(screen.getByText('Place 10')).toBeInTheDocument()
    expect(screen.queryByText('Place 2')).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('No option matches')).toBeInTheDocument()
  })

  it('keeps ticks that the search hides', async () => {
    const { onCategory } = setup({ categories: many, categorySelected: ['c0'] })

    await userEvent.click(screen.getByRole('button', { name: 'Categories, 1 selected' }))
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search options' }), 'place 5')
    await userEvent.click(screen.getByRole('checkbox', { name: /Place 5/ }))

    expect(onCategory).toHaveBeenLastCalledWith(['c0', 'c5'])
  })

  it('has no search for a short list', async () => {
    setup({ categories: many })

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    await screen.findByRole('dialog', { name: 'Status' })

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('puts options with a count of 0 last and muted, and still lets them be ticked', async () => {
    const { onCategory } = setup({
      categories: [
        { id: 'a', label: 'Alpha', count: 0 },
        { id: 'b', label: 'Bravo', count: 4 },
        { id: 'c', label: 'Charlie', count: 0 },
        { id: 'd', label: 'Delta' },
      ],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    await screen.findByRole('dialog', { name: 'Categories' })

    expect(optionNames()).toEqual(['Bravo4', 'Delta', 'Alpha0', 'Charlie0'])
    expect(screen.getByText('Alpha')).toHaveClass('text-muted')
    expect(screen.getByText('Bravo')).not.toHaveClass('text-muted')
    await userEvent.click(screen.getByRole('checkbox', { name: /Alpha/ }))
    expect(onCategory).toHaveBeenLastCalledWith(['a'])
  })

  it('indents the children under their parent, one level, with the empty ones last', async () => {
    setup({
      categories: [
        { id: 'food', label: 'Food', count: 2 },
        { id: 'view', label: 'Views', count: 0 },
        { id: 'cheese', label: 'Cheese', count: 0, parentId: 'food' },
        { id: 'soup', label: 'Soup', count: 2, parentId: 'food' },
        { id: 'peak', label: 'Peaks', count: 6, parentId: 'view' },
        { id: 'lake', label: 'Lakes', count: 7 },
      ],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    await screen.findByRole('dialog', { name: 'Categories' })

    // Views has no results itself but its child has, so it keeps its place before Lakes.
    expect(optionNames()).toEqual(['Food2', 'Soup2', 'Cheese0', 'Views0', 'Peaks6', 'Lakes7'])
    expect(screen.getByRole('checkbox', { name: /Soup/ }).closest('.checkbox')).toHaveClass('ms-6')
    expect(screen.getByRole('checkbox', { name: /Food/ }).closest('.checkbox')).not.toHaveClass('ms-6')
  })

  it('keeps the parent in view when the search matches only its child', async () => {
    setup({
      categories: [
        ...many.slice(0, 8),
        { id: 'food', label: 'Food', count: 2 },
        { id: 'soup', label: 'Soup', count: 2, parentId: 'food' },
        { id: 'cheese', label: 'Cheese', count: 1, parentId: 'food' },
      ],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search options' }), 'soup')

    expect(optionNames()).toEqual(['Food2', 'Soup2'])
  })
})

describe('filterBar: phones', () => {
  beforeEach(() => {
    viewport.wide = false
  })

  it('opens the group in a bottom sheet titled with its name, ticked live', async () => {
    const { onStatus } = setup({ categories: many })

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    const sheet = await screen.findByRole('dialog', { name: 'Status' })

    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(3)
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /Hidden/ }))
    expect(onStatus).toHaveBeenLastCalledWith(['hidden'])
    expect(within(sheet).getByRole('button', { name: 'Clear filters' })).toBeEnabled()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Clear filters' }))
    expect(onStatus).toHaveBeenLastCalledWith([])
    expect(within(sheet).getByRole('button', { name: 'Clear filters' })).toBeDisabled()
  })

  it('searches a long list inside the sheet and closes with Show results', async () => {
    setup({ categories: many })

    await userEvent.click(screen.getByRole('button', { name: 'Categories' }))
    const sheet = await screen.findByRole('dialog', { name: 'Categories' })

    await userEvent.type(within(sheet).getByRole('searchbox', { name: 'Search options' }), 'place 11')
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(1)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Show results' }))
    expect(screen.queryByRole('dialog', { name: 'Categories' })).not.toBeInTheDocument()
  })
})
