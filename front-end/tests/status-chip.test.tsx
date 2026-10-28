import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusChip } from '@/components/status-chip'

describe('statusChip', () => {
  it('keeps the label on one line, so a narrow table column cannot wrap it', () => {
    render(<StatusChip tone="warning">1 linked item is unpublished</StatusChip>)

    expect(screen.getByText('1 linked item is unpublished')).toHaveClass('whitespace-nowrap')
  })
})
