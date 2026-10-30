import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SearchableSelect } from '@/components/searchable-select'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'

const options = [
  { id: 'bridge', label: 'The bridge' },
  { id: 'lion', label: 'The Lion Monument' },
  { id: 'wall', label: 'Musegg wall' },
]

function Harness({ start = null, onValue, noneLabel, ...rest }: { start?: string | null, onValue?: (value: string | null) => void, noneLabel?: string, hideLabel?: boolean, description?: string, error?: string, items?: typeof options }) {
  const [value, setValue] = useState<string | null>(start)

  return (
    <LocaleProvider>
      <SearchableSelect
        description={rest.description}
        error={rest.error}
        hideLabel={rest.hideLabel}
        label="Story"
        noneLabel={noneLabel}
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

const field = () => screen.getByRole('button', { name: /Story/ })
const shown = () => field().closest('.autocomplete')!.querySelector('.autocomplete__value')
const open = () => userEvent.click(field())

describe('searchableSelect', () => {
  it('looks like the other form fields: the primary variant, with the plain search field in the list', async () => {
    render(<Harness />)

    expect(field().closest('.autocomplete')).toHaveClass('autocomplete--primary')
    await open()
    expect(screen.getByRole('searchbox', { name: 'Search Story' }).closest('.search-field')).toHaveClass('search-field--primary')
  })

  it('shows the label, the placeholder and the help line, with the list closed, and can keep the label for screen readers', () => {
    const { unmount } = render(<Harness description="Pick one." />)

    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('Choose…')).toBeInTheDocument()
    expect(screen.getByText('Pick one.')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    unmount()
    render(<Harness hideLabel />)
    expect(screen.getByText('Story')).toHaveClass('sr-only')
  })

  it('shows the error instead of the help line', () => {
    render(<Harness description="Pick one." error="Choose a story." />)

    expect(screen.getByText('Choose a story.')).toBeInTheDocument()
    expect(screen.queryByText('Pick one.')).not.toBeInTheDocument()
  })

  it('picks one item, closes the list and shows the choice in the field', async () => {
    const onValue = vi.fn()

    render(<Harness onValue={onValue} />)
    await open()
    await userEvent.click(screen.getByRole('option', { name: 'Musegg wall' }))

    expect(onValue).toHaveBeenLastCalledWith('wall')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(shown()).toHaveTextContent('Musegg wall')
  })

  it('ticks the chosen item when the list is open again', async () => {
    render(<Harness start="lion" />)
    await open()

    expect(screen.getByRole('option', { name: 'The Lion Monument' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'The bridge' })).toHaveAttribute('aria-selected', 'false')
  })

  it('filters the list as you type, ignoring case, and says so when nothing matches', async () => {
    render(<Harness />)
    await open()
    await userEvent.type(screen.getByRole('searchbox'), 'LION')

    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['The Lion Monument'])
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.queryByRole('option', { name: 'The Lion Monument' })).not.toBeInTheDocument()
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('picks with the keyboard: arrow down opens the list, the arrows move, Enter picks', async () => {
    const onValue = vi.fn()

    render(<Harness onValue={onValue} />)
    field().focus()
    await userEvent.keyboard('{ArrowDown}')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onValue).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('adds a first row that clears the choice when it has a none label, and shows it while nothing is chosen', async () => {
    const onValue = vi.fn()

    render(<Harness noneLabel="None" start="bridge" onValue={onValue} />)
    expect(shown()).toHaveTextContent('The bridge')
    await open()
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['None', 'The bridge', 'The Lion Monument', 'Musegg wall'])
    await userEvent.click(screen.getByRole('option', { name: 'None' }))

    expect(onValue).toHaveBeenLastCalledWith(null)
    expect(shown()).toHaveTextContent('None')
  })

  it('has no none row without a none label', async () => {
    render(<Harness />)
    await open()

    expect(screen.queryByRole('option', { name: 'None' })).not.toBeInTheDocument()
  })

  it('reads in German', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
    render(<Harness />)

    expect(screen.getByText('Auswählen …')).toBeInTheDocument()
    await open()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Story durchsuchen' }), 'zzz')
    expect(screen.getByText('Keine Treffer')).toBeInTheDocument()
    localStorage.clear()
  })
})
