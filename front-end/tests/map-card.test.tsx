import type { PublicMapItem } from '@sk/api-contract'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapCard } from '@/components/map/map-card'
import { MapThumb } from '@/components/map/map-thumb'
import { LocaleProvider } from '@/contexts/locale-context'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { en } from '@/i18n/en'

function pin(n: number, extra: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    id: `00000000-0000-4000-8000-00000000010${n}`,
    slug: `pin-${n}`,
    latitude: 47.05,
    longitude: 8.3,
    title: `Place ${n}`,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoKey: null,
    ...extra,
  }
}

const pins = [pin(1), pin(2, { hasMainStory: true, mainStorySlug: 'story-two' }), pin(3)]

function Row({ items = pins, onClose = () => {} }: { items?: PublicMapItem[], onClose?: () => void }) {
  const [selectedId, setSelectedId] = useState(items[0]!.id)

  return (
    <PlaceCardRow
      extrasOf={pin => ({ categories: ['Walks', 'Views'], tip: pin.slug === 'pin-1' ? { text: 'Go early', language: 'en' } : undefined })}
      pins={items}
      selectedId={selectedId}
      onClose={onClose}
      onSelect={setSelectedId}
    />
  )
}

async function renderRow(props: React.ComponentProps<typeof Row> = {}) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const route = createRoute({ getParentRoute: () => root, path: '/', component: () => <Row {...props} /> })
  const stories = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([route, stories]), history: createMemoryHistory({ initialEntries: ['/'] }) })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('region')
}

const cardOf = (title: string) => screen.getByRole('heading', { name: title }).closest('article')!

beforeEach(() => {
  window.HTMLElement.prototype.scrollTo = vi.fn()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)

    return 0
  })
})

describe('[E4.6][AC42] the map card', () => {
  it('shows the eyebrow, the serif title, the two-line text, the picture and the action', () => {
    render(
      <LocaleProvider>
        <MapCard action={<button type="button">View more</button>} eyebrow="Stop 1 · Meet here" id="s1" text="A long text" thumb={<MapThumb iconSize={28} />} title="Old town" titleLang="en" />
      </LocaleProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Old town', level: 2 })).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Stop 1 · Meet here')).toBeInTheDocument()
    expect(screen.getByText('A long text')).toHaveClass('line-clamp-2')
    expect(screen.getByRole('button', { name: 'View more' })).toBeInTheDocument()
  })

  it('lays a pin card out the way it was: the picture on the left, the text beside it centred against the picture, and the step buttons under', async () => {
    await renderRow()
    const card = cardOf('Place 1')
    const picture = card.querySelector('span.bg-\\[\\#173f52\\]')!.parentElement!
    const text = screen.getByRole('heading', { name: 'Place 1' }).parentElement!

    expect(picture).toHaveClass('size-[84px]')
    expect(picture.parentElement).toHaveClass('items-center')
    expect(picture.parentElement!.firstElementChild).toBe(picture)
    expect(picture.parentElement!.lastElementChild).toBe(text)
    expect(card).toHaveClass('rounded-3xl')
    expect(within(card).getByRole('button', { name: en['map.card.next'] })).toBeInTheDocument()
  })

  it('keeps the tour card as it was: the picture on the right, the text on top', () => {
    render(
      <LocaleProvider>
        <MapCard eyebrow="Stop 1" id="s1" text="A text" thumb={<MapThumb iconSize={28} />} title="Old town" />
      </LocaleProvider>,
    )
    const card = screen.getByRole('article')
    const picture = card.querySelector('span.bg-\\[\\#173f52\\]')!.parentElement!

    expect(picture).toHaveClass('size-[76px]')
    expect(picture.parentElement!.lastElementChild).toBe(picture)
    expect(picture.parentElement).not.toHaveClass('items-center')
    expect(card).toHaveClass('rounded-2xl')
  })

  it('puts the first category in the eyebrow, the tip under the title and "Read the story" only on a pin with a story', async () => {
    await renderRow()

    expect(within(cardOf('Place 1')).getByText('Walks')).toBeInTheDocument()
    expect(within(cardOf('Place 1')).queryByText('Views')).toBeNull()
    expect(within(cardOf('Place 1')).getByText('Go early')).toHaveClass('line-clamp-2')
    expect(within(cardOf('Place 1')).queryByRole('link')).toBeNull()
    expect(within(cardOf('Place 2')).getByRole('link', { name: en['map.card.readStory'] })).toHaveAttribute('href', '/en/stories/story-two')
  })

  it('numbers the cards and disables the step back on the first and the step on on the last', async () => {
    await renderRow()

    expect(within(cardOf('Place 1')).getByText('1 of 3')).toBeInTheDocument()
    expect(within(cardOf('Place 1')).getByRole('button', { name: en['map.card.previous'] })).toBeDisabled()
    expect(within(cardOf('Place 1')).getByRole('button', { name: en['map.card.next'] })).toBeEnabled()
    expect(within(cardOf('Place 3')).getByText('3 of 3')).toBeInTheDocument()
    expect(within(cardOf('Place 3')).getByRole('button', { name: en['map.card.next'] })).toBeDisabled()
  })

  it('opens the next card with the step button and keeps focus on the same button there, then on the other at the end', async () => {
    await renderRow()
    await userEvent.click(within(cardOf('Place 1')).getByRole('button', { name: en['map.card.next'] }))

    await waitFor(() => expect(within(cardOf('Place 2')).getByRole('button', { name: en['map.card.next'] })).toHaveFocus())
    await userEvent.click(within(cardOf('Place 2')).getByRole('button', { name: en['map.card.next'] }))

    await waitFor(() => expect(within(cardOf('Place 3')).getByRole('button', { name: en['map.card.previous'] })).toHaveFocus())
  })

  it('takes the buttons of the cards that are not open out of the tab order', async () => {
    await renderRow()

    expect(cardOf('Place 2').querySelector('[inert]')).not.toBeNull()
    expect(cardOf('Place 1').querySelector('[inert]')).toBeNull()
  })

  it('shows no step buttons when there is one card, and every card in the row has one height rule: the cards stretch', async () => {
    await renderRow({ items: [pin(1)] })

    expect(screen.queryByText('1 of 1')).toBeNull()
    expect(within(cardOf('Place 1')).queryByRole('button')).toBeNull()
  })

  it('closes with the ✕ and with Escape from inside the row', async () => {
    const onClose = vi.fn()

    await renderRow({ onClose })
    await userEvent.click(screen.getByRole('button', { name: en['map.card.close'] }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(within(cardOf('Place 1')).getByRole('button', { name: en['map.card.next'] }))
    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
