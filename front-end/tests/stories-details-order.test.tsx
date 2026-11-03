import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { categoryItem, coverId, groupId, renderStoryEditor, serveDetails, setUpHarness, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-details-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`
const history = uuid(901)

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const version = (language: 'en' | 'de') => storyVersion(language, { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })

function serve(over: Record<string, unknown> = {}) {
  const server = serveDetails(storyGroupDetail({ en: version('en'), de: version('de') }, over))

  server.categories = [categoryItem(history, 'Swiss history', 'Schweizer Geschichte')]

  return server
}

async function openReview(search = '') {
  renderStoryEditor(`${path}?screen=review${search}`)
  await screen.findAllByText('Review and publish', undefined, SLOW)
  await screen.findByRole('button', { name: /^Stay/ }, SLOW)
}

const cardIds = () => Array.from(document.querySelectorAll('section[id^="details-"]'), node => node.id)

describe('[E4.3][AC30][AC87] the order and jumps of the Details cards', () => {
  it('[E4.3][AC30] the cards render in design order: Link, Blog categories, Places, Stay, Interests, Keepsakes, More to discover (Editorial review goes after Link)', async () => {
    serve()
    await openReview()
    // The Editorial review card (T-E4.3f Task 8, waiting on D1 to D3) takes the slot between Link and Blog categories.
    expect(cardIds()).toEqual(['details-link', 'details-categories', 'details-pins', 'details-stay', 'details-interests', 'details-keepsakes', 'details-related'])
  }, 20000)

  it('[E4.3][AC87] the Blog categories card opens by default with the "To look at" icon for a story with no category', async () => {
    serve()
    await openReview()
    const header = screen.getByRole('button', { name: /^Blog categories/ })

    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(within(header).getByLabelText('To look at')).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC87] a story with categories keeps the card closed, with the names as the summary and no icon', async () => {
    serve({ categoryIds: [history] })
    await openReview()
    const header = screen.getByRole('button', { name: /^Blog categories/ })

    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(within(header).getByText('Swiss history')).toBeInTheDocument()
    expect(within(header).queryByLabelText('To look at')).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] Show on the "No blog category" warning opens the card and scrolls to details-categories', async () => {
    const scrolled = vi.fn()
    const original = HTMLElement.prototype.scrollIntoView

    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled(this.id)
    }
    try {
      serve()
      await openReview()
      const header = screen.getByRole('button', { name: /^Blog categories/ })

      await userEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(within(document.querySelector('[data-check="no-category"]') as HTMLElement).getByRole('button', { name: 'Show' }))
      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(scrolled).toHaveBeenCalledWith('details-categories')
    }
    finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  }, 30000)

  it('[E4.3][AC30] the phone layout shows the cards under the Details tab', async () => {
    view.wide = false
    serve()
    await openReview()
    expect(cardIds()).toEqual(['details-link', 'details-categories', 'details-pins', 'details-stay', 'details-interests', 'details-keepsakes', 'details-related'])
    await userEvent.click(screen.getByRole('tab', { name: 'Preview' }))
    await waitFor(() => expect(cardIds()).toEqual([]), SLOW)
  }, 30000)

  it('[E4.3][AC30] AC-6 the same categories, stay and interests show after switching to German', async () => {
    serve({ categoryIds: [history], stayTag: 'multi_day', interests: ['food-drink'] })
    await openReview()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    const stay = await screen.findByRole('button', { name: /^Stay/ }, SLOW)

    expect(within(stay).getByText('Multi-day')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /^Blog categories/ })).getByText('Schweizer Geschichte')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /^Interests/ })).getByText('Food and drink')).toBeInTheDocument()
  }, 30000)
})
