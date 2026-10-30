import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMap } from '@/components/map/map-context'
import { MapView } from '@/components/map/map-view'
import { LocaleProvider } from '@/contexts/locale-context'
import { en } from '@/i18n/en'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const view = { center: [8.3, 47.05] as [number, number], zoom: 15 }

function Layer() {
  const { state, drawn } = useMap()

  return <p data-testid="layer">{`${state} ${drawn}`}</p>
}

function renderMap(props: Partial<React.ComponentProps<typeof MapView>> = {}) {
  return render(
    <LocaleProvider>
      <MapView className="relative h-96" label="The test map" view={view} {...props}>
        <Layer />
      </MapView>
    </LocaleProvider>,
  )
}

const overlay = () => document.querySelector<HTMLElement>('[data-skeleton="map"]')

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[E4.6][G11] the shared map view', () => {
  it('blurs the map area with a spinner and the words "Loading the map" until the map has drawn, then fades out', async () => {
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    expect(overlay()).toHaveAttribute('role', 'status')
    expect(overlay()).toHaveAttribute('aria-busy', 'true')
    expect(overlay()).toHaveClass('backdrop-blur-md')
    expect(overlay()).toHaveTextContent(en['map.loadingMap'])
    // The style has loaded, but the tiles have not been drawn: the overlay stays.
    act(() => map.emit('load'))
    expect(overlay()).toHaveAttribute('aria-busy', 'true')
    act(() => map.emit('idle'))

    expect(overlay()).toHaveAttribute('aria-busy', 'false')
    expect(overlay()).toHaveClass('opacity-0')
    await waitFor(() => expect(overlay()).toBeNull())
  })

  it('names the canvas and gives the layers the map and its state', async () => {
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    await waitFor(() => expect(map.getCanvas()).toHaveAttribute('aria-label', 'The test map'))
    expect(screen.getByTestId('layer')).toHaveTextContent('loading false')
    act(() => map.emit('load'))
    act(() => map.emit('idle'))

    expect(screen.getByTestId('layer')).toHaveTextContent('ready true')
  })

  it('shows a notice with a retry when the map fails, calls onFailed, and builds a new map on retry', async () => {
    const onFailed = vi.fn()

    renderMap({ onFailed })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    expect(screen.getByRole('alert')).toHaveTextContent(en['map.failed.title'])
    expect(onFailed).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: en['map.failed.retry'] }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
    expect(FakeMap.instances[0]!.remove).toHaveBeenCalled()
  })

  it('passes its own retry to a screen that fails for its own reasons', async () => {
    const onRetry = vi.fn()

    renderMap({ status: 'failed', onRetry })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: en['map.failed.retry'] }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(FakeMap.instances).toHaveLength(1)
  })

  it('shows the screen\'s own state only once the map has drawn', async () => {
    renderMap({ status: 'pins-loading' })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))

    expect(screen.queryByText(en['map.loading'])).toBeNull()
    act(() => FakeMap.instances[0]!.emit('load'))
    act(() => FakeMap.instances[0]!.emit('idle'))

    expect(screen.getByText(en['map.loading'])).toBeInTheDocument()
  })

  it('reports a click on the map as a position', async () => {
    const onMapClick = vi.fn()

    renderMap({ onMapClick })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    await waitFor(() => expect(FakeMap.instances[0]!.listeners.get('click')).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('click', { lngLat: { lng: 8.31, lat: 47.06 } }))

    expect(onMapClick).toHaveBeenCalledWith([8.31, 47.06])
  })

  it('puts the credits at the bottom right, lifted by the inset, and folds them on the first touch', async () => {
    renderMap({ insets: { top: 60, bottom: 200 } })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const credits = document.querySelector<HTMLElement>('[data-map-credits]')!

    expect(credits).toHaveClass('end-2')
    expect(credits.style.bottom).toContain('200px')
    expect(screen.getAllByRole('link')).toHaveLength(4)
    fireEvent.pointerDown(document.querySelector('[data-map-frame]')!)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByRole('button', { name: en['map.credits'] })).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the credits in the corner when the screen says so, whatever its insets are', async () => {
    renderMap({ insets: { top: 60, bottom: 245 }, creditsBottom: 8 })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))

    expect(document.querySelector<HTMLElement>('[data-map-credits]')!.style.bottom).toContain('8px')
  })

  it('fills the frame its screen gives it: the frame takes the screen\'s position only, and the canvas sits in a box that covers it', async () => {
    renderMap({ className: 'absolute inset-0' })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const frame = document.querySelector<HTMLElement>('[data-map-frame]')!
    const box = FakeMap.instances[0]!.getCanvas().parentElement!.parentElement!

    // A `relative` of its own would beat `absolute inset-0` and leave the map as tall as its content (430x300 in a 1127 px section).
    expect(frame.className.split(' ')).not.toContain('relative')
    expect(frame).toHaveClass('absolute', 'inset-0')
    expect(box).toHaveClass('absolute', 'inset-0')
  })

  it('resizes the map when its container changes size', async () => {
    let notify = () => {}

    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        notify = callback
      }

      observe() {}
      unobserve() {}
      disconnect() {}
    })
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!
    // The load starts a resize of its own on `load`; count from here.
    map.resize.mockClear()
    notify()

    expect(map.resize).toHaveBeenCalledTimes(1)
  })

  it('makes the map a picture when it is inert, and leaves the credits pressable', async () => {
    renderMap({ inert: true, interactive: false })
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))

    expect(FakeMap.instances[0]!.options).toMatchObject({ interactive: false })
    expect(FakeMap.instances[0]!.getCanvas().closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('button', { name: en['map.credits'] }).closest('[inert]')).toBeNull()
  })
})
