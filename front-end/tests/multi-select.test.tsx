import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelect } from '@/components/multi-select'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'

const options = [
  { id: 'walks', label: 'Walks' },
  { id: 'old-town', label: 'Old town', parentId: 'walks' },
  { id: 'lake-path', label: 'Lake path', parentId: 'walks' },
  { id: 'food', label: 'Food' },
]

function Harness({ start = [], onValue, ...rest }: { hideLabel?: boolean, start?: string[], onValue?: (value: string[]) => void, description?: string, error?: string, items?: typeof options }) {
  const [value, setValue] = useState(start)

  return (
    <LocaleProvider>
      <MultiSelect
        description={rest.description}
        error={rest.error}
        hideLabel={rest.hideLabel}
        label="Categories"
        options={rest.items ?? options}
        value={value}
        onChange={(next) => {
          setValue(next)
          onValue?.(next)
        }}
      />
    </LocaleProvider>
  )
}

function field() {
  return screen.getByRole('button', { name: /Categories/ })
}

function open() {
  return userEvent.click(field())
}
function chips() {
  const grid = screen.queryByRole('grid', { name: 'Categories', hidden: true })

  return grid ? within(grid).queryAllByRole('row', { hidden: true }).map(row => row.textContent) : []
}

describe('multiSelect', () => {
  it('looks like the other form fields: the primary variant (white field, field border, no resting shadow), not the grey secondary one', () => {
    render(<Harness />)
    const root = field().closest('.autocomplete')!

    expect(root).toHaveClass('autocomplete--primary')
    expect(root).not.toHaveClass('autocomplete--secondary')
    expect(root.querySelector('.autocomplete__trigger')).not.toBeNull()
  })

  it('gives the search field in the list the plain form field look, not the grey secondary variant', async () => {
    render(<Harness />)
    await open()

    const search = screen.getByRole('searchbox', { name: 'Search Categories' }).closest('.search-field')!

    expect(search).toHaveClass('search-field--primary')
    expect(search).not.toHaveClass('search-field--secondary')
  })

  it('can keep the label for screen readers only, when a title beside the field already says it', () => {
    render(<Harness hideLabel />)

    expect(screen.getByText('Categories')).toHaveClass('sr-only')
    expect(field()).toBeInTheDocument()
  })

  it('shows the label, the placeholder and the help line, with the list closed', () => {
    render(<Harness description="Pick any number." />)

    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Choose…')).toBeInTheDocument()
    expect(screen.getByText('Pick any number.')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens a list with a search field on a tap, and ticks an item that is chosen', async () => {
    const onValue = vi.fn()

    render(<Harness onValue={onValue} />)
    await open()

    expect(screen.getByRole('searchbox', { name: 'Search Categories' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Food' }))

    expect(onValue).toHaveBeenLastCalledWith(['food'])
    expect(chips()).toEqual(['Food'])
    expect(screen.getByRole('option', { name: 'Food' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Walks' })).toHaveAttribute('aria-selected', 'false')
  })

  it('keeps the list open for the next choice and keeps the order they were chosen in', async () => {
    const onValue = vi.fn()

    render(<Harness onValue={onValue} />)
    await open()
    await userEvent.click(screen.getByRole('option', { name: 'Food' }))
    await userEvent.click(screen.getByRole('option', { name: 'Walks' }))

    expect(onValue).toHaveBeenLastCalledWith(['food', 'walks'])
    expect(chips()).toEqual(['Food', 'Walks'])
  })

  it('unticks an item from the list', async () => {
    render(<Harness start={['food']} />)
    await open()
    await userEvent.click(screen.getByRole('option', { name: 'Food' }))

    expect(chips()).toEqual([])
    expect(screen.getByText('Choose…')).toBeInTheDocument()
  })

  it('removes a chip with its own button, and the list does not open', async () => {
    const onValue = vi.fn()

    render(<Harness start={['food', 'walks']} onValue={onValue} />)
    expect(chips()).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: /Remove.*Food|Food.*Remove/ }))

    expect(onValue).toHaveBeenLastCalledWith(['walks'])
    expect(chips()).toHaveLength(1)
    expect(chips()[0]).toContain('Walks')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('filters the list as you type, ignoring case, and says so when nothing matches', async () => {
    render(<Harness />)
    await open()
    await userEvent.type(screen.getByRole('searchbox'), 'FOO')

    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Food'])
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    // React Aria wraps the empty state in an option role; it is the only one and has no item in it.
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['No results'])
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('lists a sub-option under its parent, indented, and tells a screen reader which parent', async () => {
    render(<Harness items={[options[3]!, options[1]!, options[0]!, options[2]!]} />)
    await open()

    const list = screen.getAllByRole('option')
    expect(list.map(option => option.textContent)).toEqual(['Food', 'Walks', 'Old town, Under Walks', 'Lake path, Under Walks'])
    expect(list[2]).toHaveClass('ps-8')
    expect(list[1]).not.toHaveClass('ps-8')
    expect(screen.getByRole('option', { name: /Old town/ })).toBeInTheDocument()
    await userEvent.click(list[2]!)
    expect(chips()[0]).toContain('Old town')
  })

  it('works with the keyboard: Enter opens, the arrows move, Enter ticks, Escape closes', async () => {
    const onValue = vi.fn()

    render(<Harness onValue={onValue} />)
    field().focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onValue).toHaveBeenLastCalledWith([expect.any(String)])
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(chips()).toHaveLength(1)
  })

  it('shows an error in words under the field, instead of the help line', () => {
    render(<Harness description="Pick any number." error="Choose at least one." />)

    expect(screen.getByText('Choose at least one.')).toBeInTheDocument()
    expect(screen.queryByText('Pick any number.')).not.toBeInTheDocument()
  })

  it('ignores a chosen id that is not in the list (a category deleted meanwhile)', () => {
    render(<Harness start={['gone', 'food']} />)

    expect(chips()).toHaveLength(1)
    expect(chips()[0]).toContain('Food')
  })

  it('reads in German', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
    render(<Harness />)

    expect(screen.getByText('Auswählen …')).toBeInTheDocument()
    await open()
    expect(screen.getByRole('searchbox', { name: 'Categories durchsuchen' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('Keine Treffer')).toBeInTheDocument()
    localStorage.clear()
  })
})
