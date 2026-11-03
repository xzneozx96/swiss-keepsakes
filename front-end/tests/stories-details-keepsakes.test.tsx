import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { KeepsakesCard } from '@/features/stories/components/story-keepsakes-card'
import { listItem as keepsakeItem } from './keepsakes-harness'
import { groupPatches } from './stories-details-harness'
import { storyGroupDetail, uuid } from './stories-harness'
import { dragGrip, renderLinkedCard, serveLists, stubRowLayout } from './stories-lists-harness'
import { setUpStoryMedia } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const store = '0198a000-0000-7000-8000-000000000001'
const published = (n: number) => keepsakeItem({ id: uuid(n), status: 'published', name: { en: `Classic ${n}` } })
const catalog = () => [...[1, 2, 3, 4, 5, 6, 7].map(published), keepsakeItem({ id: uuid(8), status: 'draft', name: { en: 'Hidden knife' } }), keepsakeItem({ id: uuid(9), status: 'archived', name: { en: 'Old knife' } })]

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
})

afterEach(() => vi.restoreAllMocks())

function serve(over: Record<string, unknown> = {}, keepsakes = catalog()) {
  return serveLists(storyGroupDetail({}, over), { keepsakes })
}

async function openCard() {
  renderLinkedCard(editor => <KeepsakesCard group={editor.group} language="en" storeId={store} onChange={editor.change} />)
  const header = await screen.findByRole('button', { name: /^Keepsakes/ }, SLOW)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)

  return header
}

const tile = (name: string) => screen.findByRole('button', { name }, SLOW)
const openSheet = async () => userEvent.click(await screen.findByRole('button', { name: /^Choose keepsakes/ }, SLOW))
const rows = () => within(screen.getByRole('list', { name: 'Keepsakes, in order' })).getAllByRole('listitem').map(item => item.querySelector('[title]')!.textContent)
const grip = (name: string) => screen.findByRole('button', { name: new RegExp(`^Move ${name},`) }, SLOW)

describe('[E4.3][AC33][AC54] the Keepsakes card, picker and ordered list', () => {
  it('[E4.3][AC54] AC-3 the picker lists only published keepsakes, with a name and a photo and no price', async () => {
    serve()
    await openCard()
    await openSheet()
    for (const n of [1, 2, 3, 4, 5, 6, 7])
      expect(await tile(`Classic ${n}`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hidden knife' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Old knife' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/CHF|\$|\d+\.\d\d/)
  }, 30000)

  it('[E4.3][AC54] AC-3 six chosen: a seventh changes nothing and the button reads "Choose keepsakes · 6 of 6"', async () => {
    serve()
    await openCard()
    await openSheet()
    for (const n of [1, 2, 3, 4, 5, 6])
      await userEvent.click(await tile(`Classic ${n}`))
    expect(screen.getByRole('button', { name: 'Classic 7' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Classic 7' }))
    expect(screen.getByRole('button', { name: 'Save 6 of 6' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save 6 of 6' }))
    expect(await screen.findByRole('button', { name: 'Choose keepsakes · 6 of 6' }, SLOW)).toBeInTheDocument()
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ keepsakeProductIds: [1, 2, 3, 4, 5, 6].map(uuid) })
  }, 30000)

  it('[E4.3][AC33] the chosen tiles show their order number', async () => {
    serve()
    await openCard()
    await openSheet()
    await userEvent.click(await tile('Classic 3'))
    await userEvent.click(await tile('Classic 1'))
    expect(within(screen.getByRole('button', { name: 'Classic 1' })).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Classic 3' })).getByText('1')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] AC-4 the Up arrow on the grip of the second row moves it to position 1, keeps the focus on the grip and announces it', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const second = await grip('Classic 2')

    expect(second).toHaveAccessibleName('Move Classic 2, position 2 of 3. Drag, or use the arrow keys.')
    second.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(rows()).toEqual(['Classic 2', 'Classic 1', 'Classic 3'])
    expect(document.activeElement).toBe(await grip('Classic 2'))
    expect(document.activeElement).toHaveAccessibleName('Move Classic 2, position 1 of 3. Drag, or use the arrow keys.')
    expect(screen.getByRole('status')).toHaveTextContent('Classic 2 moved to position 1 of 3.')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ keepsakeProductIds: [uuid(2), uuid(1), uuid(3)] })
  }, 30000)

  it('[E4.3][AC33] Review Focus 3: two arrow moves in a row send two PATCHes with If-Match 1 then 2, each with the full list', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const third = await grip('Classic 3')

    third.focus()
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    ;(await grip('Classic 3')).focus()
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(groupPatches()).toHaveLength(2), SLOW)
    expect(groupPatches().map(call => call.ifMatch)).toEqual(['1', '2'])
    expect(groupPatches().map(call => call.body)).toEqual([{ keepsakeProductIds: [uuid(1), uuid(3), uuid(2)] }, { keepsakeProductIds: [uuid(3), uuid(1), uuid(2)] }])
  }, 30000)

  it('[E4.3][AC33] AC-4 dragging a grip to the last place moves the row', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const first = await grip('Classic 1')

    stubRowLayout()
    dragGrip(first, 180)
    expect(rows()).toEqual(['Classic 2', 'Classic 3', 'Classic 1'])
  }, 30000)

  it('[E4.3][AC33] AC-4 Escape cancels a drag and the order is unchanged', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(2), uuid(3)] })
    await openCard()
    const first = await grip('Classic 1')

    stubRowLayout()
    dragGrip(first, 180, true)
    expect(rows()).toEqual(['Classic 1', 'Classic 2', 'Classic 3'])
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(groupPatches()).toHaveLength(0)
  }, 30000)

  it('[E4.3][AC54] Review Focus 1: a chosen keepsake that is archived now shows "Not published: hidden on the story", counts in "{n} of 6", and the picker keeps it', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(9), uuid(2)] })
    const header = await openCard()

    expect(await screen.findByText('Not published: hidden on the story', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose keepsakes · 3 of 6' })).toBeInTheDocument()
    await userEvent.click(header)
    expect(within(header).getByText('3 of 6')).toBeInTheDocument()
    await userEvent.click(header)
    await openSheet()
    expect(await screen.findByText('1 chosen keepsake is not published. It stays in the list; remove it on the card.', undefined, SLOW)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save 3 of 6' }))
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(groupPatches()).toHaveLength(0)
  }, 30000)

  it('[E4.3][AC33] removing a row sends the shorter list; the button count follows', async () => {
    serve({ keepsakeProductIds: [uuid(1), uuid(2)] })
    await openCard()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Classic 1' }, SLOW))
    expect(rows()).toEqual(['Classic 2'])
    expect(screen.getByRole('button', { name: 'Choose keepsakes · 1 of 6' })).toBeInTheDocument()
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ keepsakeProductIds: [uuid(2)] })
  }, 30000)

  it('[E4.3][AC54] Review Focus 4: skeleton rows while the keepsake list loads, a retry notice when it fails, an id the list lacks is an Unknown keepsake row that can be removed', async () => {
    let release!: () => void
    const server = serve({ keepsakeProductIds: [uuid(1), uuid(77)] })

    server.lists.gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openCard()
    await waitFor(() => expect(document.querySelectorAll('ul[aria-hidden] li').length).toBeGreaterThan(0), SLOW)
    release()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Unknown keepsake' }, SLOW))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ keepsakeProductIds: [uuid(1)] })
  }, 30000)

  it('[E4.3][AC54] Review Focus 4: a failed keepsake list shows a retry notice', async () => {
    const server = serve({ keepsakeProductIds: [uuid(1)] })

    server.lists.fail = 'products'
    await openCard()
    expect(await screen.findByText('Your keepsakes could not be loaded.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC54] with no published keepsake the sheet says there are none yet', async () => {
    serve({}, [keepsakeItem({ id: uuid(8), status: 'draft', name: { en: 'Hidden knife' } })])
    await openCard()
    await openSheet()
    expect(await screen.findByText('No published keepsakes yet.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save 0 of 6' })).toBeEnabled()
  }, 30000)

  it('[E4.3][AC33] AC-7 order persists: after the saves the editor reads the same order from the server', async () => {
    const server = serve({ keepsakeProductIds: [uuid(1), uuid(2), uuid(3)] })

    await openCard()
    const third = await grip('Classic 3')

    third.focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    await waitFor(() => expect(server.group.keepsakeProductIds).toEqual([uuid(3), uuid(1), uuid(2)]), SLOW)
    cleanup()
    await openCard()
    await grip('Classic 3')
    expect(rows()).toEqual(['Classic 3', 'Classic 1', 'Classic 2'])
  }, 30000)
})
