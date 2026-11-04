import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useRowSlide } from '@/features/content/hooks/use-row-slide'

// jsdom has no layout: a row's offsetTop is its place among its siblings.
const offsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')
const animate = vi.fn()

function List({ ids }: { ids: string[] }) {
  const slide = useRowSlide(ids)
  return <ul>{ids.map(id => <li key={id} ref={slide(id)}>{id}</li>)}</ul>
}

function reducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({ matches: matches && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  animate.mockReset()
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get(this: HTMLElement) { return this.parentElement ? [...this.parentElement.children].indexOf(this) * 100 : 0 } })
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, writable: true, value: animate })
  reducedMotion(false)
})

afterEach(() => {
  if (offsetTop)
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', offsetTop)
  Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

describe('[E4.4] row slide', () => {
  it('[E4.4][AC38] only the rows that move slide, each from its old place', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)
    expect(animate).not.toHaveBeenCalled()

    act(() => rerender(<List ids={['c', 'a', 'b']} />))

    expect(animate).toHaveBeenCalledTimes(3)
    const from = animate.mock.calls.map(call => (call[0] as { transform: string }[])[0]!.transform)
    expect(from).toEqual(expect.arrayContaining(['translateY(200px)', 'translateY(-100px)']))
  })

  it('[E4.4][AC38] a row that keeps its place does not slide', () => {
    const { rerender } = render(<List ids={['a', 'b', 'c']} />)

    act(() => rerender(<List ids={['a', 'c', 'b']} />))

    expect(animate).toHaveBeenCalledTimes(2)
  })

  it('[E4.4][AC38] nothing slides under reduced motion', () => {
    reducedMotion(true)
    const { rerender } = render(<List ids={['a', 'b']} />)

    act(() => rerender(<List ids={['b', 'a']} />))

    expect(animate).not.toHaveBeenCalled()
  })
})
