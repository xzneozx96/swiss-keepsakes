import type { ReactNode } from 'react'
import type { FakeApi } from './places-support'

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, problem, renderInRouter, storeId } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

// MapLibre needs a canvas, which jsdom has not: the picker is replaced by a button that places a pin.
vi.mock('@/features/places/components/map-picker', () => ({
  MapPicker: ({ onPlace, overlay }: { onPlace: (position: { lat: number, lng: number }) => void, overlay?: ReactNode }) => (
    <div>
      <button type="button" onClick={() => onPlace({ lat: 47.05, lng: 8.3 })}>Place pin</button>
      {overlay}
    </div>
  ),
}))

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

let api: FakeApi

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

const bridge = { street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', formatted: 'Kapellbrücke 1, 6004 Luzern' }
const lake = { street: 'Seestrasse', houseNumber: '2', postcode: '6004', city: 'Luzern', formatted: 'Seestrasse 2, 6004 Luzern' }
const linkAt = (lat: number, lng: number) => `https://www.google.com/maps/place/X/@${lat},${lng},17z/data=!3d${lat}!4d${lng}`

const lookups = () => api.calls.filter(call => call.path.startsWith(`/api/store/${storeId}/address-at`))
const address = () => screen.getByLabelText<HTMLInputElement>(/^Address/)
const note = () => screen.queryByText('Filled from the map position')
async function paste(text: string) {
  await userEvent.click(screen.getByLabelText('Google Maps link'))
  await userEvent.paste(text)
}

async function open(placeId: string, language: 'en' | 'de' = 'en') {
  await renderInRouter(<PlaceEditorScreen placeId={placeId} start={undefined} />, { path: `/store/content/places/${placeId}`, language })
  await screen.findByRole('heading', { name: language === 'de' ? /Ort auf der Karte$/ : /Place on the map$/, level: 2 })
}

const answerWith = (found: unknown) => (call: { path: string }) => (call.path.startsWith(`/api/store/${storeId}/address-at`) ? Response.json(found) : undefined)

describe('the Address field fills itself from the map position', () => {
  it('fills the empty Address field from a pasted link, and says where the text came from', async () => {
    api.answer = answerWith(bridge)
    await open('new')

    await paste(linkAt(47.0516489, 8.3075351))

    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(note()).toBeInTheDocument()
    expect(lookups()).toHaveLength(1)
    expect(lookups()[0]).toMatchObject({ method: 'GET', path: `/api/store/${storeId}/address-at?lat=47.05165&lng=8.30754` })
  })

  it('fills it after a tap on the map too', async () => {
    api.answer = answerWith(bridge)
    await open('new')

    await userEvent.click(screen.getByRole('button', { name: 'Place pin' }))

    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(lookups()[0]).toMatchObject({ path: `/api/store/${storeId}/address-at?lat=47.05&lng=8.3` })
  })

  it('never overwrites what the merchant typed, even when the answer arrives after the typing', async () => {
    api.answer = answerWith(bridge)
    await open('new')
    await userEvent.type(address(), 'My own text')

    await userEvent.click(screen.getByRole('button', { name: 'Place pin' }))
    await waitFor(() => expect(lookups()).toHaveLength(1))

    expect(address()).toHaveValue('My own text')
    expect(note()).not.toBeInTheDocument()
  })

  it('does not overwrite text typed while the lookup was running', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    api.answer = call => (call.path.startsWith(`/api/store/${storeId}/address-at`)
      ? new Response(new ReadableStream({ async start(controller) {
          await held
          controller.enqueue(new TextEncoder().encode(JSON.stringify(bridge)))
          controller.close()
        } }), { headers: { 'Content-Type': 'application/json' } })
      : undefined)
    await open('new')

    await userEvent.click(screen.getByRole('button', { name: 'Place pin' }))
    await waitFor(() => expect(lookups()).toHaveLength(1))
    await userEvent.type(address(), 'Typed meanwhile')
    release()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(address()).toHaveValue('Typed meanwhile')
    expect(note()).not.toBeInTheDocument()
  })

  it('takes the answer of the last position only: an answer that comes late for an earlier one is ignored', async () => {
    let releaseFirst: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    api.answer = (call) => {
      if (!call.path.startsWith(`/api/store/${storeId}/address-at`))
        return undefined
      if (call.path.includes('lat=47.05&')) {
        return new Response(new ReadableStream({ async start(controller) {
          await held
          controller.enqueue(new TextEncoder().encode(JSON.stringify(bridge)))
          controller.close()
        } }), { headers: { 'Content-Type': 'application/json' } })
      }

      return Response.json(lake)
    }
    await open('new')

    await paste(linkAt(47.05, 8.3))
    await waitFor(() => expect(lookups()).toHaveLength(1))
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste(linkAt(47.06, 8.31))
    await waitFor(() => expect(address()).toHaveValue('Seestrasse 2, 6004 Luzern'))
    releaseFirst()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(lookups()).toHaveLength(2)
    expect(address()).toHaveValue('Seestrasse 2, 6004 Luzern')
  })

  it('waits for a drag to rest: pins set in quick succession make one lookup, for the last position', async () => {
    api.answer = answerWith(lake)
    await open('new')

    await paste(linkAt(47.05, 8.3))
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste(linkAt(47.06, 8.31))

    await waitFor(() => expect(address()).toHaveValue('Seestrasse 2, 6004 Luzern'))
    expect(lookups()).toHaveLength(1)
    expect(lookups()[0]).toMatchObject({ path: `/api/store/${storeId}/address-at?lat=47.06&lng=8.31` })
  })

  it('moves the filled address with the pin while the merchant has not touched it, and stops once they edit it', async () => {
    let found: unknown = bridge
    api.answer = call => (call.path.startsWith(`/api/store/${storeId}/address-at`) ? Response.json(found) : undefined)
    await open('new')

    await paste(linkAt(47.05, 8.3))
    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))

    found = lake
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste(linkAt(47.06, 8.31))
    await waitFor(() => expect(address()).toHaveValue('Seestrasse 2, 6004 Luzern'))
    expect(note()).toBeInTheDocument()

    await userEvent.type(address(), ' (north side)')
    expect(note()).not.toBeInTheDocument()

    found = bridge
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste(linkAt(47.07, 8.32))
    await waitFor(() => expect(lookups()).toHaveLength(3))
    expect(address()).toHaveValue('Seestrasse 2, 6004 Luzern (north side)')
  })

  it.each([
    ['no building near (404)', () => problem(404, 'address-not-found')],
    ['the register being down (503)', () => problem(503, 'address-lookup-unavailable')],
    ['an answer that is not JSON', () => new Response('<html>', { status: 200 })],
  ])('is silent for %s: the field stays empty and no message shows', async (_name, answer) => {
    api.answer = call => (call.path.startsWith(`/api/store/${storeId}/address-at`) ? answer() : undefined)
    await open('new')

    await userEvent.click(screen.getByRole('button', { name: 'Place pin' }))
    await waitFor(() => expect(lookups()).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(address()).toHaveValue('')
    expect(note()).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="toast"], .toast')).toBeNull()
  })

  it('does not ask for the position a saved place opens with', async () => {
    api.pin = pinOf({ latitude: 47.05, longitude: 8.3 })
    api.answer = answerWith(bridge)
    await open(api.pin.id)

    await new Promise(resolve => setTimeout(resolve, 600))

    expect(lookups()).toHaveLength(0)
    expect(address()).toHaveValue('')
  })

  it('says it in German with the formal address', async () => {
    api.answer = answerWith(bridge)
    await open('new', 'de')

    await userEvent.click(screen.getByRole('button', { name: 'Place pin' }))

    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>(/^Adresse/)).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(screen.getByText('Aus der Kartenposition übernommen')).toBeInTheDocument()
  })
})
