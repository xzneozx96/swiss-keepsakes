import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listItem as keepsakeItem } from './keepsakes-harness'
import { groupPatches } from './stories-details-harness'
import { coverId, groupId, renderStoryEditor, storyDoc, storyGroupDetail, listItem as storyItem, storyVersion, uuid } from './stories-harness'
import { serveLists } from './stories-lists-harness'
import { pinItem, setUpStoryMedia } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
})

afterEach(() => vi.restoreAllMocks())

const version = (language: 'en' | 'de') => storyVersion(language, { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })
function lists() {
  return {
    pins: [pinItem(1), pinItem(2)],
    keepsakes: [1, 2].map(n => keepsakeItem({ id: uuid(n), status: 'published', name: { en: `Classic ${n}` } })),
    stories: [storyItem(100), storyItem(1), storyItem(2)],
  }
}

function serve(over: Record<string, unknown> = {}, rows: Parameters<typeof serveLists>[1] = lists()) {
  return serveLists(storyGroupDetail({ en: version('en'), de: version('de') }, over), rows)
}

async function openReview(search = '') {
  renderStoryEditor(`${path}?screen=review${search}`)
  await screen.findAllByText('Review and publish', undefined, SLOW)
  await screen.findByRole('button', { name: /^Places/ }, SLOW)
}

const card = (name: RegExp) => screen.findByRole('button', { name }, SLOW)
const cardIds = () => Array.from(document.querySelectorAll('section[id^="details-"]'), node => node.id)

async function open(name: RegExp) {
  const header = await card(name)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)
}

describe('[E4.3][AC30][AC33][AC54] the linked cards on the Review screen', () => {
  it('[E4.3][AC30] the phone layout shows the new cards under the Details tab', async () => {
    view.wide = false
    serve()
    await openReview()
    expect(cardIds()).toEqual(['details-link', 'details-categories', 'details-pins', 'details-stay', 'details-interests', 'details-keepsakes', 'details-related'])
  }, 30000)

  it('[E4.3][AC33] Show on the related-language warning opens More to discover', async () => {
    serve({ relatedGroupIds: [uuid(1)] }, { ...lists(), stories: [storyItem(100), storyItem(1, { title: { en: 'Story 2' } })] })
    await openReview('&lang=de')
    const header = await card(/^More to discover/)

    await waitFor(() => expect(document.querySelector('[data-check="related-language"]')).not.toBeNull(), SLOW)
    expect(screen.getAllByText('“Story 2” has no published Deutsch version, so readers of this version will not see it.')).not.toHaveLength(0)
    if (header.getAttribute('aria-expanded') === 'true')
      await userEvent.click(header)
    await userEvent.click(within(document.querySelector('[data-check="related-language"]') as HTMLElement).getByRole('button', { name: 'Show' }))
    expect(header).toHaveAttribute('aria-expanded', 'true')
  }, 30000)

  it('[E4.3][AC54] Show on the keepsake-unpublished warning opens Keepsakes', async () => {
    serve({ keepsakeProductIds: [uuid(9)] }, { ...lists(), keepsakes: [keepsakeItem({ id: uuid(9), status: 'archived', name: { en: 'Old knife' } })] })
    await openReview()
    const header = await card(/^Keepsakes/)

    await waitFor(() => expect(document.querySelector('[data-check="keepsake-unpublished"]')).not.toBeNull(), SLOW)
    if (header.getAttribute('aria-expanded') === 'true')
      await userEvent.click(header)
    await userEvent.click(within(document.querySelector('[data-check="keepsake-unpublished"]') as HTMLElement).getByRole('button', { name: 'Show' }))
    expect(header).toHaveAttribute('aria-expanded', 'true')
  }, 30000)

  it('[E4.3][AC30] the closed summaries read the names, "{n} of 6" and "{n} of 3 · the newest stories"', async () => {
    serve({ placeIds: [uuid(1), uuid(2)] })
    await openReview()
    const places = await card(/^Places/)
    const keepsakes = await card(/^Keepsakes/)
    const related = await card(/^More to discover/)

    for (const header of [places, keepsakes, related]) {
      if (header.getAttribute('aria-expanded') === 'true')
        await userEvent.click(header)
    }
    await waitFor(() => expect(within(places).getByText('Pin 1, Pin 2')).toBeInTheDocument(), SLOW)
    expect(within(keepsakes).getByText('0 of 6')).toBeInTheDocument()
    expect(within(related).getByText('0 of 3 · the newest stories')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC33] AC-7 places, keepsakes and related stories chosen and ordered reach the server in one group row and come back the same', async () => {
    const server = serve()

    await openReview()
    await open(/^Places/)
    await userEvent.click(await screen.findByRole('button', { name: 'Choose places' }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: /^Pin 2/ }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: /^Pin 1/ }, SLOW))
    await userEvent.click(screen.getByRole('button', { name: 'Save 2 places' }))
    await open(/^Keepsakes/)
    await userEvent.click(await screen.findByRole('button', { name: /^Choose keepsakes/ }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: 'Classic 2' }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: 'Classic 1' }, SLOW))
    await userEvent.click(screen.getByRole('button', { name: 'Save 2 of 6' }))
    await open(/^More to discover/)
    await userEvent.click(await screen.findByRole('button', { name: /^Choose stories/ }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: /^Story 2\s*EN/ }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: /^Story 1\s*EN/ }, SLOW))
    await userEvent.click(screen.getByRole('button', { name: 'Save 2 of 3' }))
    await waitFor(() => expect(server.group.relatedGroupIds).toEqual([uuid(2), uuid(1)]), SLOW)
    expect(server.group.placeIds).toEqual([uuid(2), uuid(1)])
    expect(server.group.keepsakeProductIds).toEqual([uuid(2), uuid(1)])
    expect(Object.assign({}, ...groupPatches().map(call => call.body))).toEqual({ placeIds: [uuid(2), uuid(1)], keepsakeProductIds: [uuid(2), uuid(1)], relatedGroupIds: [uuid(2), uuid(1)] })
    cleanup()
    await openReview()
    await open(/^Keepsakes/)
    const rows = await screen.findByRole('list', { name: 'Keepsakes, in order' }, SLOW)

    expect(within(rows).getAllByRole('listitem').map(item => item.querySelector('[title]')!.textContent)).toEqual(['Classic 2', 'Classic 1'])
    await open(/^Places/)
    // The preview has a list with the same name, so the card is picked by its anchor.
    expect(within(document.getElementById('details-pins')!).getAllByRole('listitem').map(item => item.querySelector('[title]')!.textContent)).toEqual(['Pin 2', 'Pin 1'])
  }, 60000)

  it('[E4.3][AC33] Back with a list change not yet saved opens the leave dialog', async () => {
    // The answer is held back, so the change is still unsaved (saving) when Back is pressed.
    serve().groupGate = new Promise<void>(() => {})
    await openReview()
    await open(/^Places/)
    await userEvent.click(await screen.findByRole('button', { name: 'Choose places' }, SLOW))
    await userEvent.click(await screen.findByRole('button', { name: /^Pin 1/ }, SLOW))
    await userEvent.click(screen.getByRole('button', { name: 'Save 1 place' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Back to Stories' }, SLOW))
    expect(await screen.findByText('Leave without saving?', undefined, SLOW)).toBeInTheDocument()
  }, 40000)
})
