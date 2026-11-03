import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { QuantityBox } from '@/components/quantity-stepper'

function renderBox() {
  const onChange = vi.fn()
  const onText = vi.fn()

  render(<QuantityBox label="Stock" max={9999} min={0} value={5} onChange={onChange} onText={onText} />)

  return { onChange, onText, box: screen.getByRole('textbox', { name: 'Stock' }), user: userEvent.setup() }
}

describe('[E6.3][AC05][AC53] AC-2 the shared QuantityBox with onText', () => {
  it('[E6.3][AC05][AC53] AC-2 hands the typed text to onText on Enter and on blur, and onChange hears nothing of it', async () => {
    const { box, onChange, onText, user } = renderBox()

    await user.click(box)
    await user.clear(box)
    await user.type(box, '12000{Enter}')
    expect(onText.mock.calls.map(call => call[0])).toEqual(['12000'])
    await user.tab()
    // The blur after Enter reports what the field shows then: the saved figure it went back to.
    expect(onText.mock.calls.map(call => call[0])).toEqual(['12000', '5'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53] AC-2 keeps a refused character in the text, so "-3" and "abc" arrive as typed', async () => {
    const { box, onText, user } = renderBox()

    await user.click(box)
    await user.clear(box)
    await user.type(box, '-3')
    await user.tab()
    await user.click(box)
    await user.clear(box)
    await user.type(box, 'abc')
    await user.tab()

    expect(onText.mock.calls.map(call => call[0])).toEqual(['3-', 'abc'])
  })

  it('[E6.3][AC05][AC53] AC-2 a step goes to onChange only', async () => {
    const { onChange, onText, user } = renderBox()

    await user.click(screen.getByRole('button', { name: /Increase/ }))

    expect(onChange).toHaveBeenCalledWith(6)
    expect(onText).not.toHaveBeenCalled()
  })

  it('[E6.3][AC05][AC53] AC-2 without onText the box is the cart box: typing reports the figure through onChange', async () => {
    const onChange = vi.fn()

    render(<QuantityBox label="Qty" max={9} min={1} value={2} onChange={onChange} />)
    const user = userEvent.setup()
    const box = screen.getByRole('textbox', { name: 'Qty' })

    await user.click(box)
    await user.clear(box)
    await user.type(box, '4{Enter}')

    expect(onChange).toHaveBeenLastCalledWith(4)
  })
})
