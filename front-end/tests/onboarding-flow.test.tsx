import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleOverride, LocaleProvider } from '@/contexts/locale-context'
import OnboardingFlow from '@/features/onboarding/components/onboarding-flow'
import { getRecord, resetAnswersStoreForTests, saveAnswers } from '@/features/onboarding/lib/answers-store'
import { onboardingEn } from '@/features/onboarding/messages'
import { onboardingDe } from '@/features/onboarding/messages.de'

function renderFlow(mode: 'first' | 'change' = 'first') {
  const onClose = vi.fn()

  render(
    <LocaleProvider>
      <OnboardingFlow mode={mode} onClose={onClose} />
    </LocaleProvider>,
  )

  return { onClose, user: userEvent.setup() }
}

const heading = (name: RegExp) => screen.getByRole('heading', { name })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetAnswersStoreForTests()
})

afterEach(cleanup)

describe('[E4.5][AC36] N01 flow, first run', () => {
  it('[E4.5][AC36] renders a modal dialog named by the step heading, with focus on it', async () => {
    renderFlow()

    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveAttribute('aria-labelledby', heading(/How long are you in Lucerne/).id)
    expect(heading(/1 of 2\. How long are you in Lucerne/)).toHaveFocus()
    expect(heading(/How long/)).toHaveAttribute('tabindex', '-1')
  })

  it('[E4.5][AC36] Continue is disabled until a stay is chosen, then saves it and shows step 2', async () => {
    const { user } = renderFlow()
    const next = await screen.findByRole('button', { name: 'Continue' })

    expect(next).toBeDisabled()
    await user.click(screen.getByRole('row', { name: /Just today/ }))
    expect(next).toBeEnabled()
    expect(getRecord().segment).toBeNull()
    await user.click(next)

    expect(getRecord().segment).toBe('short_stay')
    expect(await screen.findByRole('heading', { name: /2 of 2\. What would you like to see/ })).toHaveFocus()
  })

  it('[E4.5][AC36] Skip on step 1 shows step 2 with focus on its heading and saves no stay', async () => {
    const { user, onClose } = renderFlow()

    await user.click(await screen.findByRole('row', { name: /A few days/ }))
    await user.click(screen.getByRole('button', { name: 'Skip' }))

    expect(await screen.findByRole('heading', { name: /2 of 2/ })).toHaveFocus()
    expect(getRecord().segment).toBeNull()
    expect(getRecord().dismissedAt).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('[E4.5][AC36] Back on step 2 returns to step 1', async () => {
    const { user } = renderFlow()

    await user.click(await screen.findByRole('button', { name: 'Skip' }))
    await user.click(await screen.findByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('heading', { name: /1 of 2/ })).toHaveFocus()
  })

  it('[E4.5][AC36] Escape on step 2 closes, keeps the saved stay and marks it dismissed', async () => {
    const { user, onClose } = renderFlow()

    await user.click(await screen.findByRole('row', { name: /Just today/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: /2 of 2/ })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(getRecord().segment).toBe('short_stay')
    expect(getRecord().interests).toEqual([])
    expect(getRecord().dismissedAt).not.toBeNull()
  })

  it('[E4.5][AC36] the close button on step 1 saves nothing and marks it dismissed', async () => {
    const { user, onClose } = renderFlow()

    await user.click(await screen.findByRole('row', { name: /Just today/ }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(getRecord().segment).toBeNull()
    expect(getRecord().dismissedAt).not.toBeNull()
  })

  it('[E4.5][AC36] step 2 button is disabled until an interest is chosen, then saves and closes', async () => {
    const { user, onClose } = renderFlow()

    await user.click(await screen.findByRole('button', { name: 'Skip' }))
    const show = await screen.findByRole('button', { name: 'Show my Lucerne' })

    expect(show).toBeDisabled()
    await user.click(screen.getByRole('row', { name: /Food and drink/ }))
    await user.click(screen.getByRole('row', { name: /Lake and mountains/ }))
    expect(show).toBeEnabled()
    await user.click(show)

    expect(getRecord().interests).toEqual(['food-drink', 'lake-mountains'])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('[E4.5][AC36] Skip on step 2 ends the flow, keeps the stay and drops the interests', async () => {
    const { user, onClose } = renderFlow()

    await user.click(await screen.findByRole('row', { name: /A few days/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('row', { name: /History and culture/ }))
    await user.click(screen.getByRole('button', { name: 'Skip' }))

    expect(getRecord().segment).toBe('multi_day')
    expect(getRecord().interests).toEqual([])
    expect(getRecord().dismissedAt).not.toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('[E4.5][AC36] shows the privacy line and no Forget link in a first run', async () => {
    renderFlow()

    expect(await screen.findByText('Your answers stay on this phone.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Forget my answers' })).toBeNull()
  })

  it('[E4.5][AC36] marks the rest of the page inert behind the dialog', async () => {
    render(
      <LocaleProvider>
        <main data-testid="page">page</main>
        <OnboardingFlow mode="first" onClose={() => {}} />
      </LocaleProvider>,
    )
    await screen.findByRole('dialog')

    expect(screen.getByTestId('page').closest('[aria-hidden="true"], [inert]')).not.toBeNull()
  })
})

describe('[E4.5][AC36] N01 flow, change mode', () => {
  beforeEach(() => {
    saveAnswers({ stay: 'multi_day', interests: ['food-drink'] })
  })

  it('[E4.5][AC36] is pre-filled, has no Skip and a tapped stay saves at once', async () => {
    const { user, onClose } = renderFlow('change')

    expect(await screen.findByRole('row', { name: /A few days/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull()
    await user.click(screen.getByRole('row', { name: /Just today/ }))

    expect(getRecord().segment).toBe('short_stay')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('row', { name: /Food and drink/ })).toHaveAttribute('aria-selected', 'true')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('[E4.5][AC36] Save is enabled, saves the interests and closes without marking dismissed', async () => {
    const { user, onClose } = renderFlow('change')

    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('row', { name: /Shopping and keepsakes/ }))
    const save = screen.getByRole('button', { name: 'Save' })

    expect(save).toBeEnabled()
    await user.click(save)

    expect(getRecord().interests).toEqual(['food-drink', 'shopping-keepsakes'])
    expect(getRecord().dismissedAt).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('[E4.5][AC36] Escape keeps what was already changed', async () => {
    const { user, onClose } = renderFlow('change')

    await user.click(await screen.findByRole('row', { name: /Just today/ }))
    await user.keyboard('{Escape}')

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(getRecord().segment).toBe('short_stay')
    expect(getRecord().interests).toEqual(['food-drink'])
  })

  it('[E4.5][AC36] Forget my answers clears everything and closes', async () => {
    const { user, onClose } = renderFlow('change')

    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'Forget my answers' }))

    expect(getRecord()).toMatchObject({ segment: null, interests: [], answeredAt: null, dismissedAt: null })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('[E4.5][AC37] answers stay in the browser', () => {
  it('[E4.5][AC37] a whole run makes no network request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const beacon = vi.fn()

    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
    const { user } = renderFlow()

    await user.click(await screen.findByRole('row', { name: /Just today/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('row', { name: /Food and drink/ }))
    await user.click(screen.getByRole('button', { name: 'Show my Lucerne' }))

    expect(getRecord().interests).toEqual(['food-drink'])
    expect(spy).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    spy.mockRestore()
    xhr.mockRestore()
  })
})

describe('[E4.5][AC36] copy', () => {
  it('[E4.5][AC36] every onboarding key exists in English and German, and the dictionaries carry them', async () => {
    const english = Object.keys(onboardingEn).sort()

    expect(Object.keys(onboardingDe).sort()).toEqual(english)
    for (const text of [...Object.values(onboardingEn), ...Object.values(onboardingDe)])
      expect(text.trim()).not.toBe('')
    for (const code of ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities']) {
      const de = await loadDictionary('de')

      expect(de[`places.interest.${code}` as keyof typeof de]).toBeTruthy()
    }
  })

  it('[E4.5][AC36] renders in German', async () => {
    await loadDictionary('de')
    render(
      <LocaleOverride language="de">
        <OnboardingFlow mode="first" onClose={() => {}} />
      </LocaleOverride>,
    )

    expect(await screen.findByRole('heading', { name: /1 von 2\. Wie lange sind Sie in Luzern/ })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Überspringen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schliessen' })).toBeInTheDocument()
  })
})
