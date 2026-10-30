import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, renderInRouter, uuid } from './places-support'
import { resetFakeMaps } from './support/fake-maplibre'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

vi.mock('@/features/places/components/map-picker', () => ({ MapPicker: () => null }))
vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const storyId = uuid(77)
let api: ReturnType<typeof installApi>

beforeEach(() => {
  resetFakeMaps()
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  api = installApi()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

const text = { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }
const draft = (over = {}) => pinOf({ id: uuid(10), latitude: 47.05, longitude: 8.3, mainStoryGroupId: storyId, draft: text, ...over })

async function openReview(title: Record<string, string>, publishedLanguages: ('en' | 'de')[] = ['en', 'de']) {
  api.stories = [{ groupId: storyId, kind: 'story', title, publishedLanguages }]
  const pin = draft()

  api.pin = pin
  await renderInRouter(<PlaceEditorScreen placeId={pin.id} start={undefined} />, { path: `/store/content/places/${pin.id}` })
  await userEvent.click((await screen.findAllByRole('button', { name: /Review and publish/ })).at(0)!)

  return await screen.findByRole('region', { name: 'The place on the guest map' }, { timeout: 15000 })
}

describe('[E4.2][AC68] the review opens the story in a sheet inside the phone', () => {
  it('opens the linked story in a bottom sheet over the phone, with its title, byline, intro and sections, and the editor still on its page', async () => {
    const phone = await openReview({ en: 'A morning on the Musegg wall', de: 'Ein Morgen auf der Museggmauer' })

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'A morning on the Musegg wall' })

    expect(phone).toContainElement(sheet)
    expect(within(sheet).getByText(/The Musegg wall runs along the hill/)).toBeInTheDocument()
    expect(within(sheet).getByText('Sonja · Owner, Swiss Keepsakes Luzern')).toBeInTheDocument()
    expect(within(sheet).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'The place on the guest map' })).toBeInTheDocument()
  })

  it('shows the story in the previewed language', async () => {
    const phone = await openReview({ en: 'A morning on the Musegg wall', de: 'Ein Morgen auf der Museggmauer' })

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))
    await userEvent.click(await within(phone).findByRole('button', { name: 'Geschichte lesen' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'Ein Morgen auf der Museggmauer' })

    expect(sheet.querySelector('[lang="de"]')).not.toBeNull()
  })

  it('shows a draft version with a note that guests do not see it yet', async () => {
    const phone = await openReview({ de: 'Ein Tag auf dem Pilatus' }, ['de'])

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))
    await userEvent.click(await within(phone).findByRole('button', { name: 'Geschichte lesen' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'Ein Tag auf dem Pilatus' })

    expect(within(sheet).getByText('Diese Version ist ein Entwurf. Gäste sehen sie noch nicht.')).toBeInTheDocument()
  })

  it('says the text is not available when no version of the story is known, and still shows the title', async () => {
    const phone = await openReview({ en: 'A story only the API knows' })

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'A story only the API knows' })

    expect(within(sheet).getByText(/The story text is not available in the preview yet/)).toBeInTheDocument()
  })

  it('closes with the Close button and with Escape, and leaves the card where it was', async () => {
    const phone = await openReview({ en: 'A morning on the Musegg wall' }, ['en'])

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    await userEvent.click((await within(await screen.findByRole('dialog')).findAllByRole('button', { name: 'Close' })).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await within(phone).findByRole('button', { name: 'Read the story' })).toBeInTheDocument()
  })
})
