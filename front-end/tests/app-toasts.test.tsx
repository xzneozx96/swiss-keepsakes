import { toast } from '@heroui/react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppToasts } from '@/components/app-toasts'
import { LocaleProvider } from '@/contexts/locale-context'

describe('app toasts', () => {
  it('[A11Y-toast] announces success as status and an error as alert', async () => {
    render(
      <LocaleProvider>
        <AppToasts storageFull={false} />
      </LocaleProvider>,
    )

    act(() => {
      toast.success('Saved')
      toast.danger('Could not save')
    })

    const saved = (await screen.findByText('Saved')).closest('[data-slot="toast-content"]')
    const failed = (await screen.findByText('Could not save')).closest('[data-slot="toast-content"]')

    expect(saved).toHaveAttribute('role', 'status')
    expect(saved).toHaveAttribute('aria-live', 'polite')
    expect(failed).toHaveAttribute('role', 'alert')
  })
})
