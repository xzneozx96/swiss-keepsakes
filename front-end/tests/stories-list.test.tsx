import { toast } from '@heroui/react'
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Route as ContentRoute } from '@/routes/store/content/index'
import { answerStories, base, listItem, listVersion, media, problem, publishedVersion, renderStories, setUpHarness, state, storeId, storyList, uuid } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

// The first test loads the generated client (the contract and Zod) on its first call, which is slow on a busy machine.
configure({ asyncUtilTimeout: 10_000 })
vi.setConfig({ testTimeout: 30_000 })

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

describe('[E4.3][AC30] deleting a story from the list', () => {
  const draftStory = () => listItem(1, { title: { en: 'Draft story' }, languages: { en: listVersion({ rowVersion: 3 }), de: listVersion({ rowVersion: 7 }) } })
  const liveStory = () => listItem(2, { title: { en: 'Live story' }, languages: { en: publishedVersion(), de: listVersion() } })
  const linksPath = (n: number) => `${base}/${uuid(n)}/links`
  const groupPath = (n: number) => `${base}/${uuid(n)}`
  const noLinks = () => Response.json({ pins: 0, stories: 0 })
  const chooseDelete = async (name: string) => {
    await openMenu(name)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    return screen.findByRole('alertdialog')
  }
  /** Answers the links read, and a delete of group `n` with `onDelete` (default: success, and the list reads without it afterwards). */
  const server = (items: Record<string, unknown>[], links: () => Response, onDelete?: (call: (typeof state.calls)[number]) => Response) => {
    let deleted: string | undefined

    answerStories(items, (call) => {
      if (call.method === 'GET' && call.path.endsWith('/links'))
        return links()
      if (call.method === 'DELETE') {
        const answer = onDelete?.(call) ?? Response.json({ pinsUnlinked: 0, storiesUnlinked: 0 })

        if (answer.ok)
          deleted = call.path

        return answer
      }

      return call.method === 'GET' && call.path === base && deleted
        ? Response.json(storyList(items.filter(item => `${base}/${item.groupId as string}` !== deleted)))
        : undefined
    })
  }

  it('[E4.3][AC30] AC-5 a published story and a story that was published once both have Delete in the row menu, and no row is disabled', async () => {
    server([liveStory(), listItem(3, { title: { en: 'Taken down' }, languages: { en: listVersion({ everPublished: true }), de: null } })], noLinks)
    renderStories()
    await loaded('Live story')

    await openMenu('Live story')
    expect(await screen.findByRole('menuitem', { name: 'Open' })).toHaveAttribute('href', `/store/content/articles/${uuid(2)}`)
    expect(screen.getByRole('menuitem', { name: 'Delete' })).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText('Unpublish it in the editor first')).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await openMenu('Taken down')
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText('Published once, it cannot be deleted')).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 the dialog of a draft says the draft will be deleted, with no live line and no link line, and loads the links first', async () => {
    server([draftStory()], noLinks)
    renderStories()
    await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    expect(within(dialog).getByText('Delete Draft story?')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('The draft will be deleted.')
    expect(dialog).not.toHaveTextContent('live for guests')
    expect(dialog).not.toHaveTextContent('main story')
    expect(state.calls.filter(call => call.method === 'GET' && call.path === linksPath(1))).toHaveLength(1)
    expect(within(dialog).getByRole('button', { name: 'Delete story' })).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-5 AC-6 the dialog of a published story is live for guests, names the 1 pin and the 2 stories, and says the links are removed', async () => {
    server([liveStory()], () => Response.json({ pins: 1, stories: 2 }))
    renderStories()
    await loaded('Live story')
    const dialog = await chooseDelete('Live story')

    expect(dialog).toHaveTextContent('live for guests and will disappear')
    expect(dialog).toHaveTextContent('This story is the main story of 1 pin and is linked from 2 other stories. Deleting it removes those links.')
    expect(dialog).not.toHaveTextContent('The draft will be deleted')
  })

  it('[E4.3][AC30] AC-5 when the links cannot be read the dialog still opens and says they could not be checked', async () => {
    server([draftStory()], () => problem(500, 'internal-error'))
    renderStories()
    await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    expect(dialog).toHaveTextContent('could not be checked')
  })

  it('[E4.3][AC30] AC-7 deleting from the list sends one DELETE of the group with an Idempotency-Key and no If-Match, drops the row at once, updates the tab counts and shows one toast', async () => {
    const success = vi.spyOn(toast, 'success')

    server([draftStory(), liveStory()], noLinks)
    renderStories()
    const { grid } = await loaded('Draft story')

    expect(tab('All', 2)).toBeInTheDocument()
    const dialog = await chooseDelete('Draft story')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))
    await waitFor(() => expect(within(grid).queryByText('Draft story')).not.toBeInTheDocument())
    const deletes = state.calls.filter(call => call.method === 'DELETE')

    expect(deletes).toEqual([expect.objectContaining({ path: groupPath(1), ifMatch: null })])
    expect(deletes[0]!.key).toBeTruthy()
    expect(tab('All', 1)).toBeInTheDocument()
    expect(tab('Drafts', 0)).toBeInTheDocument()
    expect(tab('Published', 1)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(success).toHaveBeenCalledExactlyOnceWith('Story deleted.')
    expect(within(grid).getByText('Live story')).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-7 a refused delete keeps the dialog open with the refusal in a danger notice, keeps the row, and both buttons work again; a second try deletes it', async () => {
    const success = vi.spyOn(toast, 'success')
    const danger = vi.spyOn(toast, 'danger')
    let refuse = true

    server([draftStory()], noLinks, () => (refuse ? problem(500, 'internal-error') : Response.json({ pinsUnlinked: 0, storiesUnlinked: 0 })))
    renderStories()
    const { grid } = await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong. Try again in a moment.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(within(grid).getByText('Draft story')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Delete story' })).toBeEnabled()
    expect(success).not.toHaveBeenCalled()
    expect(danger).not.toHaveBeenCalled()
    refuse = false
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))
    await waitFor(() => expect(within(grid).queryByText('Draft story')).not.toBeInTheDocument())
    expect(success).toHaveBeenCalledExactlyOnceWith('Story deleted.')
  })

  it('[E4.3][AC30] AC-7 a lost connection is shown the same way, and the row stays', async () => {
    server([draftStory()], noLinks, () => { throw new TypeError('Failed to fetch') })
    renderStories()
    const { grid } = await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(within(grid).getByText('Draft story')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
  })

  it('[E4.3][AC30] AC-7 while the server has not answered the button shows a spinner, Cancel is off, and Esc and a tap outside do nothing', async () => {
    let release: (answer: Response) => void = () => undefined
    const slow = new Promise<Response>((resolve) => {
      release = resolve
    })

    server([draftStory()], noLinks, () => slow as unknown as Response)
    renderStories()
    await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled())
    expect(dialog.querySelector('[role="progressbar"], .spinner')).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(document.body)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    release(Response.json({ pinsUnlinked: 0, storiesUnlinked: 0 }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('[E4.3][AC30] AC-7 Cancel closes the dialog and sends no DELETE', async () => {
    server([draftStory()], noLinks)
    renderStories()
    await loaded('Draft story')
    const dialog = await chooseDelete('Draft story')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(state.calls.filter(call => call.method === 'DELETE')).toHaveLength(0)
  })

  it('[E4.3][AC30] AC-8 in German the menu item, the dialog with its counts, and the toast are German', async () => {
    const success = vi.spyOn(toast, 'success')

    localStorage.setItem('sk.language', JSON.stringify('de'))
    server([liveStory()], () => Response.json({ pins: 1, stories: 2 }))
    renderStories()
    await screen.findAllByText('Live story')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Aktionen für Live story' }))[0]!)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Live story löschen?')
    expect(dialog).toHaveTextContent('für Gäste sichtbar')
    expect(dialog).toHaveTextContent('ist die Hauptgeschichte von 1 Pin und wird von 2 anderen Geschichten verlinkt')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Geschichte löschen' }))
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Geschichte gelöscht.'))
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

  it('[E4.3][AC30] SIMPLICITY-E43-8 the store gate shows "forbidden" for a 403 on the account read, as the Media and Keepsake gates do', async () => {
    answerStories([], call => (call.path === '/api/me' ? problem(403, 'forbidden') : undefined))
    renderStories()
    expect(await screen.findByText('You may not edit the stories of this store.')).toBeInTheDocument()
    expect(screen.queryByText('The stories could not be loaded.')).not.toBeInTheDocument()
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
