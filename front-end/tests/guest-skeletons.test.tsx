import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  ArticleSkeleton,
  CartSkeleton,
  GiftDetailSkeleton,
  OrderDetailSkeleton,
  OrderListSkeleton,
  RequestSentSkeleton,
  ReviewSkeleton,
} from '@/components/layout/guest-skeletons'
import { RoutePending } from '@/components/route-fallbacks'

/** The generic stand-in the screens used to show: a full-width big rounded box. */
function genericBox(root: HTMLElement) {
  return root.querySelector('.h-16.w-full.rounded-3xl, .h-40.w-full.rounded-3xl, .h-44.w-full.rounded-2xl, .h-48.w-full.rounded-3xl, .h-64.w-full.rounded-3xl, .h-72.w-full.rounded-3xl, .h-24.w-full.rounded-3xl')
}
function count(root: HTMLElement, selector: string) {
  return root.querySelectorAll(selector).length
}

describe('guest screens loading', () => {
  it('cart: bar, note, gift slips with detail rows and a bottom bar with select all', () => {
    const { container } = render(<CartSkeleton />)

    expect(genericBox(container)).toBeNull()
    expect(count(container, 'li.rounded-3xl.bg-surface.shadow-surface')).toBe(2)
    expect(count(container, 'li:first-child .size-4')).toBe(4)
    expect(container.querySelector('[data-skeleton="note"]')).not.toBeNull()
    expect(container.querySelector('[data-skeleton="bar"] .size-6')).not.toBeNull()
  })

  it('review: intro note, order cards in three divided parts, bottom bar', () => {
    const { container } = render(<ReviewSkeleton />)

    expect(genericBox(container)).toBeNull()
    expect(count(container, '.divide-y.rounded-3xl.shadow-surface')).toBe(2)
    expect(container.querySelector('[data-skeleton="note"]')).not.toBeNull()
    expect(container.querySelector('[data-skeleton="bar"]')).not.toBeNull()
  })

  it('request sent: success mark, title lines, two sections and a full-width button', () => {
    const { container } = render(<RequestSentSkeleton />)

    expect(genericBox(container)).toBeNull()
    expect(container.querySelector('.size-14.rounded-full')).not.toBeNull()
    expect(count(container, 'section')).toBe(2)
    expect(count(container, 'li')).toBe(3)
    expect(container.querySelector('[data-skeleton="bar"] .h-12.w-full')).not.toBeNull()
  })

  it('my orders: tickets with a dashed footer, then past rows in one box', () => {
    const { container } = render(<OrderListSkeleton />)

    expect(genericBox(container)).toBeNull()
    expect(count(container, 'li.rounded-2xl.bg-surface')).toBe(2)
    expect(count(container, '.border-dashed')).toBe(2)
    expect(count(container, 'ul.divide-y li')).toBe(2)
  })

  it('order detail: bar, ticket card, three tabs and a panel card', () => {
    const { container } = render(<OrderDetailSkeleton />)

    expect(genericBox(container)).toBeNull()
    expect(count(container, '[data-skeleton="tabs"] > *')).toBe(3)
    expect(count(container, '.border-dashed')).toBe(1)
    expect(count(container, '.divide-y > *')).toBe(3)
  })

  it('gift detail: 4:3.4 photo and the overlapping sheet with highlight rows', () => {
    const { container } = render(<GiftDetailSkeleton />)

    expect(container.querySelector('.aspect-\\[4\\/3\\.4\\]')).not.toBeNull()
    expect(container.querySelector('.-mt-6.rounded-t-3xl')).not.toBeNull()
    expect(count(container, 'ul li')).toBe(3)
  })

  it('article: tall cover with title lines, then the sheet with the author row', () => {
    const { container } = render(<ArticleSkeleton />)

    expect(container.querySelector('.h-\\[min\\(68dvh\\,540px\\)\\]')).not.toBeNull()
    expect(container.querySelector('.-mt-6.rounded-t-3xl .size-12.rounded-full')).not.toBeNull()
  })

  it('route pending: title and subtitle, then a list card of rows', () => {
    const { container } = render(<RoutePending />)

    expect(genericBox(container)).toBeNull()
    expect(container.querySelector('[aria-busy]')).not.toBeNull()
    expect(count(container, 'ul.rounded-3xl li')).toBe(4)
  })
})
