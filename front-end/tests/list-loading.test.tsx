import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataTable } from '@/components/data-table'
import { SKELETON_ROWS } from '@/components/data-table-skeleton'
import { LocaleProvider } from '@/contexts/locale-context'
import { LOADING_DELAY_MS, useListLoading } from '@/hooks/use-list-loading'

interface Row { id: string, name: string }
const columns = [{ id: 'name', header: 'Name', isRowHeader: true, render: (row: Row) => row.name }]

function Table({ query }: { query: { isPending: boolean, isPlaceholderData: boolean }, rows: Row[] }) {
  const isLoading = useListLoading(query)

  return <DataTable columns={columns} getRowId={row => row.id} isLoading={isLoading} label="Things" rows={isLoading ? [] : (Table.rows)} />
}
Table.rows = [] as Row[]

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useListLoading', () => {
  it('is true while there is no data yet', () => {
    const { result } = renderHook(() => useListLoading({ isPending: true, isPlaceholderData: false }))

    expect(result.current).toBe(true)
  })

  it('keeps the old rows for a fast answer, shows the skeleton when placeholder data stays too long, then lets go', () => {
    const { result, rerender } = renderHook(props => useListLoading(props), { initialProps: { isPending: false, isPlaceholderData: false } })

    expect(result.current).toBe(false)
    rerender({ isPending: false, isPlaceholderData: true })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(LOADING_DELAY_MS + 1))
    expect(result.current).toBe(true)
    rerender({ isPending: false, isPlaceholderData: false })
    expect(result.current).toBe(false)
  })

  it('never shows the skeleton when the answer arrives inside the delay', () => {
    const { result, rerender } = renderHook(props => useListLoading(props), { initialProps: { isPending: false, isPlaceholderData: true } })

    act(() => vi.advanceTimersByTime(LOADING_DELAY_MS - 20))
    rerender({ isPending: false, isPlaceholderData: false })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe(false)
  })
})

describe('a filter change with placeholder data in a DataTable', () => {
  it('shows skeleton rows (aria-busy) once the answer is late, then the new rows', () => {
    Table.rows = [{ id: 'a', name: 'Alpine' }]
    const view = (query: { isPending: boolean, isPlaceholderData: boolean }) => (
      <LocaleProvider>
        <Table query={query} rows={Table.rows} />
      </LocaleProvider>
    )
    const { rerender } = render(view({ isPending: false, isPlaceholderData: false }))

    expect(screen.getByText('Alpine')).toBeInTheDocument()
    rerender(view({ isPending: false, isPlaceholderData: true }))
    act(() => vi.advanceTimersByTime(LOADING_DELAY_MS + 1))
    expect(screen.getAllByRole('row')).toHaveLength(SKELETON_ROWS + 1)
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Things' })).toHaveAttribute('aria-busy', 'true')
    Table.rows = [{ id: 'b', name: 'Bernina' }]
    rerender(view({ isPending: false, isPlaceholderData: false }))
    expect(screen.getByText('Bernina')).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Things' })).not.toHaveAttribute('aria-busy')
  })
})
