import type { FakeApi } from './places-support'

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, problem, renderInRouter, storeId, uuid } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// The stepper's modules ask CSS.supports when they load, and jsdom has none.
vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

// MapLibre needs a canvas, which jsdom has not: the picker is replaced by a button that places a pin.
vi.mock('@/features/places/components/map-picker', () => ({
  MapPicker: ({ onPlace }: { onPlace: (position: { lat: number, lng: number }) => void }) => (
    <button type="button" onClick={() => onPlace({ lat: 47.05, lng: 8.3 })}>Place pin</button>
  ),
}))

let api: FakeApi

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
})

afterEach(() => window.history.pushState({}, '', '/'))

function open(placeId: string, options: { start?: 'dates', language?: 'en' | 'de' } = {}) {
  return renderInRouter(<PlaceEditorScreen placeId={placeId} start={options.start} />, { path: `/store/content/places/${placeId}${options.start ? '?start=dates' : ''}`, language: options.language })
}

const writes = () => api.calls.filter(call => call.method !== 'GET' && call.path.startsWith(`/api/store/${storeId}/pins`))
const press = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))
const type = (label: string, text: string) => userEvent.type(screen.getByLabelText(label), text)
// On a phone the step's title starts with "Step 2 of 6 · ", so a heading is found by how it ends.
const stepName = (name: string) => new RegExp(`${name}$`)
const heading = (name: string) => screen.findByRole('heading', { name: stepName(name), level: 2 })

const livePin = (over = {}) => pinOf({ status: 'published', slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, draft: null, published: { title: { en: 'Chapel Bridge' }, tip: {}, localTip: {} }, firstPublishedAt: '2026-10-29T10:00:00.000Z', rowVersion: 3, ...over })

async function completeNewPin() {
  await heading('Place on the map')
  await press('Place pin')
  await type('Map link', 'chapel-bridge')
  await press('Next')
  await type('Title in English', 'Chapel Bridge')
}

async function nextTo(step: string) {
  for (let i = 0; i < 6 && !screen.queryByRole('heading', { name: stepName(step), level: 2 }); i++)
    await press('Next')
  await heading(step)
}

describe('[E4.2][AC68] N17 a new place', () => {
  it('[E4.2][AC68] starts on the map step with six steps, and no type to choose', async () => {
    await open('new')

    await heading('Place on the map')
    for (const label of ['Place on the map', 'Text and photo', 'Hours and dates', 'Categories and tags', 'Story and link', 'Review and publish'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.queryByText(/type of place/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Draft')
  })

  it('[E4.2][AC68] saves a draft with the position, the map link per title language and a key, then moves to the pin\'s own address', async () => {
    api.pin = pinOf({ id: uuid(10) })
    const { router } = await open('new')
    await completeNewPin()
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins`, key: expect.any(String), body: { title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, interests: [], mustVisit: false, serviceType: null, foodKind: null, photos: [], dates: [], outboundUrl: null } })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/store/content/places/${uuid(10)}`))
  })

  it('[E4.2][AC85][AC68] publishes with a title, a position and a map link and nothing else: a create, then a publish with the new version', async () => {
    api.pin = pinOf({ id: uuid(10), rowVersion: 1 })
    await open('new')
    await completeNewPin()
    await nextTo('Review and publish')
    await press('Publish')

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins`, body: { categoryIds: [], mainStoryGroupId: null } })
    expect(writes()[1]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '1' })
  })

  it('[E4.2][AC68] on the review, each missing item is named, and Publish sends nothing', async () => {
    await open('new')
    await heading('Place on the map')
    await nextTo('Review and publish')

    const list = within(screen.getByRole('region', { name: 'Needed to publish' }))
    expect(list.getAllByText('missing')).toHaveLength(3)
    expect(list.getByText('A title in English or German')).toBeInTheDocument()
    await press('Publish')

    expect(writes()).toHaveLength(0)
    expect(await screen.findByText('To publish, fix the steps marked red.')).toBeInTheDocument()
  })

  it('[E4.2][AC68] a title in German alone completes the title item, and German text is saved under de', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await type('Title in German', 'Kapellbrücke')
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ title: { de: 'Kapellbrücke' } })
    expect((writes()[0]!.body as { title: object }).title).not.toHaveProperty('en')
  })

  it('[E4.2][AC68] a map link that another place uses sends the editor back to it with the words of the refusal', async () => {
    api.answer = call => (call.method === 'POST' ? problem(409, 'content-slug-taken') : undefined)
    await open('new')
    await completeNewPin()
    await press('Save draft')

    expect(await screen.findAllByText('Another place already uses this map link. Pick a different one.')).not.toHaveLength(0)
    await heading('Place on the map')
  })

  it('[E4.2][AC68] a map link with capitals or spaces is refused in the field, and nothing is sent', async () => {
    await open('new')
    await heading('Place on the map')
    await type('Map link', 'Chapel Bridge')

    expect(await screen.findByText(/Use small letters, numbers and dashes only/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fix 1 problem before saving.')
    await press('Save draft')
    expect(writes()).toHaveLength(0)
  })
})

describe('[E4.2][AC86] N17 dates and Add event', () => {
  it('[E4.2][AC86] Add event opens a new place on the dates step with one date entry ready', async () => {
    await open('new', { start: 'dates' })

    await heading('Hours and dates')
    expect(screen.getByText('Date 1')).toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Draft')
  })

  it('[E4.2][AC86] 22:00 to 00:30 is refused in words and blocks the save, and a late event with no end is accepted', async () => {
    await open('new', { start: 'dates' })
    await heading('Hours and dates')
    await type('1 · Day', '2026-11-14')
    await type('1 · Starts', '22:00')
    await type('1 · Ends', '00:30')

    expect(await screen.findByText(/A date cannot run past midnight/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fix 1 problem before saving.')
    await press('Save draft')
    expect(writes()).toHaveLength(0)

    await userEvent.clear(screen.getByLabelText('1 · Ends'))
    await waitFor(() => expect(screen.queryByText(/A date cannot run past midnight/)).not.toBeInTheDocument())
    api.pin = pinOf({ id: uuid(10) })
    await press('Save draft')
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ dates: [{ firstDay: '2026-11-14', lastDay: '2026-11-14', startTime: '22:00', endTime: null }] })
  })

  it('[E4.2][AC86] weekly hours are written per day and a close before the open is refused', async () => {
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await press('Next')
    await heading('Hours and dates')
    await userEvent.click(screen.getByRole('button', { name: 'Add hours for Mon' }))
    await type('Mon · Opens', '18:00')
    await type('Mon · Closes', '09:00')

    expect(await screen.findByText(/Closing must be after opening/)).toBeInTheDocument()
  })
})

describe('[E4.2][AC41][AC68] N17 tags and the home fields', () => {
  it('[E4.2][AC41] offers the five fixed interests, and saves local-activities with the home fields', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')

    for (const label of ['History and culture', 'Food and drink', 'Lake and mountains', 'Shopping and keepsakes', 'Local activities'])
      expect(screen.getByRole('checkbox', { name: new RegExp(label) })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox', { name: /History|Food and drink|Lake|Shopping|Local activities/ })).toHaveLength(5)
    await userEvent.click(screen.getByRole('checkbox', { name: /Local activities/ }))
    await userEvent.click(screen.getByRole('switch', { name: /Must-visit/ }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ interests: ['local-activities'], mustVisit: true })
  })

  it('[E4.2][AC68] lists the map categories of the store and saves the ones ticked', async () => {
    api.categories = [
      { id: uuid(20), slug: 'walks', name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 1, useCount: 0 },
      { id: uuid(21), slug: 'old-town', name: { en: 'Old town', de: 'Altstadt' }, parentId: uuid(20), position: 1, childCount: 0, useCount: 0 },
    ]
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')
    await userEvent.click(await screen.findByRole('checkbox', { name: /Old town/ }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ categoryIds: [uuid(21)] })
  })
})

describe('[E4.2][AC63][AC68] N17 story and link', () => {
  it('[E4.2][AC63] the outbound link must be https, and a change is saved on the pin', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Story and link')
    await type('Outbound link', 'http://hotel.example')

    expect(await screen.findByText(/full web address that starts with https/)).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Outbound link'))
    await type('Outbound link', 'https://hotel.example/stay')
    expect(screen.getByText(/Every page that shows this pin uses this link/)).toBeInTheDocument()
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ outboundUrl: 'https://hotel.example/stay' })
  })

  it('[E4.2][AC85] the main story is optional, and one with no live language shows which language misses it', async () => {
    api.stories = [{ groupId: uuid(30), kind: 'story', title: { en: 'The bridge' }, publishedLanguages: ['en'] }]
    api.pin = pinOf({ id: uuid(10), mainStoryGroupId: uuid(30) })
    await open(uuid(10))

    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Story and link/ }).at(0)!)
    await heading('Story and link')
    expect(await screen.findByText(/Guests reading German see no story link/)).toBeInTheDocument()
    expect(screen.queryByText(/No main story. The pin publishes without one/)).not.toBeInTheDocument()
  })
})

describe('[E4.2][AC68] N17 photos', () => {
  const grant = { uploadKey: `${storeId}/up-1.jpg`, url: 'https://storage.test/uploads/up-1', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T12:00:00.000Z', kind: 'image' }
  const media = (status: 'processing' | 'ready') => ({ id: uuid(40), kind: 'image', status, contentType: 'image/jpeg', byteSize: 3, width: 800, height: 600, publicUrl: status === 'ready' ? 'https://storage.test/media/a.jpg' : null, variants: [] })

  it('[E4.2][AC68] uploads through the media endpoints, shows the photo, and saves its id with alt text in both languages', async () => {
    api.pin = pinOf({ id: uuid(10) })
    api.answer = (call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json(grant)
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json(media('processing'), { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${uuid(40)}`)
        return Response.json(media('ready'))
      if (call.method === 'PUT')
        return new Response(null, { status: 200 })
    }
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await userEvent.upload(screen.getAllByTestId('places-photo-input')[0]!, new File(['abc'], 'bridge.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(api.calls.map(call => `${call.method} ${call.path}`)).toContain(`GET /api/store/${storeId}/media/${uuid(40)}`))
    // Without a description yet the picture is decorative, so it has no `img` role.
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'https://storage.test/media/a.jpg'))
    expect(api.calls.find(call => call.method === 'PUT')).toMatchObject({ path: '/uploads/up-1' })
    await userEvent.type(screen.getByLabelText('Photo · Photo description in English'), 'The wooden bridge')
    await userEvent.type(screen.getByLabelText('Photo · Photo description in German'), 'Die Holzbrücke')
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ coverMediaId: uuid(40), coverAlt: { en: 'The wooden bridge', de: 'Die Holzbrücke' } })
  })

  it('[E4.2][AC68] a refused upload says why, and keeps the form', async () => {
    api.answer = call => (call.path === `/api/store/${storeId}/media/uploads` ? problem(422, 'media-type-not-allowed') : undefined)
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await userEvent.upload(screen.getAllByTestId('places-photo-input')[0]!, new File(['abc'], 'a.gif', { type: 'image/jpeg' }))

    expect(await screen.findByText(/This type of file is not allowed/)).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('[E4.2][AC68] more photos keep an order the merchant sets: a photo moves up and the list is sent in that order', async () => {
    api.pin = pinOf({ id: uuid(10), photos: [{ mediaId: uuid(41), alt: { en: 'A' } }, { mediaId: uuid(42), alt: { en: 'B' } }, { mediaId: uuid(43), alt: {} }] })
    api.answer = call => (call.path.includes('/media/') && call.method === 'GET' ? Response.json({ ...media('ready'), id: call.path.split('/').at(-1) }) : undefined)
    await open(uuid(10))
    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
    await userEvent.click(screen.getByRole('button', { name: 'Move photo 3 up' }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.method).toBe('PATCH')
    expect((writes()[0]!.body as { photos: { mediaId: string }[] }).photos.map(photo => photo.mediaId)).toEqual([uuid(41), uuid(43), uuid(42)])
    expect(screen.getByRole('button', { name: 'Move photo 1 up' })).toBeDisabled()
  })
})

describe('[E4.2][AC79][AC85] N17 a pin that exists', () => {
  it('[E4.2][AC79] a published pin saves with its version and no new map link, and a draft the save returns is published after it', async () => {
    api.pin = livePin()
    api.answer = call => (call.method === 'PATCH' ? Response.json(livePin({ rowVersion: 4, draft: { title: { en: 'Chapel Bridge, Lucerne' }, tip: {}, localTip: {} } })) : undefined)
    await open(uuid(10))
    await heading('Place on the map')
    expect(screen.getByTestId('places-status')).toHaveTextContent('Published')
    expect(screen.getByText(/Links already shared use this name/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
    await userEvent.clear(screen.getByLabelText('Title in English'))
    await type('Title in English', 'Chapel Bridge, Lucerne')
    await press('Save changes')

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `/api/store/${storeId}/pins/${uuid(10)}`, ifMatch: '3', body: { title: { en: 'Chapel Bridge, Lucerne' } } })
    expect(writes()[0]!.body).not.toHaveProperty('slug')
    expect(writes()[1]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '4' })
  })

  it('[E4.2][AC79] a published pin is hidden after a confirm, and has no delete', async () => {
    api.pin = livePin()
    await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')

    expect(screen.queryByRole('button', { name: 'Delete draft' })).not.toBeInTheDocument()
    await press('Hide from map')
    await userEvent.click(await screen.findByRole('button', { name: 'Hide pin' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/hide`, ifMatch: '3' })
  })

  it('[E4.2][AC79] a hidden pin is shown again from the review', async () => {
    api.pin = livePin({ status: 'hidden' })
    await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')
    await press('Show on map again')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '3' })
  })

  it('[E4.2][AC79] a draft is deleted from the review after a confirm and the editor goes back to the list', async () => {
    api.pin = pinOf({ id: uuid(10), rowVersion: 2 })
    const { router } = await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')
    await press('Delete draft')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete draft', hidden: false }).then(() => screen.getAllByRole('button', { name: 'Delete draft' }).at(-1)!))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'DELETE', ifMatch: '2' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/store/content/places'))
  })

  it('[E4.2][AC68] a pin that is not in the store is not found, with a way back', async () => {
    api.pin = undefined
    await open(uuid(99))

    expect(await screen.findByText('This place does not exist in your store.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All places' })).toHaveAttribute('href', '/store/content/places')
  })

  it('[E4.2][AC68] shows the editor skeleton while the pin is on its way', async () => {
    let release!: () => void

    api.pin = pinOf({ id: uuid(10) })
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    await open(uuid(10))

    await waitFor(() => expect(document.querySelector('[class*="skeleton"]')).not.toBeNull())
    expect(screen.queryByTestId('place-editor')).not.toBeInTheDocument()
    release()
    expect(await screen.findByTestId('place-editor')).toBeInTheDocument()
  })

  it('[E4.2][AC68] the editor reads in German', async () => {
    await open('new', { language: 'de' })

    await heading('Ort auf der Karte')
    for (const label of ['Text und Foto', 'Öffnungszeiten und Daten', 'Kategorien und Tags', 'Geschichte und Link', 'Prüfen und veröffentlichen'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Entwurf speichern' })).toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Entwurf')
  })
})
