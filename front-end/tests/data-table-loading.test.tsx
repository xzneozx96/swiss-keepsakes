import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataTable } from '@/components/data-table'
import { SKELETON_ROWS } from '@/components/data-table-skeleton'
import { LocaleProvider } from '@/contexts/locale-context'

interface Row { id: string, name: string, kind: string }
const rows: Row[] = [{ id: 'a', name: 'Alpine', kind: 'Map' }]
const columns = [
  { id: 'name', header: 'Name', isRowHeader: true, render: (row: Row) => row.name },
  { id: 'kind', header: 'Kind', render: (row: Row) => row.kind },
]
const rowActions = { render: (row: Row) => <button type="button">{`Menu ${row.name}`}</button> }
const empty = { message: 'Nothing here' }

// The row-header column's cell has the rowheader role, the others gridcell; both are td.
const cellsOf = (row: HTMLElement) => Array.from(row.querySelectorAll('td'))

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <LocaleProvider>
      <DataTable columns={columns} getRowId={row => row.id} label="Things" rows={rows} {...props} />
    </LocaleProvider>,
  )
}

describe('dataTable isLoading', () => {
  it('draws the real headers and one skeleton row per SKELETON_ROWS with a cell per column', () => {
    renderTable({ isLoading: true, rows: [] })
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Kind' })).toBeInTheDocument()
    const body = screen.getAllByRole('row').slice(1)

    expect(body).toHaveLength(SKELETON_ROWS)
    for (const row of body)
      expect(cellsOf(row)).toHaveLength(columns.length)
  })

  it('keeps the actions header and an action-shaped skeleton in that column', () => {
    renderTable({ isLoading: true, rowActions })
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    const row = screen.getAllByRole('row')[1]
    const cells = cellsOf(row)

    expect(cells).toHaveLength(columns.length + 1)
    expect(cells[columns.length].querySelector('.size-8.rounded-full')).not.toBeNull()
  })

  it('shows no row content and no empty state', () => {
    renderTable({ isLoading: true, empty, rowActions })
    expect(screen.queryByText('Alpine')).toBeNull()
    expect(screen.queryByText('Nothing here')).toBeNull()
    expect(screen.queryByRole('button', { name: /Menu/ })).toBeNull()
  })

  it('marks the grid busy only while loading', () => {
    const props = { columns, getRowId: (row: Row) => row.id, label: 'Things', rows }
    const table = (isLoading: boolean) => (
      <LocaleProvider>
        <DataTable {...props} isLoading={isLoading} />
      </LocaleProvider>
    )
    const { rerender } = render(table(true))

    expect(screen.getByRole('grid', { name: 'Things' })).toHaveAttribute('aria-busy', 'true')
    rerender(table(false))
    expect(screen.getByRole('grid', { name: 'Things' })).not.toHaveAttribute('aria-busy')
  })

  it('gives the grid the same classes loading and loaded, so the width does not shift', () => {
    const { unmount } = renderTable({ isLoading: true, contentClassName: 'min-w-[44rem]' })
    const loading = screen.getByRole('grid', { name: 'Things' }).className

    unmount()
    renderTable({ contentClassName: 'min-w-[44rem]' })
    expect(screen.getByRole('grid', { name: 'Things' }).className).toBe(loading)
  })
})
