import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AutoTextArea } from '@/components/auto-textarea'

// jsdom has no CSS.supports('field-sizing'), so the measured fallback runs here.
const heights = { scroll: 40 }

afterEach(() => vi.restoreAllMocks())

function mockScrollHeight() {
  vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(() => heights.scroll)
}

describe('[S8-UI-02] AutoTextArea', () => {
  it('sets its height from the content on mount and on every input, with no scrollbar and no resize handle', async () => {
    mockScrollHeight()
    heights.scroll = 40
    render(<AutoTextArea aria-label="Notes" />)
    const field = screen.getByRole('textbox', { name: 'Notes' })

    expect(field.style.height).toBe('40px')
    expect(field).toHaveClass('resize-none', 'overflow-hidden')
    heights.scroll = 120
    await userEvent.type(field, 'a')
    expect(field.style.height).toBe('120px')
    heights.scroll = 80
    await userEvent.type(field, 'b')
    expect(field.style.height).toBe('80px')
  })

  it('uses rows as the minimum height', () => {
    mockScrollHeight()
    render(<AutoTextArea aria-label="Notes" rows={3} />)

    expect(screen.getByRole('textbox', { name: 'Notes' }).style.minHeight).toContain('3lh')
  })

  it('caps the height at maxRows and scrolls inside past it', () => {
    mockScrollHeight()
    heights.scroll = 500
    render(<AutoTextArea aria-label="Notes" maxRows={6} />)
    const field = screen.getByRole('textbox', { name: 'Notes' })

    expect(field.style.maxHeight).toContain('6lh')
    expect(field).toHaveClass('overflow-y-auto')
    expect(field).not.toHaveClass('overflow-hidden')
  })
})
