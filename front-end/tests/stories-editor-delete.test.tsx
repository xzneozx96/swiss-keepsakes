import { toast } from '@heroui/react'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { groupId, patches, problem, renderStoryEditor, serveStory, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))
const base = `/api/store/${storeId}/story-groups/${groupId}`

beforeEach(async () => {
  view.wide = false
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const draftOnly = () => storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ title: 'Old title' }) }) })
function live() {
  return storyGroupDetail({
    en: storyVersion('en', { draft: storyDoc({ title: 'Old title' }) }),
    de: storyVersion('de', { status: 'published', slug: 'ein-morgen', draft: null, published: storyDoc({ title: 'Alter Titel' }), publishedAt: '2026-11-01T08:00:00.000Z', rowVersion: 5 }),
  })
}
const noLinks = (call: (typeof state.calls)[number]) => (call.method === 'GET' && call.path === `${base}/links` ? Response.json({ pins: 0, stories: 0 }) : undefined)

async function openDelete() {
  renderStoryEditor(`/store/content/articles/${groupId}`)
  await screen.findByRole('textbox', { name: /^Title/ }, SLOW)
  await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete story' }))

  return screen.findByRole('alertdialog')
}

describe('[E4.3][AC30] deleting a story from the editor', () => {
  it('[E4.3][AC30] AC-7 the editor has a more menu with Delete story', async () => {
    serveStory(draftOnly(), noLinks)
    renderStoryEditor(`/store/content/articles/${groupId}`)
    await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete story' })).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 a story with a live version asks in the danger dialog, names the links, and Cancel changes nothing', async () => {
    serveStory(live(), call => call.method === 'GET' && call.path === `${base}/links` ? Response.json({ pins: 1, stories: 1 }) : undefined)
    const dialog = await openDelete()

    expect(dialog).toHaveTextContent('live for guests and will disappear')
    expect(dialog).toHaveTextContent('This story is the main story of 1 pin and is linked from 1 other story. Deleting it removes those links.')
    expect(within(dialog).getByRole('button', { name: 'Delete story' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(state.calls.filter(call => call.method === 'DELETE')).toHaveLength(0)
    expect(screen.getByRole('textbox', { name: /^Title/ })).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 a story with no live version says the draft will be deleted and has no live line', async () => {
    serveStory(draftOnly(), noLinks)
    const dialog = await openDelete()

    expect(dialog).toHaveTextContent('The draft will be deleted.')
    expect(dialog).not.toHaveTextContent('live for guests')
    expect(dialog).not.toHaveTextContent('main story')
  })

  it('[E4.3][AC30] AC-7 a successful delete opens the list with a toast, without asking about unsaved edits, and sends no save of the deleted story', async () => {
    const success = vi.spyOn(toast, 'success')

    serveStory(live(), (call) => {
      if (call.method === 'DELETE')
        return Response.json({ pinsUnlinked: 0, storiesUnlinked: 0 })

      return noLinks(call)
    })
    renderStoryEditor(`/store/content/articles/${groupId}`)
    const field = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(field)
    await userEvent.keyboard('{End} typed')
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete story' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete story' }))

    expect(await screen.findByText('Stories list', undefined, SLOW)).toBeInTheDocument()
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
    expect(state.calls.filter(call => call.method === 'DELETE')).toEqual([expect.objectContaining({ path: base, ifMatch: null })])
    expect(success).toHaveBeenCalledExactlyOnceWith('Story deleted.')
    await wait(1900)
    expect(patches()).toHaveLength(0)
    // The group of a deleted story is not read again.
    expect(state.calls.filter(call => call.method === 'GET' && call.path === base)).toHaveLength(1)
  })

  it('[E4.3][AC30] CORRECTNESS-E43-2 a successful delete drops the cached groups of other stories and refreshes the pins that named the story', async () => {
    const cache = () => state.demo.queryClient
    const otherGroup = ['stories', 'group', storeId, '0198a000-0000-7000-8000-0000000000ee']
    const pinKeys = [['places', 'list', storeId], ['places', 'pin', storeId, 'p1'], ['places', 'storyOptions', storeId]]

    serveStory(draftOnly(), call => (call.method === 'DELETE' ? Response.json({ pinsUnlinked: 1, storiesUnlinked: 1 }) : noLinks(call)))
    renderStoryEditor(`/store/content/articles/${groupId}`)
    await screen.findByRole('textbox', { name: /^Title/ }, SLOW)
    // A story that listed the deleted one as related, and the pins that named it, were read before.
    cache().setQueryData(otherGroup, { id: 'other', rowVersion: 7 })
    for (const key of pinKeys)
      cache().setQueryData(key, { items: [] })
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete story' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete story' }))

    expect(await screen.findByText('Stories list', undefined, SLOW)).toBeInTheDocument()
    await waitFor(() => expect(cache().getQueryData(otherGroup)).toBeUndefined(), SLOW)
    for (const key of pinKeys)
      expect(cache().getQueryState(key)?.isInvalidated).toBe(true)
  })

  it('[E4.3][AC30] AC-7 a refused delete keeps the editor and the dialog open with the error, and both buttons work again', async () => {
    const success = vi.spyOn(toast, 'success')

    serveStory(draftOnly(), call => (call.method === 'DELETE' ? problem(500, 'internal-error') : noLinks(call)))
    const dialog = await openDelete()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong. Try again in a moment.')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Delete story' })).toBeEnabled()
    expect(screen.queryByText('Stories list')).not.toBeInTheDocument()
    expect(success).not.toHaveBeenCalled()
  })

  it('[E4.3][AC30] AC-8 in German the menu item, the dialog and the toast are German', async () => {
    const success = vi.spyOn(toast, 'success')

    localStorage.setItem('sk.language', JSON.stringify('de'))
    serveStory(draftOnly(), call => (call.method === 'DELETE' ? Response.json({ pinsUnlinked: 0, storiesUnlinked: 0 }) : noLinks(call)))
    renderStoryEditor(`/store/content/articles/${groupId}`)
    await screen.findByRole('textbox', { name: /Titel/ }, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Weitere Aktionen' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Geschichte löschen' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Der Entwurf wird gelöscht.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Geschichte löschen' }))
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Geschichte gelöscht.'))
  })
})
