import type { Pin, PinListItem } from '@sk/api-contract'
import type { ListFilters } from '@/features/places/lib/list'
import { pinWriteBodySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

import { bodyOf, emptyDate, emptyForm, formOf, isDirty, photoIds, publishGaps, validate, withPhotoIds } from '@/features/places/lib/form'
import { filterItems, isFiltered, kindOf, NO_CATEGORY, noFilters } from '@/features/places/lib/list'
import { storableLink } from '@/features/places/lib/maps-link'

const pin: Pin = {
  id: '0198a000-0000-7000-8000-000000000001',
  storeId: '0198a000-0000-7000-8000-000000000002',
  status: 'draft',
  slug: null,
  latitude: null,
  longitude: null,
  address: null,
  mapsLink: null,
  weeklyHours: [],
  stayTag: 'both',
  interests: [],
  mustVisit: false,
  coverMediaId: null,
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

const live: Pin = { ...pin, status: 'published', slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, published: { title: { en: 'Chapel Bridge' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }, firstPublishedAt: '2026-10-30T10:00:00.000Z' }

describe('[E4.2][AC68] what a publish needs', () => {
  it('names each gap and nothing else, and ignores every optional field', () => {
    expect(publishGaps(emptyForm())).toEqual(['title', 'location'])
    expect(publishGaps({ ...emptyForm(), titleDe: 'Löwendenkmal', latitude: 47, longitude: 8 })).toEqual([])
    expect(publishGaps({ ...emptyForm(), titleEn: 'A' })).toEqual(['location'])
    expect(publishGaps({ ...emptyForm(), latitude: 47, longitude: 8 })).toEqual(['title'])
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

  it('[E4.2][AC86] refuses a day that is not a whole real YYYY-MM-DD, on that entry, and a last day that is not one', () => {
    for (const firstDay of ['14.11.2026', '2026-11-1', 'tomorrow', '2026-02-31', '2026-13-01', ' 2026-11-14'])
      expect(errorOf([entry({ firstDay })]), firstDay).toBe('places.error.dateFormat')
    expect(errorOf([entry({ kind: 'range', lastDay: '16.11.2026' })])).toBe('places.error.dateFormat')
    expect(errorOf([entry({ kind: 'range', firstDay: '2026-11-14', lastDay: '2026-11-16' })])).toBeUndefined()
    expect(validate({ ...emptyForm(), dates: [entry({ firstDay: '14.11.2026' })] }).count).toBe(1)
  })

  it('checks weekly hours: a close at or before the open is refused and 24:00 closes at midnight', () => {
    const hours = (opens: string, closes: string) => Object.values(validate({ ...emptyForm(), hours: [{ key: 'a', day: 1, opens, closes }] }).hours)[0]

    expect(hours('09:00', '18:00')).toBeUndefined()
    expect(hours('09:00', '24:00')).toBeUndefined()
    expect(hours('18:00', '09:00')).toBe('places.error.hoursOrder')
    expect(hours('', '18:00')).toBe('places.error.hoursMissing')
    expect(hours('09:00', '')).toBe('places.error.hoursMissing')
    expect(hours('09:00', '24:30')).toBe('places.error.hoursMissing')
  })

  it('counts the errors that stop a save, and lets a link be empty', () => {
    expect(validate(emptyForm()).count).toBe(0)
    expect(validate({ ...emptyForm(), outboundUrl: 'http://x.example' }).count).toBe(1)
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

describe('the stored Google Maps link in the form', () => {
  it('loads from the pin, is sent trimmed and null when empty, and counts as a change', () => {
    const link = 'https://maps.app.goo.gl/RiTbLwL8vxFxPzk38'

    expect(formOf({ ...pin, mapsLink: link }).mapsLink).toBe(link)
    expect(formOf(pin).mapsLink).toBe('')
    expect(bodyOf({ ...emptyForm(), mapsLink: ` ${link} ` }).mapsLink).toBe(link)
    expect(bodyOf(emptyForm()).mapsLink).toBeNull()
    expect(isDirty({ ...emptyForm(), mapsLink: link }, emptyForm())).toBe(true)
    for (const stored of [link, 'https://www.google.com/maps?q=47.05,8.3', 'https://goo.gl/maps/abc'])
      expect(pinWriteBodySchema.safeParse({ mapsLink: storableLink(stored) }).success).toBe(true)
  })
})

describe('[E4.2][AC68] the write of a draft', () => {
  it('never sends the map link: the server makes it from the title', () => {
    const body = bodyOf({ ...emptyForm(), titleEn: 'Chapel Bridge', titleDe: 'Kapellbrücke' })

    expect(body).not.toHaveProperty('slug')
    expect(bodyOf(formOf(live))).not.toHaveProperty('slug')
    expect(formOf(live)).not.toHaveProperty('slug')
  })

  it('never sends the local tip: the editor has one tip field per language', () => {
    expect(bodyOf({ ...emptyForm(), tipEn: 'Come at dawn' })).not.toHaveProperty('localTip')
    expect(formOf(live)).not.toHaveProperty('localTipEn')
  })

  it('sends every field so a save replaces the lists and clears what was emptied', () => {
    const body = bodyOf({ ...emptyForm(), titleEn: ' A ', address: '  ', photos: [{ mediaId: 'm' }], coverMediaId: null })

    expect(body).toMatchObject({ title: { en: 'A' }, address: null, photos: [{ mediaId: 'm' }], coverMediaId: null, categoryIds: [], dates: [], weeklyHours: [], mustVisit: false })
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

describe('[E4.2][AC68] photos as one ordered list', () => {
  it('maps the list onto the two API fields: the first photo is the cover, the rest are the extra photos in order', () => {
    expect(withPhotoIds(['a', 'b', 'c'])).toEqual({ coverMediaId: 'a', photos: [{ mediaId: 'b' }, { mediaId: 'c' }] })
    expect(withPhotoIds(['a'])).toEqual({ coverMediaId: 'a', photos: [] })
    expect(withPhotoIds([])).toEqual({ coverMediaId: null, photos: [] })
    expect(photoIds({ coverMediaId: 'a', photos: [{ mediaId: 'b' }, { mediaId: 'c' }] })).toEqual(['a', 'b', 'c'])
    expect(photoIds({ coverMediaId: null, photos: [] })).toEqual([])
  })

  it('reads a pin with a cover and extra photos in the same order, and sends them back as cover_media_id and photos', () => {
    const form = formOf({ ...live, coverMediaId: 'c', photos: [{ mediaId: 'p1' }, { mediaId: 'p2' }] })

    expect(photoIds(form)).toEqual(['c', 'p1', 'p2'])
    expect(bodyOf(form)).toMatchObject({ coverMediaId: 'c', photos: [{ mediaId: 'p1' }, { mediaId: 'p2' }] })
    // Moving the last photo to the front makes it the cover and the old cover the first extra photo.
    expect(bodyOf({ ...form, ...withPhotoIds(['p2', 'c', 'p1']) })).toMatchObject({ coverMediaId: 'p2', photos: [{ mediaId: 'c' }, { mediaId: 'p1' }] })
  })

  it('no longer sends a photo description: neither for the cover nor for an extra photo', () => {
    const body = bodyOf(formOf({ ...live, coverMediaId: 'c', photos: [{ mediaId: 'p1' }] }))

    expect(body).not.toHaveProperty('coverAlt')
    expect(body.photos).toEqual([{ mediaId: 'p1' }])
  })
})

describe('[E4.2][AC68] form state', () => {
  it('reads a pin back into the form and sees no change until a field moves', () => {
    const withData: Pin = { ...live, draft: { title: { en: 'Chapel Bridge, Lucerne' }, tip: { de: 'Früh kommen' }, localTip: { en: 'Go at dawn' }, coverAlt: {}, photoAlt: { m1: { en: 'Close' } } }, dates: [{ id: 'd1', firstDay: '2026-11-09', lastDay: '2026-11-14', startTime: null, endTime: null }], weeklyHours: [{ day: 1, opens: '09:00', closes: '18:00' }], photos: [{ mediaId: 'm1' }], interests: ['local-activities'] }
    const form = formOf(withData)

    expect(form).toMatchObject({ titleEn: 'Chapel Bridge, Lucerne', tipDe: 'Früh kommen', interests: ['local-activities'] })
    expect(form.dates[0]).toMatchObject({ kind: 'range', firstDay: '2026-11-09' })
    // No cover and one extra photo: the list is one photo, so the first photo is the cover.
    expect(form.coverMediaId).toBe('m1')
    expect(form.photos).toEqual([])
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

  it('narrows by status, category (including none), stay and type, each group an OR and the groups together an AND', () => {
    expect(ids({})).toEqual(['a', 'b', 'c'])
    expect(ids({ status: ['ended'] })).toEqual(['b'])
    expect(ids({ status: ['ended', 'hidden'] })).toEqual(['b', 'c'])
    expect(ids({ category: [NO_CATEGORY] })).toEqual(['b', 'c'])
    expect(ids({ category: ['walks'] })).toEqual(['a'])
    expect(ids({ stay: ['short_stay'] })).toEqual(['b'])
    expect(ids({ type: ['event'] })).toEqual(['b'])
    expect(ids({ type: ['place'] })).toEqual(['a', 'c'])
    expect(ids({ type: ['place', 'event'] })).toEqual(['a', 'b', 'c'])
    expect(ids({ status: ['ended'], type: ['place'] })).toEqual([])
  })

  it('derives place or event from the dates and stores neither: no dates is a place, an upcoming or current date an event, all dates past an ended event', () => {
    const upcoming = { hasDates: true, nextDate: { firstDay: '2090-11-07', lastDay: '2090-11-07', startTime: null, endTime: null } }

    expect(kindOf({ hasDates: false, nextDate: null })).toBe('place')
    expect(kindOf(upcoming)).toBe('event')
    expect(kindOf({ hasDates: true, nextDate: null })).toBe('ended')
  })

  it('searches the titles in both languages and the map link, ignoring case and spaces around', () => {
    expect(ids({ query: ' FASN ' })).toEqual(['b'])
    expect(ids({ query: 'chapel-bridge' })).toEqual(['a'])
    expect(ids({ query: 'nothing' })).toEqual([])
    expect(isFiltered(noFilters)).toBe(false)
    expect(isFiltered({ ...noFilters, query: 'x' })).toBe(true)
  })
})

describe('[E4.2][AC68] what the editor sends is what the API contract accepts', () => {
  it('parses the write of an empty form, a full form and a live pin with the contract\'s strict schema', () => {
    const full = {
      ...emptyForm(),
      titleEn: 'Chapel Bridge',
      titleDe: 'Kapellbrücke',
      tipEn: 'Walk it at dawn',
      tipDe: 'Früh kommen',
      latitude: 47.05,
      longitude: 8.3,
      address: 'Kapellbrücke, Luzern',
      hours: [{ key: 'h', day: 1, opens: '09:00', closes: '24:00' }],
      dates: [{ ...emptyDate(), firstDay: '2026-11-14', startTime: '22:00' }, { ...emptyDate(), kind: 'range' as const, firstDay: '2026-11-09', lastDay: '2026-11-14' }],
      categoryIds: ['0198a000-0000-7000-8000-000000000020'],
      interests: ['history-culture', 'local-activities'],
      mustVisit: true,
      coverMediaId: '0198a000-0000-7000-8000-000000000040',
      photos: [{ mediaId: '0198a000-0000-7000-8000-000000000041' }],
      outboundUrl: 'https://hotel.example/stay',
    }

    expect(() => pinWriteBodySchema.parse(bodyOf(emptyForm()))).not.toThrow()
    expect(() => pinWriteBodySchema.parse(bodyOf(full))).not.toThrow()
    expect(() => pinWriteBodySchema.parse(bodyOf({ ...formOf(live), titleDe: 'Kapellbrücke' }))).not.toThrow()
  })
})
