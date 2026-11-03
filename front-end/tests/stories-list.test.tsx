import { toast } from '@heroui/react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Route as ContentRoute } from '@/routes/store/content/index'
import { answerStories, base, listItem, listVersion, media, problem, publishedVersion, renderStories, setUpHarness, state, storeId, uuid } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

beforeEach(setUpHarness)
afterEach(() => vi.restoreAllMocks())

/** A status tab by its label and count; the count is a badge after the label. */
const tab = (label: string, count: number) => screen.getByRole('tab', { name: new RegExp(`^${label}\\s*${count}$`) })
const cellTexts = (row: HTMLElement) => within(row).getAllByRole('gridcell').slice(0, 2).map(cell => cell.textContent.trim())

/** The grid and the card list once `text` is on screen: the loading rows are another element, so wait for the text first. */
async function loaded(text: string) {
  await screen.findAllByText(text)

  return { grid: await screen.findByRole('grid', { name: 'Stories' }), cards: await screen.findByRole('list', { name: 'Stories' }) }
}

const posts = () => state.calls.filter(call => call.method === 'POST' && call.path.startsWith(base))
const rowsOf = (grid: HTMLElement) => within(grid).getAllByRole('row').slice(1)
const titles = (grid: HTMLElement) => rowsOf(grid).map(row => within(row).getByRole('rowheader').textContent)

/** 2 published stories and 3 that only have drafts (the ticket's outline). */
function five() {
  return [
    listItem(1, { title: { en: 'Bridge' }, languages: { en: publishedVersion(), de: null } }),
    listItem(2, { title: { de: 'Brücke' }, languages: { en: null, de: publishedVersion() } }),
    listItem(3, { title: { en: 'Lake' } }),
    listItem(4, { title: { en: 'Mountain' }, languages: { en: listVersion(), de: listVersion() } }),
    listItem(5, { title: { en: 'Old town' }, languages: { en: listVersion({ everPublished: true }), de: null } }),
  ]
}

async function openMenu(name: string) {
  await userEvent.click((await screen.findAllByRole('button', { name: `Actions for ${name}` }))[0]!)
}

describe('[E4.3][AC30] the stories list', () => {
  it('[E4.3][AC30] AC-1 shows the title, the thumbnail and each language state', async () => {
    answerStories([
      listItem(1, { title: { de: 'Die Brücke' }, languages: { en: null, de: publishedVersion() } }),
      listItem(2, { title: { en: 'The lake' }, cover: null }),
    ])
    renderStories()

    const { grid, cards } = await loaded('Die Brücke')
    const [first, second] = rowsOf(grid)

    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Story', 'English', 'Deutsch', 'Last update', 'Actions'])
    expect(within(first!).getByRole('rowheader')).toHaveTextContent('Die Brücke')
    expect(first!.querySelector('img')).toHaveAttribute('src', expect.stringContaining('storage.test'))
    expect(cellTexts(first!)).toEqual(['Not started', 'Published'])
    expect(within(second!).getByRole('rowheader')).toHaveTextContent('The lake')
    expect(cellTexts(second!)).toEqual(['Draft', 'Not started'])
    expect(second!.querySelector('img')).toBeNull()
    expect(within(cards).getAllByRole('listitem')[0]).toHaveTextContent('EN · Not startedDE · Published')
  })

  it('[E4.3][AC30] a story with no title in either language reads Untitled story', async () => {
    answerStories([listItem(1, { title: {} })])
    renderStories()

    const { grid } = await loaded('Untitled story')

    expect(titles(grid)).toEqual(['Untitled story'])
  })

  it('[E4.3][AC30] a cover that is not ready shows the placeholder tile, not an image', async () => {
    answerStories([listItem(1, { cover: { ...media, status: 'processing', publicUrl: null, variants: [] } }), listItem(2, { title: { en: 'Retired cover' }, cover: null })])
    renderStories()

    const { grid, cards } = await loaded('Story 1')

    expect(grid.querySelector('img')).toBeNull()
    expect(cards.querySelector('img')).toBeNull()
  })

  it('[E4.3][AC30] AC-2 the tabs read All 5, Published 2, Drafts 3 and picking one filters the rows', async () => {
    answerStories(five())
    renderStories()

    const { grid } = await loaded('Bridge')

    expect(tab('All', 5)).toBeInTheDocument()
    expect(tab('Published', 2)).toBeInTheDocument()
    expect(tab('Drafts', 3)).toBeInTheDocument()
    expect(rowsOf(grid)).toHaveLength(5)
    await userEvent.click(tab('Published', 2))
    await waitFor(() => expect(titles(grid)).toEqual(['Bridge', 'Brücke']))
    await userEvent.click(tab('Drafts', 3))
    await waitFor(() => expect(titles(grid)).toEqual(['Lake', 'Mountain', 'Old town']))
  })

  it('[E4.3][AC30] AC-2 a search that matches no title says No story matches “zzz”.', async () => {
    answerStories(five())
    renderStories()

    const { grid } = await loaded('Bridge')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by title' }), 'zzz')
    expect((await screen.findAllByText('No story matches “zzz”.')).length).toBeGreaterThan(0)
    expect(within(grid).queryByText('Bridge')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New story' })).toBeInTheDocument()
    expect(tab('All', 0)).toBeInTheDocument()
  })
})

describe('[E4.3][AC30] New story', () => {
  const group = { id: uuid(99), storeId, kind: 'story', subjectPlaceId: null, stayTag: 'both', interests: [], categoryIds: [], placeIds: [], keepsakeProductIds: [], relatedGroupIds: [], rowVersion: 1, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z' }
  const version = { groupId: uuid(99), storeId, language: 'en', status: 'draft', slug: null, draft: null, published: null, publishedAt: null, rowVersion: 1, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z' }

  it('[E4.3][AC30] AC-3 the empty list offers New story, which posts the group and then the English draft and opens the editor route with the new id', async () => {
    answerStories([], call => call.method === 'POST' && call.path === base
      ? Response.json(group, { status: 201 })
      : call.method === 'POST' && call.path === `${base}/${uuid(99)}/versions` ? Response.json(version, { status: 201 }) : undefined)
    const router = renderStories()

    expect((await screen.findAllByText('No stories yet. Start the first one.')).length).toBeGreaterThan(0)
    const [header, empty] = await screen.findAllByRole('button', { name: 'New story' })

    expect(header).toBeInTheDocument()
    await userEvent.click(empty!)

    await waitFor(() => expect(router.state.location.pathname).toBe(`/store/content/articles/${uuid(99)}`))
    expect(posts().map(call => call.path)).toEqual([base, `${base}/${uuid(99)}/versions`])
    expect(posts()[0]).toMatchObject({ body: { kind: 'story' } })
    expect(posts()[1]).toMatchObject({ body: { language: 'en', draft: { title: '', authorName: 'Anna Keller', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } } } })
    expect(posts()[0]!.key).toBeTruthy()
    expect(posts()[1]!.key).toBeTruthy()
    expect(posts()[0]!.key).not.toBe(posts()[1]!.key)
    expect(await screen.findByTestId('at-editor')).toHaveTextContent(uuid(99))
  })

  it('[E4.3][AC30] AC-3 a failed create keeps the list, toasts that the story was not created and adds no row', async () => {
    const danger = vi.spyOn(toast, 'danger')

    answerStories([listItem(1)], call => call.method === 'POST' && call.path === base
      ? Response.json(group, { status: 201 })
      : call.path === `${base}/${uuid(99)}/versions` ? problem(500, 'internal-error') : undefined)
    const router = renderStories()
    const { grid } = await loaded('Story 1')

    await userEvent.click(screen.getAllByRole('button', { name: 'New story' })[0]!)

    await waitFor(() => expect(danger).toHaveBeenCalledExactlyOnceWith('The story was not created. Try again.'))
    expect(router.state.location.pathname).toBe('/store/content')
    expect(titles(grid)).toEqual(['Story 1'])
    expect(rowsOf(grid)).toHaveLength(1)
  })

  it('[E4.3][AC30] AC-3 a second press while the create runs sends nothing more', async () => {
    answerStories([listItem(1)], call => call.method === 'POST' && call.path === base ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderStories()
    await loaded('Story 1')

    const button = screen.getAllByRole('button', { name: 'New story' })[0]!

    await userEvent.click(button)
    await waitFor(() => expect(posts()).toHaveLength(1))
    await userEvent.click(button)
    await userEvent.click(button)
    expect(posts()).toHaveLength(1)
  })
})

describe('[E4.3][AC30] deleting a story that was never published', () => {
  it('[E4.3][AC30] AC-4 a story with a published version has no Delete and says to unpublish it first', async () => {
    answerStories([listItem(1, { title: { en: 'Live' }, languages: { en: publishedVersion(), de: listVersion() } })])
    renderStories()
    await loaded('Live')

    await openMenu('Live')
    expect(await screen.findByRole('menuitem', { name: 'Open' })).toHaveAttribute('href', `/store/content/articles/${uuid(1)}`)
    expect(screen.getByRole('menuitem', { name: 'Unpublish it in the editor first' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-4 a story that was published and then unpublished has no Delete and says it was published once', async () => {
    answerStories([listItem(1, { title: { en: 'Taken down' }, languages: { en: listVersion({ everPublished: true }), de: null } })])
    renderStories()
    const { grid } = await loaded('Taken down')

    // It counts under Drafts, but it cannot be deleted.
    expect(tab('Drafts', 1)).toBeInTheDocument()
    expect(rowsOf(grid)).toHaveLength(1)
    await openMenu('Taken down')
    expect(await screen.findByRole('menuitem', { name: 'Published once, it cannot be deleted' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  const draftStory = () => listItem(1, { title: { en: 'Draft story' }, languages: { en: listVersion({ rowVersion: 3 }), de: listVersion({ rowVersion: 7 }) } })

  it('[E4.3][AC30] AC-4 deleting a draft story in both languages sends one DELETE per version with its row version, shows one success toast, then the row is gone', async () => {
    const success = vi.spyOn(toast, 'success')
    let deleted = false

    answerStories([draftStory()], (call) => {
      if (call.method === 'DELETE') {
        deleted = true

        return new Response(null, { status: 204 })
      }

      return call.method === 'GET' && call.path === base && deleted ? Response.json({ items: [] }) : undefined
    })
    renderStories()
    const { grid } = await loaded('Draft story')

    await openMenu('Draft story')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(within(dialog).getByText('Delete Draft story?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    await waitFor(() => expect(within(grid).queryByText('Draft story')).not.toBeInTheDocument())
    const deletes = state.calls.filter(call => call.method === 'DELETE')

    expect(deletes).toEqual([
      expect.objectContaining({ path: `${base}/${uuid(1)}/versions/en`, ifMatch: '3' }),
      expect.objectContaining({ path: `${base}/${uuid(1)}/versions/de`, ifMatch: '7' }),
    ])
    expect(deletes[0]!.key).toBeTruthy()
    expect(deletes[0]!.key).not.toBe(deletes[1]!.key)
    expect(success).toHaveBeenCalledExactlyOnceWith('Story deleted.')
    expect((await screen.findAllByText('No stories yet. Start the first one.')).length).toBeGreaterThan(0)
  })

  it('[E4.3][AC30] AC-4 a refused delete (412) keeps the dialog open with the refusal, keeps the row and reads the list again', async () => {
    const success = vi.spyOn(toast, 'success')
    const danger = vi.spyOn(toast, 'danger')

    answerStories([draftStory()], call => call.method === 'DELETE' && call.path.endsWith('/de') ? problem(412, 'precondition-failed') : call.method === 'DELETE' ? new Response(null, { status: 204 }) : undefined)
    renderStories()
    const { grid } = await loaded('Draft story')
    const reads = () => state.calls.filter(call => call.method === 'GET' && call.path === base).length
    const before = reads()

    await openMenu('Draft story')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Someone changed this story after the list was read.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(within(grid).getByText('Draft story')).toBeInTheDocument()
    await waitFor(() => expect(reads()).toBeGreaterThan(before))
    expect(success).not.toHaveBeenCalled()
    expect(danger).not.toHaveBeenCalled()
  })
})

describe('[E4.3][AC30] loading and failure', () => {
  it('[E4.3][AC30] AC-5 while the list loads, the table has its header, aria-busy and a skeleton per cell, and the phone list shows card-shaped skeletons', async () => {
    answerStories([], call => call.method === 'GET' && call.path === base ? new Promise<Response>(() => undefined) as unknown as Response : undefined)
    renderStories()

    const grid = await screen.findByRole('grid', { name: 'Stories' })

    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'true'))
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Story', 'English', 'Deutsch', 'Last update', 'Actions'])
    const row = within(grid).getAllByRole('row')[1]!

    expect(within(row).getAllByRole('gridcell').slice(0, 4).every(cell => cell.querySelector('.skeleton'))).toBe(true)
    const card = document.querySelector('ul[aria-hidden="true"] > li')!

    expect(card.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText('No stories yet. Start the first one.')).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] a failed list read shows the notice with Try again', async () => {
    answerStories([], call => call.method === 'GET' && call.path === base ? problem(500, 'internal-error') : undefined)
    renderStories()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('The stories could not be loaded.')
    expect(alert).toHaveTextContent('Reference: req-1')
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(state.calls.filter(call => call.method === 'GET' && call.path === base)).toHaveLength(2))
  })
})

describe('[E4.3][AC30] the Content route', () => {
  it('[E4.3][AC30] the Content route renders the stories list and still redirects ?tab=comments', async () => {
    answerStories([listItem(1, { title: { en: 'Routed story' } })])
    renderStories('/store/content', ContentRoute.options.component)

    expect((await screen.findAllByText('Routed story')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('stories-screen')).toBeInTheDocument()

    const beforeLoad = ContentRoute.options.beforeLoad as (context: { search: { tab?: string } }) => void

    expect(() => beforeLoad({ search: { tab: 'comments' } })).toThrow(expect.objectContaining({ options: expect.objectContaining({ to: '/store/content/comments' }) }))
    expect(() => beforeLoad({ search: { tab: 'reviews' } })).toThrow(expect.objectContaining({ options: expect.objectContaining({ to: '/store/content/reviews' }) }))
    expect(() => beforeLoad({ search: {} })).not.toThrow()
    expect((ContentRoute.options.validateSearch as (search: Record<string, unknown>) => unknown)({ tab: 'reviews', lang: ['en'] })).toEqual({ tab: 'reviews' })
  })
})
