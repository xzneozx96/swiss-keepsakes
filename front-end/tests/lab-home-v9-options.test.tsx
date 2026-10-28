import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HERO_PHOTO, homeItems } from '@/features/lab/home-data'
import { useHome } from '@/features/lab/home-kit'
import { BAD_PHOTOS, eventGroups, eventPhoto, labFoodPins, mapPins, pinKind } from '@/features/lab/home-v9-data'
import { Events } from '@/features/lab/home-v9-events'
import { MustVisits } from '@/features/lab/home-v9-must'
import { v9OptionSets } from '@/features/lab/home-v9-options'
import { PinIconFace } from '@/features/lab/home-v9-pin-icon'
import { Routes } from '@/features/lab/home-v9-routes'

/** A number under five next to a counted noun ("3 places", "4 stops"). Times, dates and hours are not counts. */
const SMALL_COUNT = /\b[1-4] (?:places?|stops?|routes?|events?|stories|story|tours?|cafés?|bakeries|restaurants?|designs?)\b/i

function checkRules(container: HTMLElement) {
  const text = container.textContent ?? ''
  const photos = Array.from(container.querySelectorAll('img'), img => img.getAttribute('src') ?? '')

  expect(text.length).toBeGreaterThan(100)
  expect(text).not.toMatch(/CHF|Fr\.\s?\d|price|Preis|book/i)
  expect(text).not.toMatch(SMALL_COUNT)
  for (const src of photos) {
    for (const bad of BAD_PHOTOS)
      expect(src).not.toContain(`/${bad}.`)
    expect(src).not.toContain(HERO_PHOTO)
  }
}

function Section({ which }: { which: 'must' | 'routes' }) {
  const home = useHome('skipped', 'en')

  return which === 'must' ? <MustVisits home={home} language="en" /> : <Routes home={home} language="en" />
}

describe('home V9 decided sections', () => {
  it.each(['must', 'routes'] as const)('%s: no price, no booking, no count under five, no wrong photo', (which) => {
    const { container, unmount } = render(<Section which={which} />)

    checkRules(container)
    unmount()
  })

  it('routes: each card says where the route starts and ends, and how long it takes', () => {
    const { container } = render(<Section which="routes" />)
    const text = container.textContent ?? ''

    expect(text).toContain('Jesuit Church to Lion Monument')
    expect(text).toContain('2 h on foot')
    expect(text).not.toContain('From the story')
  })
})

describe('home V9 events: the poster and the timeline', () => {
  function EventsHarness({ today }: { today?: string }) {
    const home = useHome('skipped', 'en')

    return <Events home={home} language="en" today={today} onViewAll={() => {}} />
  }

  it.each([['28 Oct, one this week', undefined], ['9 Nov, two this week', '2026-11-09']] as const)('%s: keeps the rules', (_case, today) => {
    const { week, coming, hidden } = eventGroups(homeItems, today)
    const { container, unmount } = render(<EventsHarness today={today} />)
    const highlighted = Array.from(container.querySelectorAll<HTMLElement>('[data-v9-highlight]'), el => el.dataset.v9Highlight!)
    const rows = container.querySelectorAll('[data-v9-coming-row]')
    const viewAll = container.querySelector('[data-v9-events-all]')

    checkRules(container)
    expect(container.querySelector('[data-v9-timeline] img')).toBeNull()
    for (const card of container.querySelectorAll<HTMLElement>('[data-v9-highlight]')) {
      const event = week.find(e => e.pin.id === card.dataset.v9Highlight)!

      expect(card.querySelectorAll('img')).toHaveLength(1)
      expect(card.querySelector('img')!.getAttribute('src')).toContain(`/${eventPhoto(event)}.`)
    }
    expect(highlighted.sort()).toEqual(week.map(event => event.pin.id).sort())
    expect(rows.length).toBeLessThanOrEqual(3)
    expect(rows.length).toBe(coming.length)
    expect(Boolean(viewAll)).toBe(hidden > 0)
    if (viewAll) {
      expect(viewAll.textContent).not.toMatch(/\d/)
      expect(viewAll.closest('[data-v9-timeline]')).not.toBeNull()
    }
    unmount()
  })

  it('has no open option sets left', () => {
    expect(v9OptionSets).toEqual([])
  })
})

describe('home V9 food map: a photo or an icon, never an initial', () => {
  it('gives every pin without a photo an icon for its kind, with no letters', () => {
    for (const pin of mapPins(homeItems).filter(p => !p.photo)) {
      const face = render(<PinIconFace pin={pin} size={18} />)

      expect(face.container.querySelector('svg')).not.toBeNull()
      expect(face.container.textContent?.trim()).toBe('')
      face.unmount()
    }
  })

  it('picks the kind from the category, with the market as a basket', () => {
    const kinds = Object.fromEntries(labFoodPins.map(pin => [pin.id, pinKind(pin)]))

    expect(kinds).toMatchObject({
      'f-wochenmarkt': 'market',
      'f-wirtshaus-galliker': 'restaurant',
      'f-cafe-heini': 'cafe',
      'f-rathaus-brauerei': 'pub',
      'f-mr-pickwick': 'pub',
      'f-confiserie-bachmann': 'cafe',
    })
  })
})
