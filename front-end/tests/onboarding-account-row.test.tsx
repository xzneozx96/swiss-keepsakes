import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRecord, saveAnswers } from '@/features/onboarding/lib/answers-store'
import { freshBrowser, renderApp, settle } from './support/onboarding-harness'

const audience = vi.hoisted(() => ({ value: 'guest' as 'guest' | 'staff' | 'unknown' }))

vi.mock('@/features/onboarding/hooks/use-onboarding-audience', () => ({ useOnboardingAudience: () => audience.value }))

const row = () => screen.queryByRole('button', { name: /Your trip/ })

beforeEach(() => {
  audience.value = 'guest'
  freshBrowser()
})

afterEach(cleanup)

describe('[E4.5][AC36] Account row "Your trip"', () => {
  it('[E4.5][AC36] shows "Not set yet" with no answers', async () => {
    await renderApp('/account')

    expect(row()).toHaveTextContent('Your trip')
    expect(row()).toHaveTextContent('Not set yet')
  })

  it('[E4.5][AC36] names the stay and the interests, with the labels the lists use', async () => {
    saveAnswers({ stay: 'short_stay', interests: ['food-drink'] })
    await renderApp('/account')

    expect(row()).toHaveTextContent('Just today, Food and drink')
  })

  it('[E4.5][AC36] opens the flow in change mode, pre-filled, and Forget my answers clears the record', async () => {
    saveAnswers({ stay: 'multi_day', interests: ['food-drink'] })
    await renderApp('/account')
    const user = userEvent.setup()

    await user.click(row()!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('row', { name: /A few days/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('row', { name: /Food and drink/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Forget my answers' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(getRecord().segment).toBeNull()
    expect(getRecord().interests).toEqual([])
    await waitFor(() => expect(row()).toHaveTextContent('Not set yet'))
  })

  it('[E4.5][AC36] focus returns to the row when the flow closes', async () => {
    await renderApp('/account')
    const user = userEvent.setup()

    await user.click(row()!)
    await user.click(await screen.findByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(row()).toHaveFocus()
  })
})

describe('[E4.5][AC92] the row is for guests only', () => {
  it.each(['staff', 'unknown'] as const)('[E4.5][AC92] a %s audience does not see the row', async (who) => {
    audience.value = who
    await renderApp('/account')
    await act(settle)

    expect(row()).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })
})
