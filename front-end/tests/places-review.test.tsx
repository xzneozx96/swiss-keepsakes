import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, renderInRouter, uuid } from './places-support'
import { FakeMarker, resetFakeMaps } from './support/fake-maplibre'

// The first review of a file loads the lazy preview and the guest map's modules, which takes longer than a second when the machine is busy.
configure({ asyncUtilTimeout: 5000 })

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

// MapLibre needs a canvas, which jsdom has not: the picker is a stub and the review's guest map uses the fake MapLibre.
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
  api.stories = [{ groupId: storyId, kind: 'story', title: { en: 'The bridge' }, languages: { en: 'published', de: 'none' }, publishedLanguages: ['en'] }]
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

const text = { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, tip: { en: 'Go early' }, localTip: {}, coverAlt: {}, photoAlt: {} }
const draft = (over = {}) => pinOf({ id: uuid(10), latitude: 47.05, longitude: 8.3, mainStoryGroupId: storyId, dates: [{ id: uuid(30), firstDay: '2099-01-10', lastDay: '2099-01-10', startTime: '18:00', endTime: '19:30' }], draft: text, ...over })

async function openReview(pin = draft()) {
  api.pin = pin
  await renderInRouter(<PlaceEditorScreen placeId={pin.id} start={undefined} />, { path: `/store/content/places/${pin.id}` })
  await userEvent.click((await screen.findAllByRole('button', { name: /Review and publish/ })).at(0)!)

  return await screen.findByRole('region', { name: 'The place on the guest map' })
}

const card = () => screen.getByRole('article')

describe('[E4.2][AC68] N17 the review is a phone with the guest map', () => {
  it('draws the draft with the guest map\'s own pin and card: title, next date, story link, pin selected', async () => {
    const phone = await openReview()

    await waitFor(() => expect(FakeMarker.instances).toHaveLength(1))
    expect(within(phone).getByRole('heading', { name: 'Chapel Bridge', level: 2 })).toBeInTheDocument()
    expect(within(card()).getByText(/18:00–19:30/)).toBeInTheDocument()
    expect(within(FakeMarker.instances[0]!.element).getByRole('button', { pressed: true })).toBeInTheDocument()
    // The preview stays on its page: Show more opens the place's sheet in the phone, whose story row is a button, not a link.
    await userEvent.click(within(card()).getByRole('button', { name: 'Show more' }))
    const sheet = await screen.findByRole('dialog', { name: 'Chapel Bridge' })

    expect(phone).toContainElement(sheet)
    expect(within(sheet).getByRole('button', { name: /Read the story/ })).toBeInTheDocument()
    expect(within(sheet).queryAllByRole('link').filter(link => link.getAttribute('href')?.includes('/stories/'))).toHaveLength(0)
  })

  it('[E4.7][N03][AC89] gives the card Show more and Open in Google Maps, and the sheet the draft\'s address, hours and outbound link', async () => {
    await openReview(draft({
      address: 'Kapellbrücke, 6003 Luzern',
      mapsLink: 'https://maps.app.goo.gl/abc',
      outboundUrl: 'https://hotel.example/rooms',
      weeklyHours: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, opens: '08:00', closes: '18:00' })),
    }))

    const directions = within(card()).getByRole('link', { name: 'Open in Google Maps' })

    expect(directions).toHaveAttribute('href', 'https://maps.app.goo.gl/abc')
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions.getAttribute('rel')).toContain('noreferrer')
    await userEvent.click(within(card()).getByRole('button', { name: 'Show more' }))
    const sheet = await screen.findByRole('dialog', { name: 'Chapel Bridge' })

    expect(within(sheet).getByText('Kapellbrücke, 6003 Luzern')).toBeInTheDocument()
    expect(within(sheet).getByText('08:00–18:00')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: /hotel\.example/ })).toHaveAttribute('href', 'https://hotel.example/rooms')
    expect(within(sheet).queryByRole('button', { name: /book|buy|pay|reserve/i })).not.toBeInTheDocument()
  })

  it('shows the German version after the switch, and no story link when the story is not published in German', async () => {
    const phone = await openReview()

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))

    expect(await within(phone).findByRole('heading', { name: 'Kapellbrücke', level: 2 })).toBeInTheDocument()
    await userEvent.click(within(card()).getByRole('button', { name: 'Mehr anzeigen' }))

    expect(within(await screen.findByRole('dialog', { name: 'Kapellbrücke' })).queryByRole('button', { name: /Geschichte lesen/ })).not.toBeInTheDocument()
  })

  it('shows the other language\'s title and says so when the chosen language has none', async () => {
    const phone = await openReview(draft({ draft: { ...text, title: { en: 'Chapel Bridge' } } }))

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))

    expect(within(phone).getByRole('heading', { name: 'Chapel Bridge', level: 2 })).toHaveAttribute('lang', 'en')
    expect(screen.getByText('There is no German title yet. Guests reading German see the English one.')).toBeInTheDocument()
  })

  it('puts the tips (two lines at most) and the first category name on the card, in the previewed language', async () => {
    api.categories = [
      { id: uuid(20), slug: 'walks', name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 0, useCount: 1 },
      { id: uuid(21), slug: 'views', name: { en: 'Views' }, parentId: null, position: 2, childCount: 0, useCount: 1 },
    ]
    await openReview(draft({ categoryIds: [uuid(20), uuid(21)], draft: { ...text, tip: { en: 'Go early', de: 'Früh kommen' } } }))

    expect(within(await screen.findByRole('article')).getByText('Go early')).toHaveClass('line-clamp-2')
    expect(await within(card()).findByText(/^Walks/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))

    expect(await within(card()).findByText('Früh kommen')).toHaveAttribute('lang', 'de')
    expect(within(card()).getByText(/^Wanderungen/)).toBeInTheDocument()
  })

  it('shows no tip and no category on a card of a draft that has neither', async () => {
    await openReview(draft({ draft: { ...text, tip: {} } }))

    expect(within(card()).queryByText('Go early')).not.toBeInTheDocument()
  })

  it('[E4.7][N03] has no Open in Google Maps on the card or in the sheet while the place has no position', async () => {
    await openReview(draft({ latitude: null, longitude: null, address: 'Kapellbrücke 1' }))

    expect(within(card()).queryByRole('link', { name: 'Open in Google Maps' })).not.toBeInTheDocument()
    await userEvent.click(within(card()).getByRole('button', { name: 'Show more' }))
    const sheet = await screen.findByRole('dialog', { name: 'Chapel Bridge' })

    expect(within(sheet).getByText('Kapellbrücke 1')).toBeInTheDocument()
    expect(within(sheet).queryByRole('link', { name: 'Open in Google Maps' })).not.toBeInTheDocument()
  })

  it('has no pin to draw and says why while the place has no position', async () => {
    await openReview(draft({ latitude: null, longitude: null }))

    expect(screen.getByText('The pin shows here once you choose the place on the map.')).toBeInTheDocument()
    expect(FakeMarker.instances).toHaveLength(0)
  })

  it('jumps to the step of a checklist item with its Edit button', async () => {
    await openReview(draft({ latitude: null, longitude: null }))

    await userEvent.click(screen.getByRole('button', { name: 'Edit: A location on the map' }))

    expect(await screen.findByRole('heading', { name: /Place on the map$/, level: 2 })).toBeInTheDocument()
  })

  it('keeps Delete draft and the map link beside the phone, and Publish only in the step bar', async () => {
    await openReview()

    expect(screen.getAllByRole('button', { name: 'Publish' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Delete draft' })).toBeInTheDocument()
    expect(screen.getByText('Made from the title when you publish')).toBeInTheDocument()
    expect(screen.queryByText(/Publishing puts the pin on the guest map/)).not.toBeInTheDocument()
  })
})
