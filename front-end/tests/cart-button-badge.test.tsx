import type { CartLine } from '@sk/domain/orders'

import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { flyToCart } from '@/components/fly-to-cart'
import { CartButton } from '@/components/layout/cart-button'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'

const line: CartLine = { id: 'l1', productId: 'p', variantId: 'v', quantity: 2, pickupDate: '2027-01-01', pickupPlaceId: 'x' }
const animate = vi.fn()

let demo: ReturnType<typeof startSeedDemo>

beforeEach(() => {
  localStorage.clear()
  animate.mockClear()
  Object.assign(HTMLElement.prototype, { animate })
  demo = startSeedDemo()
})

async function renderButton() {
  const root = createRootRoute({ component: () => <CartButton /> })
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: '/cart', component: () => null })]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    disableGlobalCatchBoundary: true,
  })

  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('link')
}

function save(quantity: number) {
  const seed = createSeedState()

  localStorage.setItem('sk.demo', JSON.stringify({ ...seed, data: { ...seed.data, cart: [{ ...line, quantity }] } }))
}

// The "added" flag lives in fly-to-cart for the page's lifetime, so the restore case must run before the add case.
describe('cart badge', () => {
  it('[E3.3] shows a cart restored from storage without the pop', async () => {
    save(2)
    await renderButton()

    expect(screen.queryByText('2')).toBeNull()
    await act(async () => {
      await demo.restore()
    })

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
  })

  it('[E3.3] pops after a real add', async () => {
    save(2)
    await renderButton()
    await act(async () => {
      await demo.restore()
    })
    animate.mockClear()

    await act(async () => {
      flyToCart(document.body, undefined)
      demo.store.update(s => ({ ...s, data: { ...s.data, cart: [{ ...line, quantity: 3 }] } }))
    })

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(animate).toHaveBeenCalledTimes(1)
  })
})
