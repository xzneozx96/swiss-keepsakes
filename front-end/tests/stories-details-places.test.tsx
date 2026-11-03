import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlacesCard } from '@/features/stories/components/story-places-card'
import { groupPatches } from './stories-details-harness'
import { storyDoc, storyGroupDetail, uuid } from './stories-harness'
import { renderLinkedCard, serveLists } from './stories-lists-harness'
import { pinItem, setUpStoryMedia } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const pins = () => [pinItem(1), pinItem(2), pinItem(3, { status: 'draft' })]
const link = (id: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zyt', marks: [{ type: 'pinLink', attrs: { pinId: id } }] }] }] })

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
})

function serve(over: Record<string, unknown> = {}, rows: Parameters<typeof serveLists>[1] = { pins: pins() }) {
  return serveLists(storyGroupDetail({}, over), rows)
}

async function openCard(body: unknown = storyDoc().body, language: 'en' | 'de' = 'en') {
  renderLinkedCard(editor => <PlacesCard body={body as never} group={editor.group} language={language} storeId="0198a000-0000-7000-8000-000000000001" onChange={editor.change} />)
  const header = await screen.findByRole('button', { name: /^Places/ }, SLOW)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)

  return header
}

const sheetRow = (name: string) => screen.findByRole('button', { name: new RegExp(`^${name}`) }, SLOW)
const openSheet = async () => userEvent.click(await screen.findByRole('button', { name: 'Choose places' }, SLOW))
const list = () => screen.getByRole('list', { name: 'Places in this story' })

describe('[E4.3][AC30] the Places card and picker', () => {
  it('[E4.3][AC30] AC-6 choosing three pins, one in draft, lists three rows, marks the draft one Not published and names the pins in the summary', async () => {
    serve()
    const header = await openCard()

    await openSheet()
    for (const name of ['Pin 1', 'Pin 2', 'Pin 3'])
      await userEvent.click(await sheetRow(name))
    await userEvent.click(screen.getByRole('button', { name: 'Save 3 places' }))
    await waitFor(() => expect(within(list()).getAllByRole('listitem')).toHaveLength(3), SLOW)
    expect(within(list()).getAllByText('Not published')).toHaveLength(1)
    await userEvent.click(header)
    expect(within(header).getByText('Pin 1, Pin 2, Pin 3')).toBeInTheDocument()
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]).toMatchObject({ ifMatch: '1', body: { placeIds: [uuid(1), uuid(2), uuid(3)] } })
  }, 30000)

  it('[E4.3][AC30] the sheet button counts and is singular for one', async () => {
    serve()
    await openCard()
    await openSheet()
    await userEvent.click(await sheetRow('Pin 1'))
    expect(screen.getByRole('button', { name: 'Save 1 place' })).toBeInTheDocument()
    await userEvent.click(await sheetRow('Pin 2'))
    expect(screen.getByRole('button', { name: 'Save 2 places' })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] removing a row saves the shorter list without the sheet', async () => {
    serve({ placeIds: [uuid(1), uuid(2)] })
    await openCard()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Pin 1' }, SLOW))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ placeIds: [uuid(2)] })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] Review Focus 5: the 51st place changes nothing', async () => {
    const many = Array.from({ length: 51 }, (_, i) => pinItem(i + 1))

    serve({ placeIds: many.slice(0, 50).map(pin => pin.id) }, { pins: many })
    await openCard()
    await openSheet()
    expect(screen.getByRole('button', { name: 'Save 50 places' })).toBeInTheDocument()
    // The 51st pin is on the second page of the list: search for it.
    await userEvent.type(screen.getByRole('searchbox'), 'Pin 51')
    await userEvent.click(await sheetRow('Pin 51'))
    expect(screen.getByRole('button', { name: 'Save 50 places' })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] Cancel keeps the saved places', async () => {
    serve({ placeIds: [uuid(1)] })
    await openCard()
    await openSheet()
    await userEvent.click(await sheetRow('Pin 2'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument(), SLOW)
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1)
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(groupPatches()).toHaveLength(0)
  }, 30000)

  it('[E4.3][AC30] a pin linked in the text and not tagged is named, and tagging it removes the note', async () => {
    serve()
    await openCard(link(uuid(2)))
    expect(await screen.findByText('Linked in the text but not tagged: Pin 2. A pin link does not tag the place.', undefined, SLOW)).toBeInTheDocument()
    await openSheet()
    await userEvent.click(await sheetRow('Pin 2'))
    await userEvent.click(screen.getByRole('button', { name: 'Save 1 place' }))
    await waitFor(() => expect(screen.queryByText(/Linked in the text but not tagged/)).not.toBeInTheDocument(), SLOW)
  }, 30000)

  it('[E4.3][AC30] Review Focus 4: while the pin list loads the card shows skeleton rows, and a saved id the list lacks is an Unknown pin row that can be removed', async () => {
    let release!: () => void
    const server = serve({ placeIds: [uuid(1), uuid(77)] })

    server.lists.gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openCard()
    await waitFor(() => expect(document.querySelectorAll('ul[aria-hidden] li').length).toBeGreaterThan(0), SLOW)
    release()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Unknown pin' }, SLOW))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ placeIds: [uuid(1)] })
  }, 30000)

  it('[E4.3][AC30] a failed pin list shows the retry notice in the sheet', async () => {
    const server = serve()

    server.lists.fail = 'pins'
    await openCard()
    await openSheet()
    expect(await screen.findByText('Your pins could not be loaded.', undefined, SLOW)).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] AC-7 places keep their order after a reload', async () => {
    serve({ placeIds: [uuid(2), uuid(1)] })
    await openCard()
    await waitFor(() => expect(within(list()).getAllByRole('listitem').map(item => item.textContent)).toEqual([expect.stringContaining('Pin 2'), expect.stringContaining('Pin 1')]), SLOW)
  }, 30000)
})
