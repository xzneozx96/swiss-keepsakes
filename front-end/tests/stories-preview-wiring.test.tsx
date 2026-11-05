import { mediaSchema } from '@sk/api-contract'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list as keepsakeList, listItem as keepsakeRow, media } from './keepsakes-harness'
import { listItem, listVersion, publishedVersion, storyList } from './stories-harness'
import { coverId, groupId, renderStoryEditor, servePublish, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-publish-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`
const api = `/api/store/${storeId}`

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

interface Lists { keepsakes?: Record<string, unknown>[], stories?: Record<string, unknown>[], pins?: Record<string, unknown>[] }

/** The three lists the preview reads, and the cover file. */
function lists(rows: Lists) {
  return (call: (typeof state.calls)[number]) => {
    if (call.method !== 'GET')
      return undefined
    if (call.path === `${api}/products`)
      return Response.json(keepsakeList(rows.keepsakes ?? []))
    if (call.path.split('?')[0] === `${api}/story-groups/lookup`)
      return Response.json(storyList(rows.stories ?? []))
    if (call.path.split('?')[0] === `${api}/pins/lookup`)
      return Response.json({ items: rows.pins ?? [] })
    if (call.path === `${api}/media/${coverId}`)
      return Response.json(mediaSchema.parse({ ...media, id: coverId }))

    return undefined
  }
}

const english = () => storyVersion('en', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })
const german = () => storyVersion('de', { slug: 'musegg-de', draft: storyDoc({ title: 'Ein Morgen auf der Museggmauer', coverMediaId: coverId }) })

async function openReview() {
  const router = renderStoryEditor(`${path}?screen=review`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

const previewTitle = (name: string) => screen.findByRole('heading', { level: 1, name }, SLOW)
const groupReads = () => state.calls.filter(call => call.method === 'GET' && call.path === `${api}/story-groups/${groupId}`)

describe('[E4.3][AC30][AC33][AC45][AC54] the Review preview', () => {
  it('shows the German version with German labels after the publish card switches language (AC-6)', async () => {
    servePublish(storyGroupDetail({ en: english(), de: german() }, { relatedGroupIds: [uuid(2)] }), lists({ stories: [listItem(2, { languages: { en: publishedVersion(), de: publishedVersion() }, title: { en: 'Old Town', de: 'Altstadt' } })] }))
    await openReview()
    await previewTitle('A morning on the Musegg wall')
    await userEvent.click(await screen.findByRole('tab', { name: /Deutsch/ }, SLOW))

    expect(await previewTitle('Ein Morgen auf der Museggmauer')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Mehr entdecken' }, SLOW)).toBeInTheDocument()
  }, 25000)

  it('shows an unsaved title edit on Review without reading the group again (AC-6)', async () => {
    servePublish(storyGroupDetail({ en: english() }))
    const router = renderStoryEditor(`${path}`)
    const title = await screen.findByRole('textbox', { name: /title/i }, SLOW)

    await userEvent.clear(title)
    await userEvent.type(title, 'A new title')
    const reads = groupReads().length

    await userEvent.click(await screen.findByRole('button', { name: /review/i }, SLOW))

    expect(await previewTitle('A new title')).toBeInTheDocument()
    expect(groupReads()).toHaveLength(reads)
    expect(router).toBeDefined()
  }, 30000)

  it('lists a related story only when it is published in the open language (AC-4)', async () => {
    servePublish(storyGroupDetail({ en: english() }, { relatedGroupIds: [uuid(2), uuid(3), uuid(4)] }), lists({
      stories: [
        listItem(2, { title: { en: 'Old Town', de: 'Altstadt' }, languages: { en: publishedVersion(), de: null } }),
        listItem(3, { title: { en: 'Only German' }, languages: { en: null, de: publishedVersion() } }),
        listItem(4, { title: { en: 'A draft' }, languages: { en: listVersion(), de: null } }),
      ],
    }))
    await openReview()
    const more = (await screen.findByRole('heading', { name: 'More to discover' }, SLOW)).closest('section')!

    expect(within(more).getAllByRole('listitem')).toHaveLength(1)
    expect(within(more).getByText('Old Town')).toBeInTheDocument()
    expect(screen.queryByText('A draft')).not.toBeInTheDocument()
    expect(screen.queryByText('Only German')).not.toBeInTheDocument()
  }, 25000)

  it('lists the published linked keepsakes with their names and no price (AC-2)', async () => {
    const ids = [uuid(21), uuid(22), uuid(23)]

    servePublish(storyGroupDetail({ en: english() }, { keepsakeProductIds: ids }), lists({
      keepsakes: [
        keepsakeRow({ id: ids[0], name: { en: 'Cowbell' }, status: 'published' }),
        keepsakeRow({ id: ids[1], name: { en: 'Music box' }, status: 'published' }),
        keepsakeRow({ id: ids[2], name: { en: 'Draft thing' }, status: 'draft' }),
      ],
    }))
    await openReview()
    const section = (await screen.findByRole('heading', { name: 'Keepsakes from this story' }, SLOW)).closest('section')!

    expect(within(section).getByText('Cowbell')).toBeInTheDocument()
    expect(within(section).getByText('Music box')).toBeInTheDocument()
    expect(screen.queryByText('Draft thing')).not.toBeInTheDocument()
    expect(section.textContent).not.toContain('CHF')
  }, 25000)

  it('puts the preview in the phone mockup on a laptop and in a plain outline on a phone (AC-1)', async () => {
    servePublish(storyGroupDetail({ en: english() }))
    await openReview()
    await previewTitle('A morning on the Musegg wall')
    expect(screen.getByRole('region', { name: 'Story preview' })).toBeInTheDocument()
  }, 20000)

  it('has no mockup scroller on a phone (AC-1)', async () => {
    view.wide = false
    servePublish(storyGroupDetail({ en: english() }))
    await openReview()
    await userEvent.click(await screen.findByRole('tab', { name: 'Preview' }, SLOW))
    await previewTitle('A morning on the Musegg wall')
    await waitFor(() => expect(document.querySelector('[data-preview-scroll]')).toBeNull())
  }, 20000)
})
