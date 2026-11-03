import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, groupPatches, patches, problem, renderStoryEditor, serveDetails, setUpHarness, state, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-details-harness'

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

const english = () => storyVersion('en', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })
const german = () => storyVersion('de', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })
const group = (over: Record<string, unknown> = {}) => storyGroupDetail({ en: english(), de: german() }, over)

async function openReview() {
  const router = renderStoryEditor(`${path}?screen=review`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

/** Opens the Stay card and picks Multi-day: the one group change a card makes until the others are built on the same hook. */
async function pickMultiDay() {
  const header = await screen.findByRole('button', { name: /^Stay/ }, SLOW)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)
  await userEvent.click(screen.getByRole('radio', { name: /Multi-day/ }))
}

describe('[E4.3][AC30][AC87] the group editor in the editor and the Review screen', () => {
  it('[E4.3][AC87] AC-3 a story with no category warns and publishing is allowed', async () => {
    serveDetails(group())
    await openReview()
    expect(await screen.findAllByText('No blog category: the story shows only under All.', undefined, SLOW)).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Publish English' })).toBeEnabled()
  }, 20000)

  it('[E4.3][AC87] Review Focus 2: Back with an unsaved group change opens the leave dialog', async () => {
    // The answer is held back, so the change is still unsaved (saving) when Back is pressed.
    serveDetails(group({ categoryIds: [uuid(900)] })).groupGate = new Promise<void>(() => {})
    await openReview()
    await pickMultiDay()
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Back to Stories' }, SLOW))
    expect(await screen.findByText('Leave without saving?', undefined, SLOW)).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] Review Focus 2: choosing the other language saves a pending group change first', async () => {
    const server = serveDetails(group({ categoryIds: [uuid(900)] }))

    await openReview()
    await pickMultiDay()
    // How many group PATCHes were out at the moment the language changed.
    let sentWhenSwitched: number | undefined

    state.router!.subscribe('onBeforeNavigate', ({ toLocation }) => {
      if ((toLocation.search as { lang?: string }).lang === 'de')
        sentWhenSwitched = groupPatches().length
    })
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await waitFor(() => expect(state.router!.state.location.search).toMatchObject({ lang: 'de' }), SLOW)
    await waitFor(() => expect(server.group.stayTag).toBe('multi_day'), SLOW)
    expect(sentWhenSwitched).toBe(1)
  }, 30000)

  it('[E4.3][AC30] Review Focus 2: Publish with a pending group change sends the group PATCH, then the publish POST', async () => {
    serveDetails(group({ categoryIds: [uuid(900)] }))
    await openReview()
    await pickMultiDay()
    await userEvent.click(screen.getByRole('button', { name: 'Publish English' }))
    await waitFor(() => expect(state.calls.some(call => call.method === 'POST' && call.path.endsWith('/versions/en/publish'))).toBe(true), SLOW)
    const order = state.calls.filter(call => (call.method === 'PATCH' && call.path.endsWith(groupId)) || call.path.endsWith('/en/publish')).map(call => call.method)

    expect(order).toEqual(['PATCH', 'POST'])
  }, 30000)

  it('[E4.3][AC87] a 412 on the group shows the stale notice and keeps the choice', async () => {
    serveDetails(group({ categoryIds: [uuid(900)] }), call => (call.method === 'PATCH' && call.path.endsWith(groupId) ? problem(412, 'precondition-failed') : undefined))
    await openReview()
    await pickMultiDay()
    expect(await screen.findByText(/Someone saved this after you opened it/, undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Multi-day/ })).toBeChecked()
    expect(patches().filter(call => call.path.includes('/versions/'))).toHaveLength(0)
  }, 30000)
})
