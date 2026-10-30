import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlusIcon } from '@/components/icons'
import { MapControlButton, MapControls, MapCorner } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { LocaleProvider } from '@/contexts/locale-context'
import { en } from '@/i18n/en'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

async function renderControls(controls: React.ReactNode, props: Partial<React.ComponentProps<typeof MapView>> = {}) {
  render(
    <LocaleProvider>
      <MapView label="Map" view={{ center: [8.3, 47.05], zoom: 15, minZoom: 12, maxZoom: 18.5 }} {...props}>
        {controls}
      </MapView>
    </LocaleProvider>,
  )
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  const map = FakeMap.instances[0]!

  return map
}

function draw(map: FakeMap) {
  act(() => map.emit('load'))
  act(() => map.emit('idle'))
}

// The controls sit inside the map frame's `overlay` slot for the tests that need them pressable.
const frame = () => document.querySelector<HTMLElement>('[data-map-frame]')!

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

describe('[E4.6][AC42] the map controls', () => {
  it('shows nothing until the map has drawn, then zoom in and zoom out in one small pill', async () => {
    const map = await renderControls(<MapControls />)

    expect(screen.queryByRole('button', { name: en['map.zoomIn'] })).toBeNull()
    draw(map)

    const group = screen.getByRole('group', { name: en['map.zoom'] })

    expect(group).toHaveClass('w-8', 'rounded-xl', 'backdrop-blur-md')
    expect(group.querySelectorAll('button')).toHaveLength(2)
  })

  it('zooms the map with the two buttons', async () => {
    const map = await renderControls(<MapControls />)

    draw(map)
    await userEvent.click(screen.getByRole('button', { name: en['map.zoomIn'] }))
    await userEvent.click(screen.getByRole('button', { name: en['map.zoomOut'] }))

    expect(map.zoomIn).toHaveBeenCalledTimes(1)
    expect(map.zoomOut).toHaveBeenCalledTimes(1)
  })

  it('disables zoom in at the closest zoom and zoom out at the widest, after the zoom has ended', async () => {
    const map = await renderControls(<MapControls />)

    draw(map)
    map.zoom = 18.5
    act(() => map.emit('zoomend'))
    expect(screen.getByRole('button', { name: en['map.zoomIn'] })).toBeDisabled()
    map.zoom = 12
    act(() => map.emit('zoomend'))

    expect(screen.getByRole('button', { name: en['map.zoomIn'] })).toBeEnabled()
    expect(screen.getByRole('button', { name: en['map.zoomOut'] })).toBeDisabled()
  })

  it('gives every button a 44 px hit area around its 32 px face', async () => {
    const map = await renderControls(<MapControls fullscreen />)

    draw(map)
    for (const name of [en['map.zoomIn'], en['map.zoomOut'], en['map.fullscreen']]) {
      const button = screen.getByRole('button', { name })

      expect(button).toHaveClass('size-8')
      expect(button.className).toContain('before:-inset-1.5')
    }
  })

  it('shows the compass only on the 3D map, and resets the bearing with it', async () => {
    const flat = await renderControls(<MapControls />)

    draw(flat)
    expect(screen.queryByRole('button', { name: en['map.compass'] })).toBeNull()
  })

  it('turns the compass needle against the bearing without rendering again', async () => {
    const map = await renderControls(<MapControls />, { mode: '3d' })

    draw(map)
    const compass = screen.getByRole('button', { name: en['map.compass'] })
    const needle = compass.querySelector<HTMLElement>('span')!

    map.bearing = -25
    act(() => map.emit('rotate'))
    expect(needle.style.transform).toBe('rotate(25deg)')
    await userEvent.click(compass)

    expect(map.resetNorthPitch).toHaveBeenCalledTimes(1)
  })

  it('toggles fullscreen over the whole page and leaves it with Escape', async () => {
    const map = await renderControls(<MapControls fullscreen />)

    draw(map)
    await userEvent.click(screen.getByRole('button', { name: en['map.fullscreen'] }))

    expect(frame()).toHaveClass('fixed!')
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('button', { name: en['map.exitFullscreen'] })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{Escape}')

    expect(frame()).not.toHaveClass('fixed!')
    expect(document.body.style.overflow).toBe('')
    await userEvent.click(screen.getByRole('button', { name: en['map.fullscreen'] }))
    await userEvent.click(screen.getByRole('button', { name: en['map.exitFullscreen'] }))

    expect(frame()).not.toHaveClass('fixed!')
  })

  it('leaves Escape to a dialog that already took it', async () => {
    const map = await renderControls(<MapControls fullscreen />)

    draw(map)
    await userEvent.click(screen.getByRole('button', { name: en['map.fullscreen'] }))
    const stop = (event: KeyboardEvent) => event.preventDefault()

    document.addEventListener('keydown', stop)
    await userEvent.keyboard('{Escape}')
    document.removeEventListener('keydown', stop)

    expect(frame()).toHaveClass('fixed!')
  })

  it('puts the controls under the screen\'s own row (insets.top + 8) unless the screen says where', async () => {
    const map = await renderControls(<MapControls />, { insets: { top: 60, bottom: 0 } })

    draw(map)

    expect(screen.getByRole('group', { name: en['map.zoom'] }).parentElement).toHaveStyle({ top: '68px' })
  })

  it('shows more round buttons below, with the danger look on a destructive one', async () => {
    const onPress = vi.fn()
    const map = await renderControls(
      <MapControls>
        <MapControlButton icon={PlusIcon} label="Remove position" tone="danger" onPress={onPress} />
      </MapControls>,
    )

    draw(map)
    const remove = screen.getByRole('button', { name: 'Remove position' })

    expect(remove.className).toContain('--button-fg:var(--danger)')
    await userEvent.click(remove)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('places a corner for the screen\'s own pills', async () => {
    await renderControls(
      <MapCorner corner="top-left">
        <button type="button">Whole route</button>
      </MapCorner>,
    )

    expect(screen.getByRole('button', { name: 'Whole route' }).parentElement).toHaveClass('start-3', 'top-3')
  })
})
