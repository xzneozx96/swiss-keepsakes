import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { CategoryPhone } from '@/features/categories/components/category-phone'
import { CategoryTable } from '@/features/categories/components/category-table'

const actions = {
  add: vi.fn(),
  edit: vi.fn(),
  addSub: vi.fn(),
  remove: vi.fn(),
  move: vi.fn(),
  reorder: vi.fn(),
}

const wrap = (node: React.ReactNode) => render(<LocaleProvider>{node}</LocaleProvider>)

describe('categories loading', () => {
  it('table: the real search field and headers, skeleton rows, no big boxes, no empty state or hint', () => {
    const { container } = wrap(<CategoryTable loading actions={actions} busy={false} items={[]} kind="map" />)

    expect(screen.getByRole('searchbox')).toBeDisabled()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'German name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Used by' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(container.querySelector('.h-28')).toBeNull()
    expect(screen.queryByText(/drag/i)).toBeNull()
    expect(screen.queryByText(/no pins|nothing/i)).toBeNull()
  })

  it('phone: a search field, then five skeleton rows in one rounded card, no big boxes', () => {
    const { container } = wrap(<CategoryPhone loading actions={actions} busy={false} items={[]} kind="map" />)

    expect(screen.getByRole('searchbox')).toBeDisabled()
    const rows = within(container.querySelector('ul')!).getAllByRole('listitem', { hidden: true })

    expect(rows).toHaveLength(5)
    expect(container.querySelector('.rounded-3xl.h-28')).toBeNull()
    expect(container.querySelector('.h-28')).toBeNull()
    expect(container.querySelector('.rounded-3xl.bg-surface.shadow-surface ul.divide-y')).not.toBeNull()
  })
})
