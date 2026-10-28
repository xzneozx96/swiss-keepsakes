import type { Answers } from '@/features/lab/home-data'

import { describe, expect, it } from 'vitest'

import { homeItems } from '@/features/lab/home-data'
import {
  BAD_PHOTOS,
  eventGroups,
  eventPhoto,
  eventsFor,
  HERO_ONLY,
  labEvents,
  mapPins,
  MAX_COMING,
  mustVisits,
  mustVisitsFor,
  OLD_TOWN_WALK_STOPS,
  PERSONALISED,
  pointsOf,
  routesFor,
  SERVICES,
  V9_SECTIONS,
  v9Copy,
  v9Sections,
} from '@/features/lab/home-v9-data'

const ALL_ANSWERS: Answers[] = ['none', 'short-food', 'multi-history', 'lake-shopping']
const ids = (list: { id: string }[]) => list.map(item => item.id)

describe('home V9: page order', () => {
  it('is the same fixed order for every visitor', () => {
    for (const answers of ALL_ANSWERS)
      expect(v9Sections(answers)).toEqual(['hero', 'map', 'services', 'must-visits', 'routes', 'food', 'events', 'ending'])
  })

  it('personalises nothing above the services row', () => {
    const services = V9_SECTIONS.indexOf('services')

    for (const id of PERSONALISED)
      expect(V9_SECTIONS.indexOf(id)).toBeGreaterThan(services)
    // The sorted line sits just before the first personalised section.
    expect(PERSONALISED.map(id => V9_SECTIONS.indexOf(id)).sort((a, b) => a - b)[0]).toBe(V9_SECTIONS.indexOf('services') + 1)
  })

  it('gives every service tile at least one place on its map', () => {
    for (const service of SERVICES)
      expect(pointsOf(service.id).length).toBeGreaterThan(0)
  })
})

describe('home V9: personalisation only orders cards, never hides them', () => {
  it('keeps every must-visit for every visitor', () => {
    for (const answers of ALL_ANSWERS)
      expect(ids(mustVisitsFor(answers)).sort()).toEqual(ids(mustVisits).sort())
  })

  it('leaves the curated must-visit order for a visitor who skipped', () => {
    expect(ids(mustVisitsFor('none'))).toEqual(ids(mustVisits))
  })

  it('moves the must-visit that fits the interest up', () => {
    expect(mustVisitsFor('short-food')[0]!.id).toBe('m-old-town-squares')
    expect(mustVisitsFor('lake-shopping')[0]!.id).toBe('m-chapel-bridge')
  })

  it('gives the food map every guest pin plus the lab food places, the same for every visitor', () => {
    const ids = mapPins(homeItems).map(pin => pin.id)

    expect(ids).toEqual(expect.arrayContaining(['p1', 'p3', 'p15', 'f-wirtshaus-galliker', 'f-neubad', 'f-rathaus-brauerei', 'f-mr-pickwick', 'f-confiserie-bachmann']))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('home V9: routes by stay length', () => {
  it('shows the walks first for a short stay and for a visitor who skipped', () => {
    for (const answers of ['none', 'short-food'] as Answers[]) {
      const kinds = routesFor(answers).map(route => route.kind)

      expect(kinds).toEqual(['walk', 'walk', 'trip', 'trip'])
      expect(routesFor(answers)[0]!.id).toBe('route-old-town')
    }
  })

  it('shows the day trips first for a multi-day stay', () => {
    for (const answers of ['multi-history', 'lake-shopping'] as Answers[])
      expect(routesFor(answers).map(route => route.kind)).toEqual(['trip', 'trip', 'walk', 'walk'])
  })

  it('passes every must-visit on the old-town walk', () => {
    for (const place of mustVisits)
      expect(OLD_TOWN_WALK_STOPS).toContain(place.id)
  })
})

describe('home V9: events', () => {
  it('never shows an ended event and lists the rest soonest first', () => {
    const events = eventsFor(homeItems)
    const days = events.map(e => e.day + (e.starts ?? ''))

    expect(events.map(e => e.pin.id)).not.toContain('e-maess')
    expect(days).toEqual([...days].sort())
    expect(events[0]!.pin.slug).toBe('reuss-flea-market')
    expect(events[0]!.soon).toBe(true)
  })

  it('drops an event once its last date has passed', () => {
    const later = eventsFor(homeItems, '2026-11-01')

    expect(later.map(e => e.pin.slug)).not.toContain('reuss-flea-market')
    expect(eventsFor(homeItems, '2027-03-01')).toEqual([])
  })

  it('keeps the carousel to this week and lists at most three after it', () => {
    const { all, week, coming, hidden } = eventGroups(homeItems)

    expect(week.length).toBeGreaterThan(0)
    for (const event of week)
      expect(event.soon).toBe(true)
    for (const event of coming)
      expect(event.soon).toBe(false)
    expect(coming.length).toBeLessThanOrEqual(MAX_COMING)
    expect(week.length + coming.length + hidden).toBe(all.length)
  })

  it('offers "view all" only when events are hidden', () => {
    // 28 Oct: one this week, four later, so one is hidden.
    expect(eventGroups(homeItems).hidden).toBe(1)
    // 1 Dec: the Christmas market and Fasnacht are left, nothing hidden.
    const december = eventGroups(homeItems, '2026-12-01')

    expect(december.coming.length).toBeLessThanOrEqual(MAX_COMING)
    expect(december.hidden).toBe(0)
  })

  it('gives every event an honest photo for its card, never a bad one or the hero', () => {
    for (const event of eventsFor(homeItems)) {
      expect(BAD_PHOTOS.has(eventPhoto(event))).toBe(false)
      expect(eventPhoto(event)).not.toBe(HERO_ONLY)
    }
  })

  it('has lab events with their dates set', () => {
    for (const event of labEvents)
      expect(event.dates?.length).toBeGreaterThan(0)
  })
})

describe('home V9: owner rules', () => {
  it('prints no count under five anywhere in its copy', () => {
    for (const language of ['en', 'de'] as const) {
      const text = JSON.stringify(v9Copy[language])

      // German "ein" is also the article, so "one" is checked through the digits and the words from two up.
      expect(text).not.toMatch(/\b[1-4]\b/)
      expect(text).not.toMatch(/\b(?:two|three|four|zwei|drei|vier)\b/i)
      // The view-all label never prints the number (owner, revision 4).
      expect(v9Copy[language].viewAllEvents).not.toMatch(/\d/)
    }
  })

  it('never shows a bad photo, or the hero photo again, large', () => {
    const large = [...mustVisits.map(m => m.photo), ...routesFor('none').map(r => r.photo)]

    for (const photo of large) {
      expect(BAD_PHOTOS.has(photo)).toBe(false)
      expect(photo).not.toBe(HERO_ONLY)
    }
  })

  it('has no price field in its content', () => {
    const text = JSON.stringify({ mustVisits, routes: routesFor('none'), food: mapPins(homeItems) })

    expect(text).not.toMatch(/CHF|Fr\.|price|Preis/i)
  })
})
