import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ActionBar } from '@/components/action-bar'
import { EditIcon, TrashIcon } from '@/components/icons'
import { LocaleProvider } from '@/contexts/locale-context'

function setup(props: Partial<React.ComponentProps<typeof ActionBar>> = {}) {
  const onClear = vi.fn()
  const edit = vi.fn()
  const remove = vi.fn()

  render(
    <LocaleProvider>
      <ActionBar
        actions={[
          { icon: EditIcon, label: 'Edit', onPress: edit },
          { icon: TrashIcon, label: 'Delete', tone: 'danger', onPress: remove },
        ]}
        count={3}
        onClear={onClear}
        {...props}
      />
    </LocaleProvider>,
  )
  return { onClear, edit, remove }
}

describe('actionBar', () => {
  it('shows the count and announces it politely', () => {
    setup()

    expect(screen.getByText('3 selected').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('runs an action and clears with the close button', async () => {
    const { edit, remove, onClear } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(edit).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('tabs count, actions, close in order, and Esc clears', async () => {
    const { onClear } = setup()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Clear selection' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('styles the destructive action as danger-soft and a pending one does not fire', async () => {
    const remove = vi.fn()

    setup({ actions: [{ icon: TrashIcon, label: 'Delete', tone: 'danger', isPending: true, onPress: remove }] })
    const button = screen.getByRole('button', { name: 'Delete' })

    expect(button).toHaveClass('button--danger-soft')
    await userEvent.click(button)
    expect(remove).not.toHaveBeenCalled()
  })

  it('uses an accessible name that says more than the label', () => {
    setup({ actions: [{ icon: TrashIcon, label: 'Delete', ariaLabel: 'Delete 2', onPress: vi.fn() }] })

    expect(screen.getByRole('button', { name: 'Delete 2' })).toBeInTheDocument()
  })
})
