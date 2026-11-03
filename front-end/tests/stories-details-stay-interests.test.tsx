import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, groupPatches, renderStoryEditor, serveDetails, setUpHarness, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-details-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const version = (language: 'en' | 'de') => storyVersion(language, { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })
const group = (over: Record<string, unknown> = {}) => storyGroupDetail({ en: version('en'), de: version('de') }, { categoryIds: [uuid(900)], ...over })

async function openReview(search = '') {
  renderStoryEditor(`${path}?screen=review${search}`)
  await screen.findAllByText('Review and publish', undefined, SLOW)
}

/** The header of a closed card; pressing it opens the card. */
const header = (name: string) => screen.findByRole('button', { name: new RegExp(`^${name}`) }, SLOW)

async function open(name: string) {
  const button = await header(name)

  if (button.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(button)

  return button
}

describe('[E4.3][AC30] the Stay and Interests cards', () => {
  it('[E4.3][AC30] AC-5 a story with no choice keeps Both', async () => {
    serveDetails(group())
    await openReview()
    const button = await header('Stay')

    expect(within(button).getByText('Both')).toBeInTheDocument()
    await open('Stay')
    expect(screen.getByRole('radio', { name: /^Both/ })).toBeChecked()
    expect(screen.getByText('Orders lists for each guest; nothing is hidden.')).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-5 picking Multi-day sends {stayTag:multi_day} with the group If-Match and the summary says Multi-day', async () => {
    serveDetails(group())
    await openReview()
    await open('Stay')
    await userEvent.click(screen.getByRole('radio', { name: /Multi-day/ }))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]).toMatchObject({ ifMatch: '1', body: { stayTag: 'multi_day' } })
    await userEvent.click(await header('Stay'))
    expect(within(await header('Stay')).getByText('Multi-day')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] AC-5 selecting two interests lists both in the summary, and all five can be selected', async () => {
    serveDetails(group())
    await openReview()
    expect(within(await header('Interests')).getByText('None')).toBeInTheDocument()
    await open('Interests')
    for (const name of ['Local activities', 'Food and drink'])
      await userEvent.click(screen.getByRole('row', { name }))
    await userEvent.click(await header('Interests'))
    expect(within(await header('Interests')).getByText('Food and drink, Local activities')).toBeInTheDocument()
    await userEvent.click(await header('Interests'))
    for (const name of ['History and culture', 'Lake and mountains', 'Shopping and keepsakes'])
      await userEvent.click(screen.getByRole('row', { name }))
    await waitFor(() => expect(groupPatches().at(-1)?.body).toEqual({ interests: ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'] }), SLOW)
  }, 40000)

  it('[E4.3][AC30] deselecting the last interest sends []', async () => {
    serveDetails(group({ interests: ['food-drink'] }))
    await openReview()
    await open('Interests')
    await userEvent.click(screen.getByRole('row', { name: 'Food and drink' }))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ interests: [] })
  }, 30000)

  it('[E4.3][AC30] AC-6 the German version shows the same choices', async () => {
    serveDetails(group({ stayTag: 'short_stay', interests: ['food-drink'] }))
    await openReview('&lang=de')
    await open('Stay')
    await open('Interests')
    expect(screen.getByRole('radio', { name: /Short stay/ })).toBeChecked()
    expect(screen.getByRole('row', { name: 'Food and drink' })).toHaveAttribute('aria-selected', 'true')
  }, 30000)
})
