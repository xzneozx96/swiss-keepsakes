import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StoriesPage } from '@/features/content/components/stories-page'
import { getRecord, markDismissed, saveAnswers, saveStay } from '@/features/onboarding/lib/answers-store'
import { openOnboarding } from '@/features/onboarding/lib/opener'
import { getVisit, hideCard } from '@/features/onboarding/lib/visit'
import { freshBrowser, reloadPage, renderApp, settle } from './support/onboarding-harness'
import { storyCard } from './support/story-cards'

const audience = vi.hoisted(() => ({ value: 'guest' as 'guest' | 'staff' | 'unknown' }))

vi.mock('@/features/onboarding/hooks/use-onboarding-audience', () => ({ useOnboardingAudience: () => audience.value }))

const flow = () => screen.queryByRole('dialog')
const stepOne = () => screen.findByRole('heading', { name: /1 of 2\. How long are you in Lucerne/ })

beforeEach(() => {
  audience.value = 'guest'
  freshBrowser()
})

afterEach(cleanup)

describe('[E4.5][AC36] the flow opens on the first visit', () => {
  it('[E4.5][AC36] a first visit at the home opens the dialog with focus on the heading', async () => {
    await renderApp('/en')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await stepOne()).toHaveFocus()
    expect(getVisit()).toEqual({ entry: 'home', cardHidden: false })
  })
})

describe('[E4.5][AC37] answers stay in the browser', () => {
  it('[E4.5][AC37] answers survive a reload: no flow, the same answers', async () => {
    saveAnswers({ stay: 'multi_day', interests: ['food-drink', 'lake-mountains'] })
    const before = getRecord()

    cleanup()
    reloadPage()
    await renderApp('/en')

    expect(flow()).toBeNull()
    expect(getRecord()).toEqual(before)
  })

  it('[E4.5][AC37] cleared browser data shows the flow again at a new visit', async () => {
    saveAnswers({ stay: 'multi_day', interests: ['food-drink'] })
    cleanup()
    freshBrowser()
    await renderApp('/en')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('[E4.5][AC24][AC91] entry matrix', () => {
  it.each([
    ['the home, direct', '/en', '', 'opens'],
    ['the home with utm_medium=partner', '/en?utm_medium=partner', '', 'waits'],
    ['the home with utm_source=partner', '/en?utm_source=partner', '', 'waits'],
    ['the home from a search result', '/en', 'https://www.google.com/search?q=lucerne', 'waits'],
    ['a story page', '/en/stories/chapel-bridge', '', 'waits'],
  ])('[E4.5][AC91] a visit that began at %s %s', async (_name, url, referrer, outcome) => {
    freshBrowser(referrer)
    await renderApp(url)

    if (outcome === 'opens')
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
    else
      expect(flow()).toBeNull()
  })

  it('[E4.5][AC24] a story first page waits, then opens when the guest goes to the home from inside the app', async () => {
    const { router } = await renderApp('/en/stories/chapel-bridge')

    expect(flow()).toBeNull()
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('[E4.5][AC24][AC91] a partner redirect to the home shows no flow, the marker leaves the address, and Explore opens it later', async () => {
    freshBrowser()
    const { router } = await renderApp('/en?via=partner')

    await settle()
    expect(flow()).toBeNull()
    expect(router.state.location.href).toBe('/en')
    expect(JSON.parse(sessionStorage.getItem('sk.visit') ?? '{}').entry).toBe('other')
    await act(() => router.navigate({ to: '/$lang/stories', params: { lang: 'en' } }))
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('[E4.5][AC24] the marker is dropped from a story address and keeps other query parts', async () => {
    freshBrowser()
    const { router } = await renderApp('/en/stories/chapel-bridge?a=1&via=partner#top')

    await settle()
    expect(router.state.location.href).toBe('/en/stories/chapel-bridge?a=1#top')
  })

  it('[E4.5][AC24] a partner landing on the home waits for an in-app navigation, then opens at the next Explore opening', async () => {
    const { router } = await renderApp('/en?utm_medium=partner')

    await settle()
    expect(flow()).toBeNull()
    await act(() => router.navigate({ to: '/$lang/stories', params: { lang: 'en' } }))
    await settle()
    expect(flow()).toBeNull()
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('[E4.5][AC24] an answered guest never gets the flow, at the home or on an Explore opening', async () => {
    saveStay('short_stay')
    const { router } = await renderApp('/en/stories/chapel-bridge')

    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))
    await settle()
    expect(flow()).toBeNull()
  })

  it('[E4.5][AC24] a guest who skipped never gets the flow by itself', async () => {
    markDismissed()
    await renderApp('/en')

    expect(flow()).toBeNull()
  })

  it('[E4.5][AC24] hiding the deep-link card is not a skip: the next Explore opening still opens the flow', async () => {
    const { router } = await renderApp('/en/stories/chapel-bridge')

    act(() => hideCard())
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('[E4.5][AC36] a skip is final: leaving the home and coming back does not reopen the flow', async () => {
    const { router } = await renderApp('/en')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Close' }))
    await waitFor(() => expect(flow()).toBeNull())
    await act(() => router.navigate({ to: '/$lang/stories', params: { lang: 'en' } }))
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))
    await settle()

    expect(flow()).toBeNull()
    expect(getRecord().dismissedAt).not.toBeNull()
  })
})

describe('[E4.5][AC92] who sees the flow', () => {
  it.each(['staff', 'unknown'] as const)('[E4.5][AC92] a %s audience never gets the flow, by itself or by a manual open', async (who) => {
    audience.value = who
    await renderApp('/en')

    expect(flow()).toBeNull()
    act(() => openOnboarding('change'))
    await settle()
    expect(flow()).toBeNull()
  })

  it('[E4.5][AC92] a private path never shows it, not even for a manual open', async () => {
    await renderApp('/store')

    act(() => openOnboarding('change'))
    await settle()
    expect(flow()).toBeNull()
  })

  it('[E4.5][AC92] an audience that was unknown opens the flow once it is a guest', async () => {
    audience.value = 'unknown'
    const { router } = await renderApp('/en')

    expect(flow()).toBeNull()
    audience.value = 'guest'
    await act(() => router.navigate({ to: '/$lang/stories', params: { lang: 'en' } }))
    await act(() => router.navigate({ to: '/$lang', params: { lang: 'en' } }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('[E4.5][AC36] closing and focus', () => {
  it('[E4.5][AC36] "Forget my answers" empties the record and the flow does not reopen at once', async () => {
    saveAnswers({ stay: 'short_stay', interests: ['food-drink'] })
    await renderApp('/en')
    const user = userEvent.setup()

    act(() => openOnboarding('change'))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'Forget my answers' }))
    await waitFor(() => expect(flow()).toBeNull())
    await settle()

    expect(getRecord().segment).toBeNull()
    expect(getRecord().interests).toEqual([])
    expect(flow()).toBeNull()
  })

  it('[E4.5][AC36] focus returns to the control that opened the flow', async () => {
    markDismissed()
    await renderApp('/en')
    const user = userEvent.setup()
    const opener = screen.getByRole('button', { name: 'Other control' })

    await user.click(opener)
    act(() => openOnboarding('change'))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(flow()).toBeNull())
    expect(opener).toHaveFocus()
  })

  it('[E4.5][AC36] with nothing focused, focus goes to the element marked data-onboarding-return', async () => {
    markDismissed()
    await renderApp('/en')
    const user = userEvent.setup()

    act(() => openOnboarding('change'))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(flow()).toBeNull())
    expect(screen.getByRole('button', { name: 'Sort for my trip' })).toHaveFocus()
  })
})

describe('[E4.5][AC38] closing the flow re-ranks the stories list', () => {
  const food = storyCard({ title: 'Food walk', stayTag: 'short_stay', interests: ['food-drink'], publishedAt: '2026-09-01T00:00:00.000Z' })
  const hike = storyCard({ title: 'Long hike', stayTag: 'multi_day', interests: ['lake-mountains'], publishedAt: '2026-09-02T00:00:00.000Z' })
  const newest = storyCard({ title: 'Newest story', publishedAt: '2026-10-03T00:00:00.000Z' })
  const titles = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)

  it('[E4.5][AC38] short stay and food and drink put the matching story first and keep every story', async () => {
    markDismissed()
    await renderApp('/en/stories', {
      stories: () => <StoriesPage stories={[newest, hike, food]} onChangeAnswers={() => openOnboarding('change')} onRetry={() => {}} />,
    })
    const user = userEvent.setup()

    await waitFor(() => expect(titles()).toEqual(['Newest story', 'Long hike', 'Food walk']))
    await user.click(screen.getByRole('button', { name: 'Sort for my trip' }))
    await user.click(await screen.findByRole('row', { name: /Just today/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('row', { name: /Food and drink/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(flow()).toBeNull())

    await waitFor(() => expect(titles()[0]).toBe('Food walk'))
    expect(titles()).toHaveLength(3)
    expect(titles()).toEqual(expect.arrayContaining(['Food walk', 'Long hike', 'Newest story']))
    expect(screen.getByText(/Sorted for/).parentElement).toHaveTextContent('Sorted for: Just today, Food and drink · Change')
  })
})
