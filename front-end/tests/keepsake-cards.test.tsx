import type { ProductCardProps } from '@/features/catalog/components/product-card'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { ProductCard } from '@/features/catalog/components/product-card'
import { photosOf } from '@/features/catalog/lib/card-photos'

const base: ProductCardProps = { slug: 'mug', name: 'Kapellbrücke mug', storeName: 'Swiss Native', subtitle: 'Hand-painted ceramic' }

async function renderCard(props: Partial<ProductCardProps>) {
  await loadDictionary('en')
  localStorage.setItem('sk.language', JSON.stringify('en'))
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/en/gifts', component: () => <ProductCard {...base} {...props} /> })
  const slug = createRoute({ getParentRoute: () => root, path: '/en/gifts/$slug', component: () => null })
  const router = createRouter({
    routeTree: root.addChildren([page, slug]),
    history: createMemoryHistory({ initialEntries: ['/en/gifts'] }),
    disableGlobalCatchBoundary: true,
  })
  const view = render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  )
  await vi.waitFor(() => expect(router.state.status).toBe('idle'))
  return view
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
})

describe('photosOf', () => {
  it('falls back to the single photo when the photos list is empty or left out', () => {
    expect(photosOf({ photos: [], photo: 'https://m.test/a.jpg' })).toEqual(['https://m.test/a.jpg'])
    expect(photosOf({ photo: 'https://m.test/a.jpg' })).toEqual(['https://m.test/a.jpg'])
  })

  it('prefers the photos list, and is empty with neither', () => {
    expect(photosOf({ photos: ['https://m.test/b.jpg'], photo: 'https://m.test/a.jpg' })).toEqual(['https://m.test/b.jpg'])
    expect(photosOf({})).toEqual([])
  })
})

describe('the showcase card', () => {
  it('names the link by the keepsake name first, then the sold-out label', async () => {
    await renderCard({ variant: 'showcase', soldOutLabel: 'Sold out' })

    const link = await screen.findByRole('link')
    expect(link.getAttribute('aria-labelledby')?.split(' ')).toHaveLength(2)
    expect(link).toHaveAccessibleName('Kapellbrücke mug Sold out')
  })

  it('names the link by the keepsake name alone when it is in stock, and the name starts the link', async () => {
    await renderCard({ variant: 'showcase' })

    expect(await screen.findByRole('link')).toHaveAccessibleName('Kapellbrücke mug')
  })

  it('shows the brand alone, without a store line, when the store name is empty', async () => {
    const view = await renderCard({ variant: 'showcase', storeName: '' })

    const link = await screen.findByRole('link')
    expect(link).toHaveTextContent('Victorinox')
    expect(link).not.toHaveTextContent('Swiss Native')
    expect(view.container.querySelectorAll('h3')).toHaveLength(1)
  })

  it('keeps both lines when there is a store name, and clamps the subtitle to two lines', async () => {
    await renderCard({ variant: 'showcase' })

    const link = await screen.findByRole('link')
    expect(link).toHaveTextContent('Swiss Native')
    expect(link).toHaveTextContent('Victorinox')
    expect(screen.getByText('Hand-painted ceramic')).toHaveClass('line-clamp-2')
  })

  it('has no span around the heading', async () => {
    const view = await renderCard({ variant: 'showcase' })

    await screen.findByRole('link')
    expect(view.container.querySelector('span:has(> h3), span:has(h3)')).toBeNull()
  })
})

describe('the row card', () => {
  it('draws the first photo on the tile colour with no scroller, multiplied onto it', async () => {
    const view = await renderCard({ variant: 'row', photos: ['https://m.test/a.jpg', 'https://m.test/b.jpg'] })

    await screen.findByRole('link')
    const images = view.container.querySelectorAll('img')
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveClass('mix-blend-multiply')
    expect(images[0]!.parentElement).toHaveClass('bg-card-tile')
    expect(view.container.querySelector('[data-strip]')).toBeNull()
    expect(view.container.querySelector('span:has(h3)')).toBeNull()
  })
})
