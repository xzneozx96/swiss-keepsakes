import type { PublicMapItem } from '@sk/api-contract'
import type { PlaceDetail } from '@/features/map/lib/place-detail'

import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { PlaceSheet } from '@/features/map/components/place-sheet'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const item: PublicMapItem = {
  id: '00000000-0000-4000-8000-000000000101',
  slug: 'chapel-bridge',
  latitude: 47.0516,
  longitude: 8.3074,
  title: 'Chapel Bridge',
  language: 'en',
  categoryIds: [],
  stayTag: 'both',
  interests: [],
  nextDate: null,
  hasMainStory: false,
  mainStorySlug: null,
  photoKey: null,
}

const full: PlaceDetail = {
  id: item.id,
  title: 'Chapel Bridge',
  language: 'en',
  tip: 'Walk it at sunrise, before the tour groups.',
  latitude: item.latitude,
  longitude: item.longitude,
  address: 'Kapellbrücke, 6003 Luzern',
  mapsLink: 'https://www.google.com/maps/place/Chapel+Bridge/@47.0516,8.3074,17z',
  hours: [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, opens: '08:00:00', closes: '18:00:00' })),
  nextDate: null,
  link: 'https://www.luzern.com/en/chapel-bridge',
  photos: [{ src: 'https://media.test/a.jpg', alt: 'The bridge at dawn' }, { src: 'https://media.test/b.jpg', alt: null }, { src: 'https://media.test/c.jpg', alt: null }],
  mainStory: { slug: 'the-oldest-wooden-bridge', title: 'The oldest wooden bridge in Europe', readMinutes: 6 },
  otherStories: [{ slug: 'lucerne-in-a-day', title: 'Lucerne in one day', readMinutes: 4 }],
}

const bare: PlaceDetail = { ...full, tip: '', address: null, mapsLink: null, hours: [], link: null, photos: [], mainStory: null, otherStories: [] }

type Props = Partial<React.ComponentProps<typeof PlaceSheet>>

async function open(detail: PlaceDetail | undefined, props: Props = {}, language: 'en' | 'de' = 'en') {
  if (language === 'de')
    await loadDictionary('de')
  const root = createRootRoute()
  const map = createRoute({
    getParentRoute: () => root,
    path: '/$lang/map',
    component: () => (
      <LocaleProvider>
        <PlaceSheet
          detail={detail}
          isOpen
          item={item}
          position={{ index: 0, count: 1 }}
          onClose={() => {}}
          onStep={() => {}}
          {...props}
        />
      </LocaleProvider>
    ),
  })
  const stories = createRoute({ getParentRoute: () => root, path: '/$lang/stories/$slug', component: () => null })
  const router = createRouter({ routeTree: root.addChildren([map, stories]), history: createMemoryHistory({ initialEntries: [`/${language}/map`] }) })

  render(<RouterProvider router={router} />)

  return within(await screen.findByRole('dialog'))
}

const geolocation = { getCurrentPosition: vi.fn(), watchPosition: vi.fn() }

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
  geolocation.getCurrentPosition.mockReset()
  geolocation.watchPosition.mockReset()
  window.HTMLElement.prototype.scrollTo = vi.fn()
})

describe('[E4.7][AC42] a pin with stories', () => {
  it('links the main story first and lists the other stories with their reading time, and shows no price', async () => {
    const sheet = await open(full)
    const links = sheet.getAllByRole('link').filter(link => link.getAttribute('href')?.includes('/stories/'))

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/en/stories/the-oldest-wooden-bridge', '/en/stories/lucerne-in-a-day'])
    expect(links[0]).toHaveTextContent(`${en['map.card.readStory']} · 6 min read`)
    expect(links[1]).toHaveTextContent('Lucerne in one day')
    expect(links[1]).toHaveTextContent('4 min read')
    expect(sheet.getByRole('heading', { name: en['map.sheet.stories'] })).toBeInTheDocument()
    expect(screen.getByRole('dialog').textContent).not.toMatch(/CHF|Fr\.|€|\$|price|Preis/i)
  })

  it('opens the story in place when the screen stays on its page (the editor preview)', async () => {
    const onReadStory = vi.fn()
    const sheet = await open(full, { onReadStory })

    await userEvent.click(sheet.getByRole('button', { name: new RegExp(full.mainStory!.title) }))

    expect(onReadStory).toHaveBeenCalledOnce()
  })

  it('says the story link in German', async () => {
    const sheet = await open({ ...full, language: 'en' }, {}, 'de')

    expect(sheet.getByRole('heading', { name: de['map.sheet.stories'] })).toBeInTheDocument()
    expect(sheet.getAllByRole('link').some(link => link.getAttribute('href') === '/de/stories/the-oldest-wooden-bridge')).toBe(true)
  })
})

describe('[E4.7][AC62] a pin with no story', () => {
  it('shows its details and no story link or heading', async () => {
    const sheet = await open({ ...full, mainStory: null, otherStories: [] })

    expect(sheet.getByText(full.tip)).toBeInTheDocument()
    expect(sheet.getByText(full.address!)).toBeInTheDocument()
    expect(sheet.queryByRole('heading', { name: en['map.sheet.stories'] })).toBeNull()
    expect(sheet.queryAllByRole('link').filter(link => link.getAttribute('href')?.includes('/stories/'))).toHaveLength(0)
  })

  it('works with every optional field missing: the title and the map button stay', async () => {
    const sheet = await open(bare)

    expect(sheet.getByRole('heading', { name: 'Chapel Bridge' })).toBeInTheDocument()
    expect(sheet.queryByRole('region', { name: /Photos of/ })).toBeNull()
    expect(sheet.queryByText(en['map.sheet.website'])).toBeNull()
    expect(sheet.queryByRole('group', { name: en['map.sheet.hours'] })).toBeNull()
    expect(sheet.getAllByRole('link', { name: en['map.directions'] }).length).toBeGreaterThan(0)
  })
})

describe('[E4.7][AC49] a pin with an outbound link', () => {
  it('shows the link by its host, opens it in a new tab, and has no booking or payment button', async () => {
    const sheet = await open(full)
    const link = sheet.getByRole('link', { name: new RegExp(`${en['map.sheet.website']}.*luzern\\.com`) })

    expect(link).toHaveAttribute('href', 'https://www.luzern.com/en/chapel-bridge')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(sheet.queryByRole('button', { name: /book|buy|pay|reserve|cart|buchen|kaufen|bezahlen|reservieren|warenkorb/i })).toBeNull()
    expect(sheet.queryByRole('link', { name: /book|buy|pay|reserve|cart|buchen|kaufen|bezahlen|reservieren|warenkorb/i })).toBeNull()
  })

  it('shows no website row without a link', async () => {
    const sheet = await open({ ...full, link: null })

    expect(sheet.queryByText(en['map.sheet.website'])).toBeNull()
  })
})

describe('[E4.7][AC89] Open in Google Maps', () => {
  it('opens the stored link in a new tab from the footer and the address row, reading no location', async () => {
    const sheet = await open(full)
    const links = sheet.getAllByRole('link', { name: en['map.directions'] })

    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute('href', full.mapsLink)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    }
    expect(sheet.getByText(en['map.directions.note'])).toBeInTheDocument()
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(geolocation.watchPosition).not.toHaveBeenCalled()
  })

  it('opens the position when the place has no stored link, with the destination only', async () => {
    const sheet = await open({ ...full, mapsLink: null })
    const href = new URL(sheet.getAllByRole('link', { name: en['map.directions'] })[0]!.getAttribute('href')!)

    expect(href.origin + href.pathname).toBe('https://www.google.com/maps/search/')
    expect([...href.searchParams.keys()].sort()).toEqual(['api', 'query'])
    expect(href.searchParams.get('query')).toBe('47.0516,8.3074')
  })

  it('is there before the details load, from the position in the map list, and in German after', async () => {
    const waiting = await open(undefined)

    expect(waiting.getByRole('status')).toBeInTheDocument()
    expect(waiting.getByRole('link', { name: en['map.directions'] })).toHaveAttribute('href', expect.stringContaining('query=47.0516,8.3074'))
  })

  it('says it in German', async () => {
    const sheet = await open(full, {}, 'de')

    expect(sheet.getAllByRole('link', { name: de['map.directions'] })).toHaveLength(2)
    expect(sheet.getByText(de['map.directions.note'])).toBeInTheDocument()
  })
})

describe('[E4.7][N03] the details sheet', () => {
  it('shows the hours of the week with today marked, and the next date of a pin with dates', async () => {
    const sheet = await open({ ...full, nextDate: { firstDay: '2099-11-07', lastDay: '2099-11-07', startTime: '18:00', endTime: '19:30' } })

    expect(sheet.getByRole('term')).toBeDefined()
    expect(sheet.getByText('Mon–Sun')).toBeInTheDocument()
    expect(sheet.getByText('08:00–18:00')).toBeInTheDocument()
    expect(sheet.getByText(en['map.sheet.nextDate'])).toBeInTheDocument()
    expect(sheet.getByText(/18:00–19:30/)).toBeInTheDocument()
  })

  it('shows the photos as a carousel with the merchant\'s alt text, a count and buttons', async () => {
    const sheet = await open(full)
    const gallery = sheet.getByRole('region', { name: 'Photos of Chapel Bridge' })

    expect(within(gallery).getByRole('img', { name: 'The bridge at dawn' })).toHaveAttribute('src', 'https://media.test/a.jpg')
    expect(gallery.querySelectorAll('img')).toHaveLength(3)
    expect(within(gallery).getByText('1 / 3')).toBeInTheDocument()
    expect(within(gallery).getByRole('button', { name: en['map.sheet.photoPrevious'] })).toBeDisabled()

    await userEvent.click(within(gallery).getByRole('button', { name: en['map.sheet.photoNext'] }))

    expect(window.HTMLElement.prototype.scrollTo).toHaveBeenCalled()
  })

  it('has no carousel buttons for one photo', async () => {
    const sheet = await open({ ...full, photos: [full.photos[0]!] })

    expect(sheet.queryByRole('button', { name: en['map.sheet.photoNext'] })).toBeNull()
  })

  it('steps to the previous and the next place, and disables the end of the list', async () => {
    const onStep = vi.fn()
    const sheet = await open(full, { position: { index: 0, count: 3 }, onStep })

    expect(sheet.getByRole('button', { name: en['map.sheet.previous'] })).toBeDisabled()
    await userEvent.click(sheet.getByRole('button', { name: en['map.sheet.next'] }))

    expect(onStep).toHaveBeenCalledWith(1)
  })

  it('has no Previous and Next for a single place', async () => {
    const sheet = await open(full)

    expect(sheet.queryByRole('button', { name: en['map.sheet.next'] })).toBeNull()
  })

  it('names the language when the place is only written in the other one (AC64)', async () => {
    const sheet = await open({ ...full, language: 'de' })

    expect(sheet.getByText(en['map.sheet.onlyIn.de'])).toBeInTheDocument()
  })

  it('says so and offers Try again when the details did not load', async () => {
    const onRetry = vi.fn()
    const sheet = await open(undefined, { failed: true, onRetry })

    expect(sheet.getByRole('alert')).toHaveTextContent(en['map.sheet.failed'])
    await act(async () => userEvent.click(sheet.getByRole('button', { name: en['map.sheet.retry'] })))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
