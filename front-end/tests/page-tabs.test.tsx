import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PageTabs, TabPanel } from '@/components/page-tabs'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

const tabs = [
  { id: 'a', label: 'Alpha', badge: 3 },
  { id: 'b', label: 'Beta' },
]

function setup(props: Partial<Parameters<typeof PageTabs>[0]> = {}) {
  const onSelect = vi.fn()

  render(
    <PageTabs label="Things" selected="a" tabs={tabs} onSelect={onSelect} {...props}>
      <TabPanel id="a">Panel A</TabPanel>
      <TabPanel id="b">Panel B</TabPanel>
    </PageTabs>,
  )

  return onSelect
}

describe('pageTabs', () => {
  it('renders a labelled tablist with the tabs and a badge', () => {
    setup()
    expect(screen.getByRole('tablist', { name: 'Things' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: /Alpha/ })).toHaveTextContent('3')
    expect(screen.getByText('Panel A')).toBeInTheDocument()
  })

  it('calls onSelect with the id on click', async () => {
    const onSelect = setup()

    await userEvent.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('moves selection with ArrowRight', async () => {
    const onSelect = setup()

    screen.getByRole('tab', { name: /Alpha/ }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('fill is full width on phones and fit-content from lg', () => {
    setup({ fill: true })
    expect(screen.getByRole('tablist').parentElement?.parentElement).toHaveClass('w-full', 'lg:w-fit')
  })

  it('uses the thin pill: no min-h-11 on a tab', () => {
    setup()
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveClass('whitespace-nowrap')
      expect(tab).not.toHaveClass('min-h-11')
    }
  })

  it('equal makes the tabs share the bar', () => {
    setup({ equal: true })
    expect(screen.getAllByRole('tab')[0]).toHaveClass('flex-1')
  })
})
