import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, patches, problem, renderStoryEditor, servePublish, setUpHarness, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-publish-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// The laptop layout shows the card, the checks and the Details cards together. The phone layout is in stories-review-layout.test.tsx.
const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }
const path = `/store/content/articles/${groupId}`

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const doc = () => storyDoc({ coverMediaId: coverId })
const english = (over: Record<string, unknown> = {}) => storyVersion('en', { slug: 'musegg-wall', draft: doc(), ...over })
const german = (over: Record<string, unknown> = {}) => storyVersion('de', { slug: null, draft: doc(), ...over })
const group = (versions: Parameters<typeof storyGroupDetail>[0]) => storyGroupDetail(versions, { categoryIds: [uuid(900)] })
const slugPatches = () => patches().filter(call => !('draft' in (call.body as object)))

async function openReview(search = '') {
  const router = renderStoryEditor(`${path}?screen=review${search}`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

const field = () => screen.findByRole('textbox', { name: /^Link/ }, SLOW)

describe('[E4.3][AC30][AC45] the Details panel and the Link card', () => {
  it('[E4.3][AC30] cards open by default when a check targets them: the Link card is open for a story with no link and closed (with its path as the summary) when the link is set', async () => {
    servePublish(group({ en: english({ slug: null }) }))
    await openReview()
    expect(await field()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Link/ })).toHaveAttribute('aria-expanded', 'true')
  }, 20000)

  it('[E4.3][AC30] a link that is set keeps the card closed and its path is the summary', async () => {
    servePublish(group({ en: english() }))
    await openReview()
    const header = await screen.findByRole('button', { name: /^Link/ }, SLOW)

    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(within(header).getByText('/en/stories/musegg-wall')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /^Link/ })).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] pressing Edit on the link check opens a closed Link card and puts it in view', async () => {
    const scrolled = vi.fn()
    const original = HTMLElement.prototype.scrollIntoView

    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled(this.id)
    }
    try {
      servePublish(group({ en: english({ slug: null }) }))
      await openReview()
      const header = await screen.findByRole('button', { name: /^Link/ }, SLOW)

      await userEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(within(document.querySelector('[data-check="link"]') as HTMLElement).getByRole('button', { name: 'Edit' }))

      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(await field()).toBeInTheDocument()
      expect(scrolled).toHaveBeenCalledWith('details-link')
    }
    finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  }, 20000)

  it('[E4.3][AC30] AC-6 an English slug "musegg-wall" and an empty German link: on the German version the card offers Use “musegg-wall”, pressing it PATCHes {slug} to de with the German row version and no draft, and the link check disappears', async () => {
    servePublish(group({ en: english(), de: german() }))
    await openReview('&lang=de')
    expect(await screen.findByText('Set the story’s link.', undefined, SLOW)).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Use “musegg-wall”' }, SLOW))

    await waitFor(() => expect(slugPatches()).toHaveLength(1), SLOW)
    expect(slugPatches()[0]).toMatchObject({ path: expect.stringMatching(/\/versions\/de$/), ifMatch: '3', body: { slug: 'musegg-wall' } })
    expect(slugPatches()[0]!.body).not.toHaveProperty('draft')
    await waitFor(() => expect(screen.queryByText('Set the story’s link.')).not.toBeInTheDocument(), SLOW)
    expect(screen.queryByRole('button', { name: /^Use “/ })).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-6 either language\'s link can be changed: typing "Neue Wege" and leaving the field saves "neue-wege"; the field keeps the raw text while typing', async () => {
    servePublish(group({ en: english({ slug: null }) }))
    await openReview()
    const input = await field()

    await userEvent.click(input)
    await userEvent.keyboard('musegg-')
    expect(input).toHaveValue('musegg-')
    await userEvent.clear(input)
    await userEvent.keyboard('Neue Wege')
    expect(input).toHaveValue('Neue Wege')
    await userEvent.tab()

    await waitFor(() => expect(slugPatches()).toHaveLength(1), SLOW)
    expect(slugPatches()[0]).toMatchObject({ body: { slug: 'neue-wege' } })
    await waitFor(() => expect(input).toHaveValue('neue-wege'), SLOW)
  }, 20000)

  it('[E4.3][AC30] AC-6 the same slug in both languages reads "The same link for English and German."; different slugs read "The Deutsch version has its own link."', async () => {
    servePublish(group({ en: english(), de: german({ slug: 'musegg-wall' }) }))
    await openReview('&lang=de')
    await userEvent.click(await screen.findByRole('button', { name: /^Link/ }, SLOW))
    expect(await screen.findByText('The same link for English and German.', undefined, SLOW)).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-6 different slugs read "The Deutsch version has its own link."', async () => {
    servePublish(group({ en: english(), de: german({ slug: 'ein-morgen' }) }))
    await openReview('&lang=de')
    await userEvent.click(await screen.findByRole('button', { name: /^Link/ }, SLOW))
    expect(await screen.findByText('The Deutsch version has its own link.', undefined, SLOW)).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-6 two stories with one English link: the API answers 409 content-slug-taken and "That link is already used." shows at the field, the saved slug is restored and the autosave is not in failed', async () => {
    servePublish(group({ en: english() }), call => (call.method === 'PATCH' ? problem(409, 'content-slug-taken') : undefined))
    await openReview()
    await userEvent.click(await screen.findByRole('button', { name: /^Link/ }, SLOW))
    const input = await field()

    await userEvent.clear(input)
    await userEvent.keyboard('taken-one')
    await userEvent.tab()

    expect(await screen.findByText('That link is already used. Choose another.', undefined, SLOW)).toBeInTheDocument()
    await waitFor(() => expect(input).toHaveValue('musegg-wall'), SLOW)
    expect(screen.queryByText('Not saved')).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] clearing the link of a live version answers 422 publish-incomplete and the field says "A live story needs a link."; clearing a draft\'s link sends slug null and the check returns', async () => {
    servePublish(group({ en: english({ status: 'published', draft: null, published: doc(), publishedAt: '2026-11-03T10:00:00.000Z', rowVersion: 5 }) }), call => (call.method === 'PATCH'
      ? Response.json({ type: 'publish-incomplete', status: 422, title: 'x', instance: '/x', requestId: 'req-1' }, { status: 422 })
      : undefined))
    await openReview()
    await userEvent.click(await screen.findByRole('button', { name: /^Link/ }, SLOW))
    const input = await field()

    expect(screen.getByText('This version is live. Changing the link breaks the old one.')).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.tab()
    expect(await screen.findByText('A live story needs a link.', undefined, SLOW)).toBeInTheDocument()
    await waitFor(() => expect(input).toHaveValue('musegg-wall'), SLOW)
  }, 20000)

  it('[E4.3][AC30] clearing a draft\'s link sends slug null and the check returns', async () => {
    servePublish(group({ en: english() }))
    await openReview()
    await userEvent.click(await screen.findByRole('button', { name: /^Link/ }, SLOW))
    await userEvent.clear(await field())
    await userEvent.tab()

    await waitFor(() => expect(slugPatches()).toHaveLength(1), SLOW)
    expect(slugPatches()[0]).toMatchObject({ body: { slug: null } })
    expect(await screen.findByText('Set the story’s link.', undefined, SLOW)).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC45] saving the link bumps the row version once: a title typed right after saves with the version the link save returned', async () => {
    servePublish(group({ en: english({ slug: null }) }))
    await openReview()
    const input = await field()

    await userEvent.click(input)
    await userEvent.keyboard('new-link')
    await userEvent.tab()
    await waitFor(() => expect(slugPatches()).toHaveLength(1), SLOW)
    expect(slugPatches()[0]).toMatchObject({ ifMatch: '3' })
    await waitFor(() => expect(input).toHaveValue('new-link'))
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    const title = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(title)
    await userEvent.keyboard('{End}!')
    await waitFor(() => expect(patches()).toHaveLength(2), AUTOSAVE)
    expect(patches()[1]).toMatchObject({ ifMatch: '4', body: { draft: { title: expect.stringMatching(/!$/) } } })
  }, 30000)

  it('[E4.3][AC30] the Details heading says "Shared by English and Deutsch." and the panel cannot be closed (only its cards)', async () => {
    servePublish(group({ en: english() }))
    await openReview()

    expect(await screen.findByRole('heading', { name: 'Details' }, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Shared by English and Deutsch.')).toBeInTheDocument()
    for (const control of document.querySelectorAll('[aria-expanded]'))
      expect(control.getAttribute('aria-controls') ?? control.textContent).toMatch(/details-|Link/)
  }, 20000)
})
