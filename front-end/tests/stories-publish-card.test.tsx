import { toast } from '@heroui/react'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, patches, posts, problem, PUBLISHED_AT, renderStoryEditor, servePublish, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion } from './stories-publish-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// The laptop layout shows the card, the checks and the Details cards together. The phone layout is in stories-review-layout.test.tsx.
const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }
const path = `/store/content/articles/${groupId}`
const base = `/api/store/${storeId}/story-groups/${groupId}`

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

/** An English version with a cover, a title, an excerpt and a link: nothing blocks publishing it. */
const ready = (over: Record<string, unknown> = {}) => storyVersion('en', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }), ...over })
const published = (over: Record<string, unknown> = {}) => ready({ status: 'published', draft: null, published: storyDoc({ coverMediaId: coverId }), publishedAt: PUBLISHED_AT, rowVersion: 5, ...over })

async function openReview(search = '?screen=review') {
  const router = renderStoryEditor(`${path}${search}`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

const button = (name: string | RegExp) => screen.findByRole('button', { name }, SLOW)

describe('[E4.3][AC30][AC45] the publish card', () => {
  it('[E4.3][AC30] AC-1 a story ready in English publishes English only, the toast names it, and the card shows Published with German as Not started', async () => {
    const success = vi.spyOn(toast, 'success')

    servePublish(storyGroupDetail({ en: ready() }))
    await openReview()
    await userEvent.click(await button('Publish English'))

    await waitFor(() => expect(posts('/versions/en/publish')).toHaveLength(1), SLOW)
    expect(posts('/versions/de/publish')).toHaveLength(0)
    expect(posts('/versions/en/publish')[0]).toMatchObject({ ifMatch: '3' })
    await waitFor(() => expect(success).toHaveBeenCalledWith('English version published. Guests see it within about a minute.'), SLOW)
    expect(await screen.findByText(/^English · Published \d/, undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Deutsch.*Not started/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish English' })).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC45] AC-5 a live version with edits not yet live shows Publish changes (EN) above Unpublish, and pressing it POSTs publish with the current row version', async () => {
    servePublish(storyGroupDetail({ en: published({ draft: storyDoc({ title: 'New title', coverMediaId: coverId }) }) }))
    await openReview()
    const changes = await button('Publish changes (EN)')
    const unpublish = await button('Unpublish')

    expect(changes.compareDocumentPosition(unpublish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.click(changes)
    await waitFor(() => expect(posts('/versions/en/publish')).toHaveLength(1), SLOW)
    expect(posts('/versions/en/publish')[0]).toMatchObject({ ifMatch: '5' })
  }, 20000)

  it('[E4.3][AC45] AC-5 a live version with nothing pending shows Unpublish only', async () => {
    servePublish(storyGroupDetail({ en: published() }))
    await openReview()

    expect(await button('Unpublish')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC45] AC-5 Unpublish asks first: the dialog says what happens, confirming POSTs unpublish and the toast says it is a draft again; Cancel sends nothing', async () => {
    const success = vi.spyOn(toast, 'success')

    servePublish(storyGroupDetail({ en: published() }))
    await openReview()
    await userEvent.click(await button('Unpublish'))
    const dialog = await screen.findByRole('alertdialog', undefined, SLOW)

    expect(within(dialog).getByText('Unpublish the English version?')).toBeInTheDocument()
    expect(within(dialog).getByText(/^Guests stop seeing it at once/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(posts('/unpublish')).toHaveLength(0)

    await userEvent.click(await button('Unpublish'))
    await userEvent.click(within(await screen.findByRole('alertdialog', undefined, SLOW)).getByRole('button', { name: 'Unpublish' }))
    await waitFor(() => expect(posts('/versions/en/unpublish')).toHaveLength(1), SLOW)
    expect(posts('/versions/en/unpublish')[0]).toMatchObject({ ifMatch: '5' })
    await waitFor(() => expect(success).toHaveBeenCalledWith('English version is a draft again.'), SLOW)
    expect(await button('Publish English')).toBeInTheDocument()
  }, 25000)

  it('[E4.3][AC45] AC-5 an unpublished version (status draft, published kept, no draft) shows Publish English, not Publish changes', async () => {
    servePublish(storyGroupDetail({ en: published({ status: 'draft' }) }))
    await openReview()

    expect(await button('Publish English')).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Publish changes/ })).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC45] after a publish the next autosave carries the row version the publish returned', async () => {
    servePublish(storyGroupDetail({ en: ready() }))
    await openReview()
    await userEvent.click(await button('Publish English'))
    await screen.findByText(/^English · Published \d/, undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    const title = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(title)
    await userEvent.keyboard('{End}!')
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]).toMatchObject({ ifMatch: '4' })
  }, 30000)

  it('[E4.3][AC45] typed edits are saved before publish: a PATCH, then the POST with the version it returned', async () => {
    servePublish(storyGroupDetail({ en: ready() }))
    renderStoryEditor(path)
    const title = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(title)
    await userEvent.keyboard('{End}!')
    await userEvent.click(screen.getByRole('button', { name: /^Review/ }))
    await userEvent.click(await button('Publish English'))
    await waitFor(() => expect(posts('/versions/en/publish')).toHaveLength(1), SLOW)
    expect(patches()).toHaveLength(1)
    expect(patches()[0]).toMatchObject({ ifMatch: '3' })
    expect(posts('/versions/en/publish')[0]).toMatchObject({ ifMatch: '4' })
    expect(state.calls.findIndex(call => call.method === 'PATCH')).toBeLessThan(state.calls.findIndex(call => call.path.endsWith('/publish')))
  }, 30000)

  it('[E4.3][AC45] a 412 on publish shows the stale notice on Review and sends nothing more', async () => {
    servePublish(storyGroupDetail({ en: ready() }), call => (call.method === 'POST' && call.path.endsWith('/publish') ? problem(412, 'precondition-failed') : undefined))
    await openReview()
    await userEvent.click(await button('Publish English'))

    // This server does not answer the category list, so the Blog categories card also shows its own alert: the notice is found by its text.
    expect(await screen.findByText(/Someone saved this after you opened it/, undefined, SLOW)).toBeInTheDocument()
    expect(posts('/publish')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Publish English' }))
    expect(posts('/publish')).toHaveLength(1)
  }, 20000)

  it('[E4.3][AC45] a second press while the first runs sends one request', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    servePublish(storyGroupDetail({ en: ready() }), call => (call.method === 'POST' && call.path.endsWith('/publish') ? (held.then(() => Response.json(storyVersion('en', { status: 'published', slug: 'musegg', draft: null, published: storyDoc({ coverMediaId: coverId }), publishedAt: PUBLISHED_AT, rowVersion: 4 }))) as never) : undefined))
    await openReview()
    const publish = await button('Publish English')

    await userEvent.click(publish)
    await userEvent.click(publish)
    await waitFor(() => expect(posts('/publish')).toHaveLength(1), SLOW)
    expect(publish).toBeDisabled()
    await act(async () => release())
    await screen.findByText(/^English · Published \d/, undefined, SLOW)
    expect(posts('/publish')).toHaveLength(1)
  }, 20000)

  it('[E4.3][AC30] the card\'s language switch starts the German version when chosen, and the card then shows German', async () => {
    servePublish(storyGroupDetail({ en: ready() }))
    const router = await openReview()

    await userEvent.click(await screen.findByRole('tab', { name: /Deutsch/ }, SLOW))
    expect(await button('Publish Deutsch')).toBeInTheDocument()
    expect(posts('/versions').filter(call => call.path === `${base}/versions`)).toHaveLength(1)
    expect(router.state.location.search).toMatchObject({ lang: 'de', screen: 'review' })
  }, 20000)

  it('[E4.3][AC30] a published version\'s line reads Published {date} from publishedAt', async () => {
    servePublish(storyGroupDetail({ en: published() }))
    await openReview()

    expect(await screen.findByText(/^English · Published \d{1,2}[./]\d{1,2}[./]2026$/, undefined, SLOW)).toBeInTheDocument()
  }, 20000)
})
