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

const grid = () => screen.getByRole('group', { name: 'Pick' })

describe('chipRow', () => {
  it('draws no check of its own (the app-wide selected-tag rule draws the one check) and marks the selected chip', async () => {
    render(<Harness />)
    expect(grid().querySelectorAll('svg')).toHaveLength(0)
    await userEvent.click(within(grid()).getByRole('button', { name: 'Beta' }))
    expect(grid().querySelectorAll('svg')).toHaveLength(0)
    expect(within(grid()).getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(grid()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('is single select and never clears when the selected chip is tapped again', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(within(grid()).getByRole('button', { name: 'All' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(within(grid()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a count after the label, with no shadow and no check icon', () => {
    render(<Harness />)
    expect(within(grid()).getByRole('button', { name: /Alpha/ })).toHaveTextContent('Alpha · 2')
    for (const pill of within(grid()).getAllByRole('button')) {
      expect(pill.className).toContain('shadow-none')
      expect(pill.querySelector('svg')).toBeNull()
    }
  })
})
