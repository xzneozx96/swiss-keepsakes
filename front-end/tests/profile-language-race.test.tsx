import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderProfile, storedLanguage } from './profile-language-race-helpers'

// The German messages arrive when the test lets them: a slow connection. Each file has its own gate.
const gate = vi.hoisted(() => {
  let release = () => {}
  const opened = new Promise<void>((resolve) => {
    release = resolve
  })

  return { opened, release }
})

vi.mock('@/i18n/de', async (importActual) => {
  await gate.opened

  return importActual()
})

describe('profile language change, last tap wins', () => {
  beforeEach(() => localStorage.clear())

  it('a slow German load followed by a fast English tap ends in English, never on /de', async () => {
    const router = renderProfile('en')

    await userEvent.click(await screen.findByText('Deutsch'))
    await userEvent.click(screen.getByRole('button', { name: 'other en' }))
    await waitFor(() => expect(storedLanguage()).toBe(JSON.stringify('en')))

    await act(async () => {
      gate.release()
      // The German messages are in (the load the panel waited for is done), then the panel's own follow-up has had its turn.
      await import('@/i18n/de')
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(router.state.location.pathname).not.toMatch(/^\/de/)
    expect(storedLanguage()).toBe(JSON.stringify('en'))
  })
})
