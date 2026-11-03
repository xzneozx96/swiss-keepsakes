import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, patches, posts, renderStoryEditor, servePublish, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-publish-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// The laptop layout shows the card, the checks and the Details cards together. The phone layout is in stories-review-layout.test.tsx.
const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`
const storeBase = `/api/store/${storeId}`

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const ready = (over: Record<string, unknown> = {}) => storyVersion('en', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }), ...over })
const empty = (over: Record<string, unknown> = {}) => storyVersion('en', { slug: null, draft: storyDoc({ title: '', excerpt: '', coverMediaId: null }), ...over })
const category = { categoryIds: [uuid(900)] }
const body = (...content: object[]) => ({ type: 'doc', content })

async function openReview() {
  const router = renderStoryEditor(`${path}?screen=review`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

const row = (code: string) => document.querySelector(`[data-check="${code}"]`)
const rows = () => Array.from(document.querySelectorAll('[data-check]'), element => element.getAttribute('data-check'))
const publishButton = () => screen.findByRole('button', { name: 'Publish English' }, SLOW)

describe('[E4.3][AC30][AC45] the publish checks on Review', () => {
  it('[E4.3][AC30] AC-2 an empty draft lists "4 things stop publishing" with the four sentences, Publish is off and "Fix what stops publishing first." shows', async () => {
    servePublish(storyGroupDetail({ en: empty() }))
    await openReview()

    expect(await screen.findByText('4 things stop publishing', undefined, SLOW)).toBeInTheDocument()
    for (const text of ['Add a cover photo.', 'Add a title.', 'Add a short summary.', 'Set the story’s link.'])
      expect(screen.getByText(text)).toBeInTheDocument()
    expect(await publishButton()).toBeDisabled()
    expect(screen.getByText('Fix what stops publishing first.')).toBeInTheDocument()
  }, 20000)

  it.each([
    ['cover', 'Add a cover photo.', ready({ draft: storyDoc({ coverMediaId: null }) })],
    ['title', 'Add a title.', ready({ draft: storyDoc({ title: '', coverMediaId: coverId }) })],
    ['excerpt', 'Add a short summary.', ready({ draft: storyDoc({ excerpt: '', coverMediaId: coverId }) })],
    ['link', 'Set the story’s link.', ready({ slug: null })],
  ])('[E4.3][AC30] AC-2 a draft that lacks only the %s lists only that sentence under "1 thing stops publishing"', async (code, text, version) => {
    servePublish(storyGroupDetail({ en: version }, category))
    await openReview()

    expect(await screen.findByText('1 thing stops publishing', undefined, SLOW)).toBeInTheDocument()
    expect(within(row(code) as HTMLElement).getByText(text)).toBeInTheDocument()
    expect(rows().filter(item => item !== 'other-language')).toEqual([code])
  }, 20000)

  it('[E4.3][AC30] AC-2 an editorial review with no place and no check date lists both extra sentences', async () => {
    servePublish(storyGroupDetail({ en: ready() }, { kind: 'editorial_review' }))
    await openReview()

    expect(await screen.findByText('Choose the place this review is about.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Add the day the facts were checked.')).toBeInTheDocument()
    expect(screen.getByText('2 things stop publishing')).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-3 with all four met, an empty body, a photo with no description and no blog category the heading says "Ready to publish", the warnings sit under "3 to look at (publishing still works)" and Publish is on', async () => {
    servePublish(storyGroupDetail({
      en: ready({ draft: storyDoc({ coverMediaId: coverId, body: body({ type: 'image', attrs: { mediaId: coverId } }) }) }),
      de: storyVersion('de'),
    }))
    await openReview()

    expect(await screen.findByText('Ready to publish', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText('3 to look at (publishing still works)')).toBeInTheDocument()
    expect(rows()).toEqual(['no-alt', 'no-caption', 'no-category'])
    expect(screen.getByText('Cover, title, short summary and link are all set. The other language is never required.')).toBeInTheDocument()
    expect(await publishButton()).toBeEnabled()
  }, 20000)

  it('[E4.3][AC30] AC-1 with only English ready, the German warning reads "No Deutsch version yet: those readers see this one with a language notice." and Publish English works', async () => {
    servePublish(storyGroupDetail({ en: ready() }, category))
    await openReview()

    expect(await screen.findByText('No Deutsch version yet: those readers see this one with a language notice.', undefined, SLOW)).toBeInTheDocument()
    await userEvent.click(await publishButton())
    await waitFor(() => expect(posts('/versions/en/publish')).toHaveLength(1), SLOW)
  }, 20000)

  it('[E4.3][AC30] AC-4 the API answers 422 publish-incomplete naming coverMediaId: "Add a cover photo." shows as blocking, Publish is off, no version in the group query changed', async () => {
    servePublish(storyGroupDetail({ en: ready(), de: storyVersion('de') }, category), call => (call.method === 'POST' && call.path.endsWith('/publish')
      ? Response.json({ type: 'publish-incomplete', status: 422, title: 'x', instance: '/x', requestId: 'req-1', errors: [{ in: 'body', path: 'coverMediaId', message: 'x' }] }, { status: 422 })
      : undefined))
    await openReview()
    expect(rows()).not.toContain('cover')
    await userEvent.click(await publishButton())

    expect(await screen.findByText('Add a cover photo.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText('1 thing stops publishing')).toBeInTheDocument()
    expect(await publishButton()).toBeDisabled()
    expect(posts('/publish')).toHaveLength(1)
    expect(screen.queryByText(/Published \d/)).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-4 the server\'s gap clears when the merchant edits anything', async () => {
    servePublish(storyGroupDetail({ en: ready(), de: storyVersion('de') }, category), call => (call.method === 'POST' && call.path.endsWith('/publish')
      ? Response.json({ type: 'publish-incomplete', status: 422, title: 'x', instance: '/x', requestId: 'req-1', errors: [{ in: 'body', path: 'coverMediaId', message: 'x' }] }, { status: 422 })
      : undefined))
    await openReview()
    await userEvent.click(await publishButton())
    await userEvent.click(within(await waitForRow('cover')).getByRole('button', { name: 'Edit' }))
    const title = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(title)
    await userEvent.keyboard('{End}!')
    await userEvent.click(screen.getByRole('button', { name: /^Review/ }))
    await screen.findByText('Ready to publish', undefined, SLOW)
    expect(rows()).not.toContain('cover')
    expect(patches()).toHaveLength(1)
  }, 30000)

  it.each([
    ['title', 'Add a title.', 'Add a title to publish.'],
    ['cover', 'Add a cover photo.', undefined],
  ])('[E4.3][AC30] Edit on the %s check goes to Write with the error showing and the field in view', async (code, text, error) => {
    const scrolled = vi.fn()
    const original = HTMLElement.prototype.scrollIntoView

    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled(this.id)
    }
    try {
      servePublish(storyGroupDetail({ en: empty() }))
      await openReview()
      const item = await waitForRow(code)

      expect(within(item).getByText(text)).toBeInTheDocument()
      await userEvent.click(within(item).getByRole('button', { name: 'Edit' }))

      expect(await screen.findByRole('textbox', { name: /^Title/ }, SLOW)).toBeInTheDocument()
      if (error)
        expect(await screen.findByText(error)).toBeInTheDocument()
      else
        expect(screen.getByRole('button', { name: /Add a cover photo/ })).toHaveClass('border-danger')
      await waitFor(() => expect(scrolled).toHaveBeenCalledWith(`write-${code}`), SLOW)
    }
    finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  }, 20000)

  it('[E4.3] a related story with no published English version warns once the list has loaded, and nothing shows while it loads', async () => {
    const related = uuid(501)
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    servePublish(storyGroupDetail({ en: ready(), de: storyVersion('de') }, { ...category, relatedGroupIds: [related] }), call => (call.method === 'GET' && call.path === `${storeBase}/story-groups`
      ? held.then(() => Response.json({ items: [{ groupId: related, kind: 'story', title: { de: 'Kapellbrücke' }, cover: null, languages: { en: null, de: { status: 'published', everPublished: true, editsNotLive: false, rowVersion: 1, updatedAt: '2026-11-03T08:00:00.000Z' } }, updatedAt: '2026-11-03T08:00:00.000Z' }] })) as never
      : undefined))
    await openReview()
    await screen.findByText('Ready to publish', undefined, SLOW)
    expect(rows()).toEqual([])
    await act(async () => release())

    expect(await screen.findByText('“Kapellbrücke” has no published English version, so readers of this version will not see it.', undefined, SLOW)).toBeInTheDocument()
    expect(rows()).toEqual(['related-language'])
  }, 20000)

  it('[E4.3] a keepsake that is not published warns by name', async () => {
    const keepsake = uuid(601)

    servePublish(storyGroupDetail({ en: ready(), de: storyVersion('de') }, { ...category, keepsakeProductIds: [keepsake] }), call => (call.method === 'GET' && call.path === `${storeBase}/products`
      ? Response.json({ items: [{ id: keepsake, name: { en: 'Pocket knife' }, optionNames: [], status: 'draft', hasUnpublishedEdits: false, hasOrders: false, rowVersion: 1, cover: null, variantCount: 1, soldOutCount: 0, updatedAt: '2026-11-03T08:00:00.000Z' }] })
      : undefined))
    await openReview()

    expect(await screen.findByText('Pocket knife is not published and stays hidden on the story.', undefined, SLOW)).toBeInTheDocument()
  }, 20000)

  it('[E4.3] a pin that the body links to and is not published warns by name', async () => {
    const pin = uuid(701)
    const linked = body({ type: 'paragraph', content: [{ type: 'text', text: 'wall', marks: [{ type: 'pinLink', attrs: { pinId: pin } }] }] })

    servePublish(storyGroupDetail({ en: ready({ draft: storyDoc({ coverMediaId: coverId, body: linked }) }), de: storyVersion('de') }, category), call => (call.method === 'GET' && call.path === `${storeBase}/pins`
      ? Response.json({ items: [{ id: pin, status: 'draft', title: { en: 'Museggmauer' }, slug: null, located: true, categoryIds: [], hasDates: false, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, cover: null, mainStory: null, rowVersion: 1 }] })
      : undefined))
    await openReview()

    expect(await screen.findByText('The pin Museggmauer is not published, so its link shows as plain text.', undefined, SLOW)).toBeInTheDocument()
  }, 20000)

  it('[E4.3] a group that names nothing sends no list reads', async () => {
    servePublish(storyGroupDetail({ en: ready(), de: storyVersion('de') }, category))
    await openReview()
    await screen.findByText('Ready to publish', undefined, SLOW)

    expect(state.calls.filter(call => call.method === 'GET' && (call.path === `${storeBase}/story-groups` || call.path === `${storeBase}/products` || call.path === `${storeBase}/pins`))).toEqual([])
  }, 20000)
})

async function waitForRow(code: string) {
  await waitFor(() => expect(row(code)).not.toBeNull(), SLOW)

  return row(code) as HTMLElement
}
