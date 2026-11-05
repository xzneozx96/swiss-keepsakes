import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InfiniteList } from '@/components/infinite-list'
import { LocaleProvider } from '@/contexts/locale-context'

type Props = Partial<Parameters<typeof InfiniteList>[0]>

function list(props: Props = {}) {
  return (
    <LocaleProvider>
      <InfiniteList announce={n => `${n} more things`} count={10} endText="That’s all 25 things" hasMore isFailed={false} isLoading={false} onLoadMore={() => {}} {...props}>
        <ul>
          <li>row</li>
        </ul>
      </InfiniteList>
    </LocaleProvider>
  )
}

interface FakeObserver { callback: IntersectionObserverCallback, options?: IntersectionObserverInit, observed: Element[], disconnected: boolean }
const observers: FakeObserver[] = []

function stubObserver() {
  vi.stubGlobal('IntersectionObserver', class {
    fake: FakeObserver
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.fake = { callback, options, observed: [], disconnected: false }
      observers.push(this.fake)
    }

    observe(element: Element) {
      this.fake.observed.push(element)
    }

    disconnect() {
      this.fake.disconnected = true
    }
  })
}

const near = (observer: FakeObserver) => observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)

afterEach(() => {
  observers.length = 0
  vi.unstubAllGlobals()
})

describe('[ADR-033] InfiniteList', () => {
  it('loads the next page when the sentinel nears the viewport, a screen away', () => {
    stubObserver()
    const onLoadMore = vi.fn()
    render(list({ onLoadMore }))

    expect(observers.at(-1)?.options?.rootMargin).toBe('100% 0px')
    act(() => near(observers.at(-1)!))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not load while a page is loading, after a failure, or at the end', () => {
    stubObserver()
    const onLoadMore = vi.fn()
    render(list({ onLoadMore, isLoading: true }))
    render(list({ onLoadMore, isFailed: true }))
    render(list({ onLoadMore, hasMore: false }))

    expect(observers).toHaveLength(0)
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('the sentinel is a real Load more button that a keyboard user presses', async () => {
    const onLoadMore = vi.fn()
    render(list({ onLoadMore }))
    const user = userEvent.setup()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Load more' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('works without IntersectionObserver, through the button', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    render(list())

    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
  })

  it('announces what arrived in a polite live region and leaves focus where it is', async () => {
    const { rerender } = render(list({ count: 10 }))
    const user = userEvent.setup()
    await user.tab()
    const button = screen.getByRole('button', { name: 'Load more' })
    expect(screen.getByRole('status')).toHaveTextContent('')

    rerender(list({ count: 20 }))

    expect(screen.getByRole('status')).toHaveTextContent('10 more things')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(button).toHaveFocus()
  })

  it('shows the end line and no button when there is no next page', () => {
    render(list({ hasMore: false }))

    expect(screen.getByText('That’s all 25 things')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('a failed page shows Try again in place of Load more, and only a press retries', async () => {
    const onLoadMore = vi.fn()
    render(list({ isFailed: true, onLoadMore }))

    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('The next page did not load.')
    expect(onLoadMore).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
