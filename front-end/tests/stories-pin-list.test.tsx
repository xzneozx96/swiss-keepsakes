import type { PinOption } from '@/features/stories/lib/pins'

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PinChoiceSheet } from '@/features/stories/components/pin-choice-sheet'
import { pinItem, renderWithStore, servePins, setUpStoryMedia, state, storeId, uuid } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(async () => {
  await setUpStoryMedia()
  servePins([
    pinItem(1, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower' }),
    pinItem(2, { title: { en: 'Lion' } }),
    pinItem(3, { title: { en: 'Draft cellar' }, status: 'draft' }),
    pinItem(4, { title: { en: 'Hidden bridge' }, status: 'hidden' }),
  ])
})

function renderSheet(over: Partial<Parameters<typeof PinChoiceSheet>[0]> = {}) {
  const chosen: PinOption[] = []
  const onClose = vi.fn()

  renderWithStore(
    <PinChoiceSheet doneLabel="Link this pin" isOpen language="en" note="A pin link does not tag the place. Use Places in Details for that." storeId={storeId} title="Link a pin" onChoose={pin => chosen.push(pin)} onClose={onClose} {...over} />,
  )

  return { chosen, onClose }
}

describe('[E4.3][AC45] the pin list and the single-choice sheet', () => {
  it('[E4.3][AC45] AC-4 the row of a published pin shows its website and choosing it enables "Link this pin" and returns that pin', async () => {
    const { chosen } = renderSheet()
    const row = await screen.findByRole('button', { name: /Zyt tower/ })
    const done = screen.getByRole('button', { name: 'Link this pin' })

    expect(row).toHaveTextContent('zyt.example/tower')
    expect(done).toBeDisabled()
    await userEvent.click(row)
    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(done).toBeEnabled()
    await userEvent.click(done)
    expect(chosen).toEqual([expect.objectContaining({ id: uuid(1), website: 'https://zyt.example/tower', status: 'published' })])
  })

  it('[E4.3][AC45] AC-4 a draft pin can be chosen and its row says "Draft: shows as plain text until published"', async () => {
    const { chosen } = renderSheet()
    const row = await screen.findByRole('button', { name: /Draft cellar/ })

    expect(row).toHaveTextContent('Draft: shows as plain text until published')
    expect(screen.getByRole('button', { name: /Hidden bridge/ })).toHaveTextContent('Hidden: shows as plain text')
    expect(screen.getByRole('button', { name: /Lion/ })).toHaveTextContent('Opens on the map')
    await userEvent.click(row)
    await userEvent.click(screen.getByRole('button', { name: 'Link this pin' }))
    expect(chosen[0]).toMatchObject({ id: uuid(3), status: 'draft' })
  })

  it('[E4.3][AC45] "Search your pins" narrows the rows by name and an empty result says No pin matches “xyz”.', async () => {
    renderSheet()
    await screen.findByRole('button', { name: /Zyt tower/ })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your pins' }), 'lio')
    await waitFor(() => expect(screen.queryByRole('button', { name: /Zyt tower/ })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Lion/ })).toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search your pins' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your pins' }), 'xyz')
    expect(await screen.findByText('No pin matches “xyz”.')).toBeInTheDocument()
  })

  it('[E4.3][AC45] the sheet says a pin link does not tag the place, choosing a second pin replaces the first, and Cancel returns nothing', async () => {
    const { chosen, onClose } = renderSheet()

    expect(screen.getByText('A pin link does not tag the place. Use Places in Details for that.')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /Zyt tower/ }))
    await userEvent.click(screen.getByRole('button', { name: /Lion/ }))
    expect(screen.getByRole('button', { name: /Zyt tower/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Lion/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(chosen).toEqual([])
    expect(onClose).toHaveBeenCalled()
  })

  it('[E4.3][AC45] with no pins the list says so', async () => {
    servePins([])
    renderSheet()
    expect(await screen.findByText('You have no pins yet.')).toBeInTheDocument()
  })
})

describe('[ADR-033] the pin picker searches on the server', () => {
  it('asks for the first 20 matches, and sends the search once, a moment after the last key', async () => {
    renderSheet()
    await screen.findByRole('button', { name: /Zyt tower/ })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your pins' }), 'lio')

    await waitFor(() => expect(state.calls.some(call => call.path.includes('q=lio'))).toBe(true))
    const reads = state.calls.filter(call => call.method === 'GET' && call.path.split('?')[0].endsWith('/pins'))

    expect(reads.filter(call => call.path.includes('q='))).toHaveLength(1)
    expect(reads.every(call => call.path.includes('pageSize=20') && call.path.includes('page=1'))).toBe(true)
  })
})
