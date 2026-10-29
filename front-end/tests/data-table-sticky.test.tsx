import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataTable } from '@/components/data-table'
import { LocaleProvider } from '@/contexts/locale-context'

interface Row { id: string, name: string }
const rows: Row[] = [{ id: 'a', name: 'Alpine' }, { id: 'b', name: 'Bernese' }]
const columns = [{ id: 'name', header: 'Name', isRowHeader: true, render: (row: Row) => row.name }]

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <LocaleProvider>
      <DataTable columns={columns} getRowId={row => row.id} label="Things" rows={rows} {...props} />
    </LocaleProvider>,
  )
}

const actions = { render: (row: Row) => <button type="button">{`Menu ${row.name}`}</button> }

describe('dataTable sticky actions column', () => {
  it('pins the header and every cell of the actions column at the end', () => {
    renderTable({ rowActions: actions })
    const header = screen.getByRole('columnheader', { name: 'Actions' })
    const cell = screen.getByRole('button', { name: 'Menu Alpine' }).closest('td')

    expect(header).toHaveClass('sticky', 'end-0', 'z-10', 'bg-surface-secondary')
    expect(cell).toHaveClass('sticky', 'end-0', 'z-10', 'bg-surface')
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveClass('sticky')
    expect(screen.getByRole('rowheader', { name: 'Alpine' })).not.toHaveClass('sticky')
  })

  it('does not pin anything without rowActions', () => {
    renderTable()
    expect(document.querySelector('.sticky')).toBeNull()
  })

  it('gives the card variant its own hover mix', () => {
    renderTable({ rowActions: actions, variant: 'card' })
    const cell = screen.getByRole('button', { name: 'Menu Alpine' }).closest('td')

    expect(cell?.className).toContain('var(--default)')
  })

  it('keeps the columns at a minimum width so the container scrolls', () => {
    renderTable()
    expect(screen.getByRole('grid', { name: 'Things' })).toHaveClass('min-w-[56rem]')
  })

  it('lets a caller override the minimum width and add classes', () => {
    renderTable({ contentClassName: 'min-w-[34rem] table-fixed' })
    const table = screen.getByRole('grid', { name: 'Things' })

    expect(table).toHaveClass('min-w-[34rem]', 'table-fixed')
    expect(table).not.toHaveClass('min-w-[56rem]')
  })
})

describe('dataTable hidePager', () => {
  const many: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}` }))
  const cards = (items: Row[]) => <ul>{items.map(row => <li key={row.id}>{`Card ${row.name}`}</li>)}</ul>

  it('pages at 10 rows with a pager by default', () => {
    renderTable({ rows: many, cards })
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getAllByText(/^Card Row/)).toHaveLength(10)
    expect(screen.getAllByRole('button', { name: /next/i }).length).toBeGreaterThan(0)
  })

  it('shows every row and no pager with hidePager, in the table and the cards', () => {
    renderTable({ rows: many, cards, hidePager: true })
    expect(screen.getAllByRole('row')).toHaveLength(13)
    expect(screen.getAllByText(/^Card Row/)).toHaveLength(12)
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull()
  })
})
