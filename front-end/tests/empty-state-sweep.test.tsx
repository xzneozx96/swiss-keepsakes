import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { MixWidget } from '@/features/partners/report/components/dashboard-widgets'

describe('dashboard empty states use the shared EmptyState', () => {
  it('the partner commission mix with no commission shows the compact empty state, not a bare sentence', () => {
    const { container } = render(
      <LocaleProvider>
        <MixWidget className="" groups={[]} groupsHeading="" mix={{ total: '0', isEmpty: true, parts: [] }} />
      </LocaleProvider>,
    )

    const message = screen.getByText('No commission in this period yet')
    expect(message.tagName).toBe('P')
    expect(container.querySelector('[data-slot="empty-state"], svg')).not.toBeNull()
    expect(message.previousElementSibling?.querySelector('svg')).not.toBeNull()
  })
})
