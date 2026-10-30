import { beforeEach, describe, expect, it } from 'vitest'

import { foldCreditsOnFirstTouch } from '@/components/aerial-map/fold-credits'

let container: HTMLDivElement
let credits: HTMLDetailsElement
let canvas: HTMLCanvasElement

beforeEach(() => {
  container = document.createElement('div')
  credits = document.createElement('details')
  credits.className = 'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show'
  credits.innerHTML = '<summary class="maplibregl-ctrl-attrib-button"></summary><div>© OpenStreetMap</div>'
  canvas = document.createElement('canvas')
  container.append(canvas, credits)
  document.body.replaceChildren(container)
})

const open = () => credits.classList.contains('maplibregl-compact-show')

describe('the map credits fold on the first touch', () => {
  it('starts open: nothing folds them before someone touches the map', () => {
    foldCreditsOnFirstTouch(container)

    expect(open()).toBe(true)
  })

  it.each([
    ['mousedown', () => new MouseEvent('mousedown', { bubbles: true })],
    ['touchstart', () => new Event('touchstart', { bubbles: true })],
    ['wheel', () => new Event('wheel', { bubbles: true })],
    ['dragstart', () => new Event('dragstart', { bubbles: true })],
    ['keydown', () => new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' })],
  ])('folds on %s', (_name, make) => {
    foldCreditsOnFirstTouch(container)
    canvas.dispatchEvent(make())

    expect(open()).toBe(false)
  })

  it('folds once and lets go: a later toggle by the person stays as they left it', () => {
    foldCreditsOnFirstTouch(container)
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    credits.classList.add('maplibregl-compact-show')
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(open()).toBe(true)
  })

  it('leaves the credits alone when the first press is on the credits themselves', () => {
    foldCreditsOnFirstTouch(container)
    credits.querySelector('summary')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(open()).toBe(true)
  })

  it('waits for the credits when the map has not drawn them yet', () => {
    credits.remove()
    foldCreditsOnFirstTouch(container)
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    container.append(credits)
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(open()).toBe(false)
  })

  it('can be stopped before anyone touched the map', () => {
    foldCreditsOnFirstTouch(container)()
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(open()).toBe(true)
  })
})
