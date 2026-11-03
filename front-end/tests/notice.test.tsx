import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Notice } from '@/components/notice'

describe('notice', () => {
  it('draws the soft HeroUI Alert in the status colour: danger for a refusal, warning for a hint', () => {
    const { rerender } = render(<Notice status="danger">Fix this first.</Notice>)
    const danger = screen.getByText('Fix this first.').closest('.alert')

    expect(danger).toHaveClass('alert--soft', 'alert--danger', 'w-full')
    expect(danger).toHaveAttribute('role', 'alert')
    rerender(<Notice status="warning">You can still publish.</Notice>)
    expect(screen.getByText('You can still publish.').closest('.alert')).toHaveClass('alert--soft', 'alert--warning')
  })

  it('shows its actions under the text', () => {
    render(<Notice status="warning" actions={<button type="button">Reload</button>}>Changed elsewhere.</Notice>)

    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})
