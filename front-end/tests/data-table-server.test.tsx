import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from '@/components/data-table'
import { OrdersIcon } from '@/components/icons'
import { serverPager } from '@/components/list-pagination'
import { LocaleProvider } from '@/contexts/locale-context'

interface Row { id: string, name: string }
const columns = [{ id: 'name', header: 'Name', isRowHeader: true, render: (row: Row) => row.name }]
const page = (from: number, count: number): Row[] => Array.from({ length: count }, (_, index) => ({ id: `r${from + index}`, name: `Row ${from + index}` }))

function renderTable(rows: Row[], pager: Parameters<typeof serverPager>[0], extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <LocaleProvider>
      <DataTable columns={columns} getRowId={row => row.id} label="Things" paging={serverPager(pager)} rows={rows} {...extra} />
    </LocaleProvider>,
  )
}

describe('[ADR-033] serverPager', () => {
  it('works out the pages and the shown range from the server total', () => {
    expect(serverPager({ page: 2, pageSize: 10, total: 25, go: () => {} })).toMatchObject({ page: 2, pages: 3, total: 25, from: 11, to: 20 })
    expect(serverPager({ page: 3, pageSize: 10, total: 25, go: () => {} })).toMatchObject({ from: 21, to: 25 })
    expect(serverPager({ page: 1, pageSize: 10, total: 0, go: () => {} })).toMatchObject({ pages: 1, total: 0 })
  })
})

describe('[ADR-033] dataTable in server mode', () => {
  it('shows the rows it was given, not a slice: a page of 10 rows of 45 shows all 10 and a pager for 5 pages', () => {
    renderTable(page(11, 10), { page: 2, pageSize: 10, total: 45, go: () => {} })

    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getByText('Row 11')).toBeInTheDocument()
    expect(screen.getByText('Row 20')).toBeInTheDocument()
    expect(screen.getByText('11–20 of 45')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument()
  })

  it('a page link asks the caller for that page, and the table does not move by itself', async () => {
    const go = vi.fn()
    renderTable(page(11, 10), { page: 2, pageSize: 10, total: 45, go })

    await userEvent.click(screen.getByLabelText('Page 3'))

    expect(go).toHaveBeenCalledWith(3)
    expect(screen.getByText('Row 11')).toBeInTheDocument()
  })

  it('a page with no rows but a total (past the end) still shows the pager', () => {
    renderTable([], { page: 9, pageSize: 10, total: 25, go: () => {} }, { empty: { icon: OrdersIcon, message: 'Nothing here' } })

    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
  })

  it('no pager for a single page', () => {
    renderTable(page(1, 3), { page: 1, pageSize: 10, total: 3, go: () => {} })

    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('ticking rows still works per page', async () => {
    const onChange = vi.fn()
    renderTable(page(1, 3), { page: 1, pageSize: 10, total: 30, go: () => {} }, { selection: { selected: new Set(), onChange } })

    await userEvent.click(screen.getAllByRole('checkbox')[1]!)

    expect(onChange).toHaveBeenCalledWith(new Set(['r1']))
  })
})
