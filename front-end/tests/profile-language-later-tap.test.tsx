import { screen, waitFor } from '@testing-library/react'
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

// Pins the other order: the later tap is the slow one and still wins. The old panel passed this too; the bug
// is guarded by profile-language-race.test.tsx.
describe('profile language change, later slow tap', () => {
  beforeEach(() => localStorage.clear())

  it('an English tap followed by a slow German tap ends in German on the /de address', async () => {
    const router = renderProfile('en')

    await userEvent.click(await screen.findByRole('button', { name: 'other en' }))
    await userEvent.click(await screen.findByText('Deutsch'))
    gate.release()

    await waitFor(() => expect(router.state.location.pathname).toBe('/de/gifts'))
    expect(storedLanguage()).toBe(JSON.stringify('de'))
  })
})
