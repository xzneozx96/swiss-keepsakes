import type { Pin, PinListItem } from '@sk/api-contract'
import type { ListFilters } from '@/features/places/lib/list'
import { describe, expect, it } from 'vitest'

import { bodyOf, emptyDate, emptyForm, formOf, isDirty, publishBodyOf, publishGaps, suggestSlug, validate } from '@/features/places/lib/form'
import { filterItems, isFiltered, NO_CATEGORY, noFilters } from '@/features/places/lib/list'

const pin: Pin = {
  id: '0198a000-0000-7000-8000-000000000001',
  storeId: '0198a000-0000-7000-8000-000000000002',
  status: 'draft',
  slug: null,
  latitude: null,
  longitude: null,
  address: null,
  weeklyHours: [],
  stayTag: 'both',
  interests: [],
  serviceType: null,
  mustVisit: false,
  foodKind: null,
  coverMediaId: null,
  coverAlt: {},
  photos: [],
  outboundUrl: null,
  mainStoryGroupId: null,
  categoryIds: [],
  dates: [],
  draft: null,
  published: null,
  firstPublishedAt: null,
  rowVersion: 1,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
}

const live: Pin = { ...pin, status: 'published', slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, published: { title: { en: 'Chapel Bridge' }, tip: {}, localTip: {} }, firstPublishedAt: '2026-10-30T10:00:00.000Z' }

describe('[E4.2][AC68] suggestSlug', () => {
  it.each([
    ['Kapellbrücke Luzern', 'kapellbruecke-luzern'],
    ['  Café  Heini! ', 'cafe-heini'],
    ['Straße der Löwen', 'strasse-der-loewen'],
    ['---', ''],
  ])('%j becomes %j', (title, slug) => {
    expect(suggestSlug(title)).toBe(slug)
  })
})

describe('[E4.2][AC68] what a publish needs', () => {
  it('names each gap and nothing else, and ignores every optional field', () => {
    expect(publishGaps(emptyForm())).toEqual(['title', 'location', 'slug'])
    expect(publishGaps({ ...emptyForm(), titleDe: 'Löwendenkmal', latitude: 47, longitude: 8, slug: 'loewendenkmal' })).toEqual([])
    expect(publishGaps({ ...emptyForm(), titleEn: 'A', latitude: 47, longitude: 8, slug: 'Not A Slug' })).toEqual(['slug'])
  })
})

describe('[E4.2][AC86] the date and hours rules of the form', () => {
  const entry = (over: object) => ({ ...emptyDate(), firstDay: '2026-11-14', ...over })
  const errorOf = (dates: ReturnType<typeof entry>[]) => Object.values(validate({ ...emptyForm(), dates }).dates)[0]

  it('refuses 22:00 to 00:30 as crossing midnight and an end before the start otherwise', () => {
    expect(errorOf([entry({ startTime: '22:00', endTime: '00:30' })])).toBe('places.error.crossesMidnight')
    expect(errorOf([entry({ startTime: '20:00', endTime: '19:00' })])).toBe('places.error.endBeforeStart')
  })

  it('accepts a late event with no end time, a range, and a day with both times', () => {
    expect(errorOf([entry({ startTime: '22:00' })])).toBeUndefined()
    expect(errorOf([entry({ kind: 'range', lastDay: '2026-11-16' })])).toBeUndefined()
    expect(errorOf([entry({ startTime: '19:30', endTime: '21:00' })])).toBeUndefined()
  })

  it('refuses a missing day, a range that ends first, an end with no start and a bad time', () => {
    expect(errorOf([entry({ firstDay: '' })])).toBe('places.error.dateMissing')
    expect(errorOf([entry({ kind: 'range', lastDay: '2026-11-10' })])).toBe('places.error.dateOrder')
    expect(errorOf([entry({ endTime: '21:00' })])).toBe('places.error.endNeedsStart')
    expect(errorOf([entry({ startTime: '25:00' })])).toBe('places.error.timeFormat')
  })

  it('checks weekly hours: a close at or before the open is refused and 24:00 closes at midnight', () => {
    const hours = (opens: string, closes: string) => Object.values(validate({ ...emptyForm(), hours: [{ key: 'a', day: 1, opens, closes }] }).hours)[0]

    expect(hours('09:00', '18:00')).toBeUndefined()
    expect(hours('09:00', '24:00')).toBeUndefined()
    expect(hours('18:00', '09:00')).toBe('places.error.hoursOrder')
    expect(hours('9:00', '18:00')).toBe('places.error.hoursFormat')
    expect(hours('09:00', '24:30')).toBe('places.error.hoursFormat')
  })

  it('counts the errors that stop a save, and lets a slug or a link be empty', () => {
    expect(validate(emptyForm()).count).toBe(0)
    expect(validate({ ...emptyForm(), slug: 'Bad Slug', outboundUrl: 'http://x.example' }).count).toBe(2)
    expect(validate({ ...emptyForm(), outboundUrl: 'https://hotel.example/stay' }).count).toBe(0)
  })
})

describe('[E4.2][AC63] the outbound link in the write', () => {
  it('trims the link, sends null when it is empty, and keeps the https rule', () => {
    expect(bodyOf({ ...emptyForm(), outboundUrl: ' https://hotel.example/a ' }).outboundUrl).toBe('https://hotel.example/a')
    expect(bodyOf(emptyForm()).outboundUrl).toBeNull()
    expect(validate({ ...emptyForm(), outboundUrl: 'https://a b.example' }).link).toBe('places.error.linkFormat')
  })
})

describe('[E4.2][AC68] the write of a draft', () => {
  it('sends the slug for each language that has a title, and null with no slug', () => {
    const form = { ...emptyForm(), titleEn: 'Chapel Bridge', titleDe: 'Kapellbrücke', slug: 'chapel-bridge' }

    expect(bodyOf(form).slug).toEqual({ en: 'chapel-bridge', de: 'chapel-bridge' })
    expect(bodyOf({ ...form, titleDe: '' }).slug).toEqual({ en: 'chapel-bridge' })
    expect(bodyOf({ ...form, slug: '' }).slug).toBeNull()
    expect(bodyOf({ ...emptyForm(), slug: 'early' }, pin).slug).toEqual({ en: 'early' })
  })

  it('sends every field so a save replaces the lists and clears what was emptied', () => {
    const body = bodyOf({ ...emptyForm(), titleEn: ' A ', address: '  ', photos: [{ mediaId: 'm', altEn: 'x', altDe: '' }], coverMediaId: null, coverAltEn: 'stale' }, pin)

    expect(body).toMatchObject({ title: { en: 'A' }, address: null, photos: [{ mediaId: 'm', alt: { en: 'x' } }], coverMediaId: null, coverAlt: {}, categoryIds: [], dates: [], weeklyHours: [], mustVisit: false, serviceType: null, foodKind: null })
  })

  it('turns a date entry into a write: a day has the same first and last day, a range has no times', () => {
    const body = bodyOf({ ...emptyForm(), dates: [
      { ...emptyDate(), firstDay: '2026-11-14', lastDay: 'ignored', startTime: '19:30', endTime: '' },
      { ...emptyDate(), kind: 'range', firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: '10:00', endTime: '11:00' },
    ] })

    expect(body.dates).toEqual([
      { firstDay: '2026-11-14', lastDay: '2026-11-14', startTime: '19:30', endTime: null },
      { firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null },
    ])
  })
})

describe('[E4.2][AC79] the write of a pin that was live', () => {
  it('leaves the slug out unless it was renamed, and renames it for the stored languages only', () => {
    const form = formOf(live)

    expect(bodyOf(form, live)).not.toHaveProperty('slug')
    expect(bodyOf({ ...form, slug: 'chapel-bridge-lucerne', titleDe: 'Kapellbrücke' }, live).slug).toEqual({ en: 'chapel-bridge-lucerne' })
  })

  it('adds the slug of a language the draft adds only at publish', () => {
    const form = { ...formOf(live), titleDe: 'Kapellbrücke' }

    expect(publishBodyOf(form, live)).toEqual({ slug: { de: 'chapel-bridge' } })
    expect(publishBodyOf(formOf(live), live)).toEqual({})
    expect(publishBodyOf({ ...emptyForm(), titleEn: 'A', slug: 'a' }, pin)).toEqual({})
  })
})

describe('[E4.2][AC68] form state', () => {
  it('reads a pin back into the form and sees no change until a field moves', () => {
    const withData: Pin = { ...live, draft: { title: { en: 'Chapel Bridge, Lucerne' }, tip: { de: 'Früh kommen' }, localTip: { en: 'Go at dawn' } }, dates: [{ id: 'd1', firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null }], weeklyHours: [{ day: 1, opens: '09:00', closes: '18:00' }], photos: [{ mediaId: 'm1', alt: { en: 'Close' } }], interests: ['local-activities'] }
    const form = formOf(withData)

    expect(form).toMatchObject({ titleEn: 'Chapel Bridge, Lucerne', tipDe: 'Früh kommen', localTipEn: 'Go at dawn', slug: 'chapel-bridge', interests: ['local-activities'] })
    expect(form.dates[0]).toMatchObject({ kind: 'range', firstDay: '2026-11-09' })
    expect(form.photos).toEqual([{ mediaId: 'm1', altEn: 'Close', altDe: '' }])
    expect(isDirty(formOf(withData), form)).toBe(false)
    expect(isDirty({ ...form, mustVisit: true }, form)).toBe(true)
    expect(isDirty({ ...form, hours: form.hours.map(h => ({ ...h, key: 'other' })) }, form)).toBe(false)
  })
})

describe('[E4.2][AC86] the list filters', () => {
  const item = (over: object) => ({ id: 'x', status: 'draft', title: {}, slug: null, located: true, categoryIds: [], hasDates: false, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, mainStory: null, hasPendingChanges: false, rowVersion: 1, updatedAt: '2026-10-30T10:00:00.000Z', ...over }) as PinListItem
  const items = [
    item({ id: 'a', status: 'published', title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, categoryIds: ['walks'] }),
    item({ id: 'b', status: 'ended', title: { de: 'Fasnacht' }, hasDates: true, stayTag: 'short_stay' }),
    item({ id: 'c', status: 'hidden', title: { en: 'Old tap' } }),
  ]
  const ids = (filters: Partial<ListFilters>) => filterItems(items, { ...noFilters, ...filters }).map(found => found.id)

  it('narrows by status, category (including none), stay and dates, each group an OR and the groups together an AND', () => {
    expect(ids({})).toEqual(['a', 'b', 'c'])
    expect(ids({ status: ['ended'] })).toEqual(['b'])
    expect(ids({ status: ['ended', 'hidden'] })).toEqual(['b', 'c'])
    expect(ids({ category: [NO_CATEGORY] })).toEqual(['b', 'c'])
    expect(ids({ category: ['walks'] })).toEqual(['a'])
    expect(ids({ stay: ['short_stay'] })).toEqual(['b'])
    expect(ids({ dates: ['has'] })).toEqual(['b'])
    expect(ids({ dates: ['none'] })).toEqual(['a', 'c'])
    expect(ids({ status: ['ended'], dates: ['none'] })).toEqual([])
  })

  it('searches the titles in both languages and the map link, ignoring case and spaces around', () => {
    expect(ids({ query: ' FASN ' })).toEqual(['b'])
    expect(ids({ query: 'chapel-bridge' })).toEqual(['a'])
    expect(ids({ query: 'nothing' })).toEqual([])
    expect(isFiltered(noFilters)).toBe(false)
    expect(isFiltered({ ...noFilters, query: 'x' })).toBe(true)
  })
})
