import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoCluster, PhotoPin } from '@/components/map/pin-faces'
import { LocaleProvider } from '@/contexts/locale-context'
import { PinList } from '@/features/map/components/pin-list'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { pinIcon } from '@/features/map/lib/categories'

function category(id: string, icon: PublicCategory['icon'], parentId: string | null = null) {
  return ({
    id,
    slug: id,
    parentId,
    position: 0,
    icon,
    name: { en: id, de: id },
  }) as PublicCategory
}

function pin(categoryIds: string[]) {
  return ({
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'p',
    latitude: 47.05,
    longitude: 8.3,
    title: 'Seeblick',
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }) as PublicMapItem
}

const faces = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-pin-icon]'), face => face.getAttribute('data-pin-icon'))

describe('[E4.13][AC95] the pin icon face', () => {
  const withCafe = [category('c1', 'cafe')]
  const noIcon = [category('c2', null)]

  it('draws the cafe icon white on lake blue on the pin, with no letter', () => {
    const { container } = render(<PhotoPin dimmed={false} emphasized={false} icon={pinIcon(pin(['c1']), withCafe)} id="p" label="Seeblick" selected={false} title="Seeblick" onPress={() => {}} />)
    const face = container.querySelector('[data-pin-icon]')!

    expect(face).toHaveAttribute('data-pin-icon', 'cafe')
    expect(face).toHaveClass('bg-[#173f52]', 'text-white')
    expect(face.querySelector('svg')).not.toBeNull()
    expect(face.textContent).toBe('')
  })

  it('draws the icon in the card thumbnail, with no letter, and a plain pin without an icon', async () => {
    window.HTMLElement.prototype.scrollTo = vi.fn()
    for (const icon of ['cafe', null] as const) {
      const rootRoute = createRootRoute({ component: () => <Outlet /> })
      const tree = rootRoute.addChildren([createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <PlaceCardRow iconOf={() => icon} pins={[pin(['c1'])]} selectedId={pin([]).id} onSelect={() => {}} /> })])
      const { container, unmount } = render(
        <QueryClientProvider client={new QueryClient()}>
          <LocaleProvider>
            <RouterProvider router={createRouter({ routeTree: tree, history: createMemoryHistory({ initialEntries: ['/'] }) })} />
          </LocaleProvider>
        </QueryClientProvider>,
      )
      await screen.findByRole('region')

      expect(faces(container)).toEqual([icon ?? 'pin'])
      expect(container.querySelector('[data-pin-icon]')!.textContent).toBe('')
      unmount()
    }
  })

  it('draws the icons on the cluster face', () => {
    const { container } = render(
      <LocaleProvider>
        <PhotoCluster count={2} dimmed={false} icons={['cafe', null]} onPress={() => {}} />
      </LocaleProvider>,
    )

    expect(faces(container)).toEqual(['cafe', 'pin'])
  })

  it('draws the icon in the thumbnail of the list row, with no letter', () => {
    const { container } = render(
      <LocaleProvider>
        <PinList categories={withCafe} pins={[pin(['c1'])]} onOpen={() => {}} />
      </LocaleProvider>,
    )

    expect(faces(container)).toEqual(['cafe'])
    expect(container.querySelector('[data-pin-icon]')!.textContent).toBe('')
  })

  it('draws a plain pin icon when no category has an icon', () => {
    const { container } = render(
      <LocaleProvider>
        <PinList categories={noIcon} pins={[pin(['c2'])]} onOpen={() => {}} />
      </LocaleProvider>,
    )

    expect(pinIcon(pin(['c2']), noIcon)).toBeNull()
    expect(faces(container)).toEqual(['pin'])
    expect(screen.getByText('Seeblick')).toBeInTheDocument()
  })

  it('takes a sub-category icon from its parent', () => {
    expect(pinIcon(pin(['sub']), [category('top', 'cafe'), category('sub', null, 'top')])).toBe('cafe')
  })
})
