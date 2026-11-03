import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RelatedCard } from '@/features/stories/components/story-related-card'
import { groupPatches } from './stories-details-harness'
import { groupId, listVersion, publishedVersion, storyGroupDetail, listItem as storyItem, uuid } from './stories-harness'
import { dragGrip, renderLinkedCard, serveLists, stubRowLayout } from './stories-lists-harness'
import { setUpStoryMedia } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const store = '0198a000-0000-7000-8000-000000000001'
const stories = () => [storyItem(100, { title: { en: 'Own story' } }), ...[1, 2, 3, 4, 5].map(n => storyItem(n))]

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
})

afterEach(() => vi.restoreAllMocks())

function serve(over: Record<string, unknown> = {}, rows = stories()) {
  return serveLists(storyGroupDetail({}, over), { stories: rows })
}

async function openCard(language: 'en' | 'de' = 'en') {
  renderLinkedCard(editor => <RelatedCard group={editor.group} language={language} storeId={store} onChange={editor.change} />)
  const header = await screen.findByRole('button', { name: /^More to discover/ }, SLOW)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)

  return header
}

const row = (title: string) => screen.findByRole('button', { name: new RegExp(`^${title}\\s*EN`) }, SLOW)
const openSheet = async () => userEvent.click(await screen.findByRole('button', { name: /^Choose stories/ }, SLOW))
const list = () => within(screen.getByRole('list', { name: 'Stories, in order' }))
const titles = () => list().getAllByRole('listitem').map(item => item.querySelector('[title]')!.textContent)
const grip = (title: string) => screen.findByRole('button', { name: new RegExp(`^Move ${title},`) }, SLOW)

describe('[E4.3][AC33] the More to discover card, picker and ordered list', () => {
  it('[E4.3][AC33] AC-1 three chosen, a fourth changes nothing and the picker shows "3 of 3"', async () => {
    serve()
    const header = await openCard()

    await openSheet()
    for (const n of [1, 2, 3])
      await userEvent.click(await row(`Story ${n}`))
    expect(await row('Story 4')).toBeDisabled()
    await userEvent.click(await row('Story 4'))
    expect(screen.getByRole('button', { name: 'Save 3 of 3' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save 3 of 3' }))
    expect(await screen.findByRole('button', { name: 'Choose stories · 3 of 3' }, SLOW)).toBeInTheDocument()
    await userEvent.click(header)
    expect(within(header).getByText('3 of 3')).toBeInTheDocument()
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ relatedGroupIds: [uuid(1), uuid(2), uuid(3)] })
  }, 30000)

  it('[E4.3][AC33] AC-1 the three are shared by both languages and keep their order', async () => {
    const server = serve({ relatedGroupIds: [uuid(3), uuid(1), uuid(2)] })

    await openCard('en')
    await grip('Story 3')
    expect(titles()).toEqual(['Story 3', 'Story 1', 'Story 2'])
    cleanup()
    await openCard('de')
    await grip('Story 3')
    expect(titles()).toEqual(['Story 3', 'Story 1', 'Story 2'])
    expect(groupPatches()).toHaveLength(0)
    expect(server.group.relatedGroupIds).toEqual([uuid(3), uuid(1), uuid(2)])
  }, 30000)

  it('[E4.3][AC33] AC-2 the story being edited is not offered', async () => {
    serve()
    await openCard()
    await openSheet()
    await row('Story 1')
    expect(screen.queryByRole('button', { name: /^Own story/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Story \d\s*EN/ })).toHaveLength(5)
    expect(groupId).toBe(uuid(100))
  }, 30000)

  it('[E4.3][AC33] AC-5 a related story with only an English published version, in the German editor, notes "No Deutsch: hidden for those readers"', async () => {
    serve({ relatedGroupIds: [uuid(1)] }, [storyItem(100), storyItem(1, { languages: { en: publishedVersion(), de: null } })])
    await openCard('de')
    await grip('Story 1')
    expect(within(list().getAllByRole('listitem')[0]!).getByText('No Deutsch: hidden for those readers')).toBeInTheDocument()
    cleanup()
    await openCard('en')
    await grip('Story 1')
    expect(screen.queryByText(/hidden for those readers/)).not.toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] Review Focus 2: a story with only a German draft is hidden for both languages, and a story published in both has no note', async () => {
    serve(
      { relatedGroupIds: [uuid(1), uuid(2)] },
      [storyItem(100), storyItem(1, { languages: { en: null, de: listVersion() } }), storyItem(2, { languages: { en: publishedVersion(), de: publishedVersion() } })],
    )
    await openCard('en')
    await grip('Story 1')
    expect(within(list().getAllByRole('listitem')[0]!).getByText('No English: hidden for those readers')).toBeInTheDocument()
    expect(within(list().getAllByRole('listitem')[1]!).queryByText(/hidden for those readers/)).not.toBeInTheDocument()
    cleanup()
    await openCard('de')
    await grip('Story 1')
    expect(within(list().getAllByRole('listitem')[0]!).getByText('No Deutsch: hidden for those readers')).toBeInTheDocument()
    expect(within(list().getAllByRole('listitem')[1]!).queryByText(/hidden for those readers/)).not.toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] the picker line reads "EN published · DE missing" and "EN published · DE draft"', async () => {
    serve({}, [storyItem(100), storyItem(1, { languages: { en: publishedVersion(), de: null } }), storyItem(2, { languages: { en: publishedVersion(), de: listVersion() } })])
    await openCard()
    await openSheet()
    expect(await screen.findByRole('button', { name: /^Story 1\s*EN published · DE missing$/ }, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Story 2\s*EN published · DE draft$/ })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] AC-4 the grips move rows by the arrow keys with the live region "{title} moved to position {n} of {total}."', async () => {
    serve({ relatedGroupIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const second = await grip('Story 2')

    second.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(titles()).toEqual(['Story 1', 'Story 3', 'Story 2'])
    expect(screen.getByRole('status')).toHaveTextContent('Story 2 moved to position 3 of 3.')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ relatedGroupIds: [uuid(1), uuid(3), uuid(2)] })
  }, 30000)

  it('[E4.3][AC33] Review Focus 3: Escape cancels a drag, and the same drag without Escape moves the row', async () => {
    serve({ relatedGroupIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const first = await grip('Story 1')

    stubRowLayout()
    dragGrip(first, 180, true)
    expect(titles()).toEqual(['Story 1', 'Story 2', 'Story 3'])
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(groupPatches()).toHaveLength(0)
    dragGrip(first, 180)
    expect(titles()).toEqual(['Story 2', 'Story 3', 'Story 1'])
  }, 30000)

  it('[E4.3][AC33] Review Focus 4: skeleton rows while the story list loads, a retry notice on failure, an id the list lacks is an Unknown story row that can be removed', async () => {
    let release!: () => void
    const server = serve({ relatedGroupIds: [uuid(1), uuid(77)] })

    server.lists.gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openCard()
    await waitFor(() => expect(document.querySelectorAll('ul[aria-hidden] li').length).toBeGreaterThan(0), SLOW)
    release()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Unknown story' }, SLOW))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ relatedGroupIds: [uuid(1)] })
    cleanup()
    server.lists.gate = undefined
    server.lists.fail = 'story-groups'
    await openCard()
    expect(await screen.findByText('Your stories could not be loaded.', undefined, SLOW)).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] with none chosen the summary reads "0 of 3 · the newest stories"', async () => {
    serve()
    const header = await openCard()

    await userEvent.click(header)
    expect(within(header).getByText('0 of 3 · the newest stories')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] AC-7 related stories keep their order after a reload', async () => {
    const server = serve({ relatedGroupIds: [uuid(1), uuid(2), uuid(3)] })

    await openCard()
    const third = await grip('Story 3')

    third.focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    await waitFor(() => expect(server.group.relatedGroupIds).toEqual([uuid(3), uuid(1), uuid(2)]), SLOW)
    cleanup()
    await openCard()
    await grip('Story 3')
    expect(titles()).toEqual(['Story 3', 'Story 1', 'Story 2'])
  }, 30000)
})
