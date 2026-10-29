import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RouteTabs } from '@/components/route-tabs'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

describe('routeTabs', () => {
  it('keeps its row markup: thin pill, w-fit container, badge, trailing', () => {
    render(
      <RouteTabs
        label="Pages"
        selected="a"
        tabs={[{ id: 'a', to: '/a', label: 'Alpha', badge: 2 }, { id: 'b', to: '/b', label: 'Beta' }]}
        trailing={<button type="button">Filter</button>}
      />,
    )
    const list = screen.getByRole('tablist', { name: 'Pages' })

    expect(list.parentElement?.parentElement).toHaveClass('w-fit', 'max-w-full')
    expect(screen.getByRole('tab', { name: /Alpha/ })).toHaveClass('whitespace-nowrap')
    expect(screen.getByRole('tab', { name: /Alpha/ })).not.toHaveClass('min-h-11')
    expect(screen.getByRole('tab', { name: /Alpha/ })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument()
  })
})
