import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ChipRow } from '@/components/chip-row'

const ITEMS = [{ id: 'all', label: 'All' }, { id: 'a', label: 'Alpha', count: 2 }, { id: 'b', label: 'Beta' }]

function Harness({ onChange }: { onChange?: (id: string) => void }) {
  const [selected, setSelected] = useState('all')

  return <ChipRow items={ITEMS} label="Pick" selected={selected} onChange={(id) => { setSelected(id); onChange?.(id) }} />
}

const grid = () => screen.getByRole('grid', { name: 'Pick' })

describe('chipRow', () => {
  it('draws no check of its own (the app-wide selected-tag rule draws the one check) and marks the selected chip', async () => {
    render(<Harness />)
    expect(grid().querySelectorAll('svg')).toHaveLength(0)
    await userEvent.click(within(grid()).getByRole('row', { name: 'Beta' }))
    expect(grid().querySelectorAll('svg')).toHaveLength(0)
    expect(within(grid()).getByRole('row', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(within(grid()).getByRole('row', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
  })

  it('is single select and never clears when the selected chip is tapped again', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(within(grid()).getByRole('row', { name: 'All' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(within(grid()).getByRole('row', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a count after the label, and each chip asks for 44 px', () => {
    render(<Harness />)
    expect(within(grid()).getByRole('row', { name: 'Alpha 2' })).toHaveTextContent('Alpha2')
    for (const row of within(grid()).getAllByRole('row'))
      expect(row.className).toContain('min-h-11')
  })
})
