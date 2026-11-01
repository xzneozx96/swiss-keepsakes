import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useConfirm } from '@/components/confirm-dialog'
import { LocaleProvider } from '@/contexts/locale-context'

const options = { title: 'Delete it?', body: 'It goes.', confirmLabel: 'Delete it' }

function Harness({ run, problem, onAnswer }: { run?: () => Promise<unknown>, problem?: (error: unknown) => string, onAnswer: (ok: boolean) => void }) {
  const { confirm, dialog } = useConfirm()

  return (
    <>
      <button type="button" onClick={() => void confirm({ ...options, run, problem }).then(onAnswer)}>Open</button>
      {dialog}
    </>
  )
}

function renderHarness(props: Parameters<typeof Harness>[0]) {
  return render(
    <LocaleProvider>
      <Harness {...props} />
    </LocaleProvider>,
  )
}

describe('confirm dialog with a write (run)', () => {
  it('spins and cannot be closed while the write runs, then closes and answers true', async () => {
    let finish = () => {}
    const answers: boolean[] = []

    renderHarness({ run: () => new Promise<void>((resolve) => { finish = resolve }), onAnswer: ok => answers.push(ok) })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete it' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Delete it/ })).toHaveAttribute('data-pending', 'true'))
    expect(screen.getByRole('button', { name: /Delete it/ }).querySelector('[data-slot="spinner"], .spinner')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(document.querySelector('[data-slot="modal-backdrop"], [data-slot="alert-dialog-backdrop"]') ?? document.body)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(answers).toEqual([])

    await act(async () => finish())

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(answers).toEqual([true])
  })

  it('stays open with the problem when the write is refused, and a new try can run', async () => {
    const answers: boolean[] = []
    let attempts = 0

    renderHarness({
      run: () => (++attempts === 1 ? Promise.reject(new Error('nope')) : Promise.resolve()),
      problem: error => `Refused: ${(error as Error).message}`,
      onAnswer: ok => answers.push(ok),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete it' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Refused: nope')
    expect(screen.getByRole('button', { name: 'Delete it' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(answers).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Delete it' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(answers).toEqual([true])
  })

  it('answers false on Cancel after a refusal', async () => {
    const answers: boolean[] = []

    renderHarness({ run: () => Promise.reject(new Error('x')), onAnswer: ok => answers.push(ok) })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete it' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(answers).toEqual([false]))
  })

  it('without run, the button answers true and closes at once', async () => {
    const answers: boolean[] = []

    renderHarness({ onAnswer: ok => answers.push(ok) })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete it' }))

    await waitFor(() => expect(answers).toEqual([true]))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
