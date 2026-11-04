import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LazyMapView } from '@/components/map/lazy-map-view'
import { useMap } from '@/components/map/map-context'
import { LocaleProvider } from '@/contexts/locale-context'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

// The spy: the factory runs when MapLibre is first imported, so a count of 0 means no MapLibre code has loaded.
const loads = vi.hoisted(() => ({ maplibre: 0, css: 0 }))

vi.mock('maplibre-gl', async () => {
  loads.maplibre += 1

  return (await import('./support/fake-maplibre')).fakeMaplibre
})
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => {
  loads.css += 1

  return {}
})
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

class FakeObserver {
  static all: FakeObserver[] = []

  observed: Element[] = []
  disconnect = vi.fn()

  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
    FakeObserver.all.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }

  unobserve() {}

  takeRecords() {
    return []
  }

  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

const view = { center: [8.3, 47.05] as [number, number], zoom: 15 }

function Probe() {
  const { tabBarSpace } = useMap()

  return <p data-testid="probe">{tabBarSpace}</p>
}

function renderLazy(props: Partial<React.ComponentProps<typeof LazyMapView>> = {}) {
  return render(
    <LocaleProvider>
      <LazyMapView className="h-[548px]" label="The food map" view={view} {...props}>
        <Probe />
      </LazyMapView>
    </LocaleProvider>,
  )
}

const placeholder = () => document.querySelector<HTMLElement>('[data-map-placeholder]')
const observerOf = () => FakeObserver.all.find(item => item.observed.length > 0)!

beforeEach(() => {
  resetFakeMaps()
  FakeObserver.all = []
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[E4.13][AC95] the lazy map mount', () => {
  // First on purpose: the module cache keeps MapLibre once any test has loaded it.
  it('keeps a same-height placeholder and loads no MapLibre or CSS until the frame is near, then mounts the map', async () => {
    const { container } = renderLazy()
    const frame = container.firstElementChild as HTMLElement

    expect(frame).toHaveClass('h-[548px]')
    expect(placeholder()).toBeInTheDocument()
    expect(loads).toEqual({ maplibre: 0, css: 0 })
    expect(observerOf().options?.rootMargin).toBe('600px')
    expect(FakeMap.instances).toHaveLength(0)

    act(() => observerOf().fire(false))
    expect(placeholder()).toBeInTheDocument()
    expect(loads.maplibre).toBe(0)

    act(() => observerOf().fire(true))
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))

    expect(loads).toEqual({ maplibre: 1, css: 1 })
    expect(placeholder()).not.toBeInTheDocument()
    expect(container.firstElementChild).toBe(frame)
    expect(frame).toHaveClass('h-[548px]')
    expect(screen.getByTestId('probe')).toBeInTheDocument()
  })

  it('stays mounted once near, and stops watching', async () => {
    renderLazy()
    const observer = observerOf()

    act(() => observer.fire(true))
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => observer.fire(false))

    expect(FakeMap.instances).toHaveLength(1)
    expect(placeholder()).not.toBeInTheDocument()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})

describe('[E4.13][AC54] the shared map options', () => {
  it('passes cooperativeGestures to the MapLibre constructor when asked, and leaves it off by default', async () => {
    const first = renderLazy({ cooperativeGestures: true })

    act(() => observerOf().fire(true))
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    expect(FakeMap.instances[0]!.options).toMatchObject({ cooperativeGestures: true })
    first.unmount()
    resetFakeMaps()
    FakeObserver.all = []

    renderLazy()
    act(() => observerOf().fire(true))
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    expect(FakeMap.instances[0]!.options).toMatchObject({ cooperativeGestures: false })
  })

  it('reserves the 68 px guest tab bar by default and drops it with tabBarSpace={false}', async () => {
    const first = renderLazy()

    act(() => observerOf().fire(true))
    expect(await screen.findByTestId('probe')).toHaveTextContent('68')
    first.unmount()
    FakeObserver.all = []

    renderLazy({ tabBarSpace: false })
    act(() => observerOf().fire(true))
    expect(await screen.findByTestId('probe')).toHaveTextContent('0')
  })
})
