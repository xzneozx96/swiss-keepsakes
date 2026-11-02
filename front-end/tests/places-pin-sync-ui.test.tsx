import type { FakeApi } from './places-support'

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, renderInRouter } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

// MapLibre needs a canvas, which jsdom has not: the picker is replaced by a stub (tests/support/map-picker-stub.tsx).
vi.mock('@/features/places/components/map-picker', async () => (await import('./support/map-picker-stub')).mapPickerStub)

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
const linkAt = (lat: number, lng: number) => `https://www.google.com/maps/place/X/@${lat},${lng},17z/data=!3d${lat}!4d${lng}`

const linkInput = () => screen.getByLabelText<HTMLInputElement>('Google Maps link')
const address = () => screen.getByLabelText<HTMLInputElement>(/^Address/)
const linkWarning = () => screen.queryByText('The pin moved since you pasted this link.')
const addressWarning = () => screen.queryByText('The pin moved. The address may not match.')
async function paste(text: string) {
  await userEvent.click(linkInput())
  await userEvent.paste(text)
}
// The stubbed map's "Place pin" button puts the pin at 47.05, 8.3.
const movePin = () => userEvent.click(screen.getByRole('button', { name: 'Place pin' }))

async function open() {
  await renderInRouter(<PlaceEditorScreen placeId="new" start={undefined} />, { path: '/store/content/places/new', language: 'en' })
  await screen.findByRole('heading', { name: /Place on the map$/, level: 2 })
}

describe('the pin and the link', () => {
  it('warns when the pin moved after a link was pasted, and a link to the new pin fixes it', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await paste(linkAt(47.0516, 8.3075))
    expect(linkWarning()).not.toBeInTheDocument()

    await movePin()
    expect(linkWarning()).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Use a link to the new pin' }))

    expect(linkInput()).toHaveValue('https://www.google.com/maps?q=47.05,8.3')
    expect(linkWarning()).not.toBeInTheDocument()
    expect(screen.getByText('Pin moved to the link.')).toBeInTheDocument()
  })

  it('remove link empties the field and the warning goes', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await paste(linkAt(47.0516, 8.3075))
    await movePin()

    await userEvent.click(screen.getByRole('button', { name: 'Remove link' }))

    expect(linkInput()).toHaveValue('')
    expect(linkWarning()).not.toBeInTheDocument()
  })

  it('a new link moves the pin back and clears the warning', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await paste(linkAt(47.0516, 8.3075))
    await movePin()
    expect(linkWarning()).toBeInTheDocument()

    await userEvent.clear(linkInput())
    await paste(linkAt(47.06, 8.31))

    expect(linkWarning()).not.toBeInTheDocument()
  })

  it('shows a spinner line while a short link is read', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    api.answer = call => (call.path.includes('maps-link')
      ? new Response(new ReadableStream({ async start(controller) {
          await held
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ latitude: 47.05, longitude: 8.3 })))
          controller.close()
        } }), { headers: { 'Content-Type': 'application/json' } })
      : call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()

    await paste('https://maps.app.goo.gl/AbCdEf123')
    const reading = await screen.findByText('Reading the link…')

    expect(reading.querySelector('[role="status"], .spinner, svg')).not.toBeNull()
    release()
    await waitFor(() => expect(screen.getByText('Pin moved to the link.')).toBeInTheDocument())
  })
})

describe('the pin and the address', () => {
  it('says the address was typed by hand, and warns when the pin moves, with a one-tap fill', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await userEvent.type(address(), 'My own text')
    expect(screen.getByText('Typed by you. Check that the pin matches.')).toBeInTheDocument()
    expect(addressWarning()).not.toBeInTheDocument()

    await movePin()
    expect(addressWarning()).toBeInTheDocument()
    expect(address()).toHaveValue('My own text')

    await userEvent.click(screen.getByRole('button', { name: 'Fill from the pin' }))

    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(addressWarning()).not.toBeInTheDocument()
    expect(screen.getByText('Filled from the map position')).toBeInTheDocument()
  })

  it('has no warning for an address the register filled', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await movePin()
    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))

    expect(screen.queryByText('Typed by you. Check that the pin matches.')).not.toBeInTheDocument()
    expect(addressWarning()).not.toBeInTheDocument()
  })

  it('a link pasted after typing warns that the address may not match', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json(bridge) : undefined)
    await open()
    await userEvent.type(address(), 'My own text')

    await paste(linkAt(47.0516, 8.3075))

    expect(addressWarning()).toBeInTheDocument()
    expect(address()).toHaveValue('My own text')
  })

  it('says so when no address is found at the pin', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json({ type: 'address-not-found', title: 'x', status: 404 }, { status: 404 }) : undefined)
    await open()
    await userEvent.type(address(), 'My own text')
    await movePin()

    await userEvent.click(screen.getByRole('button', { name: 'Fill from the pin' }))

    expect(await screen.findByText('No address near the pin. Type one if it has one.')).toBeInTheDocument()
    expect(address()).toHaveValue('My own text')
  })

  it('says the lookup failed with a Try again that asks again, and never overwrites a typed address', async () => {
    let answers = 0
    api.answer = (call) => {
      if (!call.path.includes('address-at'))
        return undefined
      answers += 1

      return answers === 1 ? Response.json({ type: 'address-lookup-unavailable', title: 'x', status: 503 }, { status: 503 }) : Response.json(bridge)
    }
    await open()
    await movePin()

    expect(await screen.findByText('Couldn\'t look up the address.')).toBeInTheDocument()
    expect(address()).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(address()).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(screen.queryByText('Couldn\'t look up the address.')).not.toBeInTheDocument()
  })

  it('try again leaves a typed address alone, and typing clears the message', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json({ type: 'address-lookup-unavailable', title: 'x', status: 503 }, { status: 503 }) : undefined)
    await open()
    await movePin()
    await screen.findByText('Couldn\'t look up the address.')
    await userEvent.type(address(), 'Mine')
    expect(screen.queryByText('Couldn\'t look up the address.')).not.toBeInTheDocument()
    expect(address()).toHaveValue('Mine')
  })

  it('says no address was found near the pin, without a button', async () => {
    api.answer = call => (call.path.includes('address-at') ? Response.json({ type: 'address-not-found', title: 'x', status: 404 }, { status: 404 }) : undefined)
    await open()
    await movePin()

    expect(await screen.findByText('No address near the pin. Type one if it has one.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows a spinner line while the address is looked up', async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    api.answer = call => (call.path.includes('address-at')
      ? new Response(new ReadableStream({ async start(controller) {
          await held
          controller.enqueue(new TextEncoder().encode(JSON.stringify(bridge)))
          controller.close()
        } }), { headers: { 'Content-Type': 'application/json' } })
      : undefined)
    await open()

    await movePin()
    expect(await screen.findByText('Looking up the address…')).toBeInTheDocument()
    release()
    await waitFor(() => expect(screen.queryByText('Looking up the address…')).not.toBeInTheDocument())
  })
})
