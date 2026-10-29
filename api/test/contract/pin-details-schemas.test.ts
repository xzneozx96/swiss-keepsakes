import { pinListSchema, pinSchema, pinStoryOptionListSchema, pinWriteBodySchema, storyGroupCreateBodySchema, tourWriteBodySchema } from '@sk/api-contract'
import { interestCodes } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'

const uuid = '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d'
const uuid2 = '4f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2e'
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) => schema.safeParse(value).success

describe('[E4.2][AC41] five fixed interests', () => {
  it('[E4.2][AC41] the domain list and the contract agree on exactly five codes', () => {
    expect(interestCodes).toEqual(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'])
    expect(ok(pinWriteBodySchema, { interests: [...interestCodes] })).toBe(true)
  })

  it.each(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'])('[E4.2][AC41] %s is accepted on a pin, a story group and a tour', (code) => {
    expect(ok(pinWriteBodySchema, { interests: [code] })).toBe(true)
    expect(ok(storyGroupCreateBodySchema, { kind: 'story', interests: [code] })).toBe(true)
    expect(ok(tourWriteBodySchema, { interests: [code] })).toBe(true)
  })

  it.each(['nightlife', 'free-useful', 'Local-Activities', ''])('[E4.2][AC41] %j is refused', (code) => {
    expect(ok(pinWriteBodySchema, { interests: [code] })).toBe(false)
  })

  it('[E4.2][AC41] a sixth entry is refused', () => {
    expect(ok(pinWriteBodySchema, { interests: [...interestCodes, 'history-culture'] })).toBe(false)
  })
})

describe('[E4.2][AC68] the home fields and photos on a pin body', () => {
  it('[E4.2][AC68] service type and food kind accept only their codes and null', () => {
    for (const code of ['water', 'toilets', 'connect', 'transport', 'lockers', 'cash'])
      expect(ok(pinWriteBodySchema, { serviceType: code })).toBe(true)
    expect(ok(pinWriteBodySchema, { serviceType: null, foodKind: null })).toBe(true)
    expect(ok(pinWriteBodySchema, { serviceType: 'wifi' })).toBe(false)
    for (const code of ['restaurant', 'cafe-bakery', 'pub-bar', 'market'])
      expect(ok(pinWriteBodySchema, { foodKind: code })).toBe(true)
    expect(ok(pinWriteBodySchema, { foodKind: 'bakery' })).toBe(false)
  })

  it('[E4.2][AC68] must-visit is a boolean and the local tip is a short localized text', () => {
    expect(ok(pinWriteBodySchema, { mustVisit: true, localTip: { en: 'Go early', de: 'Früh hingehen' } })).toBe(true)
    expect(ok(pinWriteBodySchema, { mustVisit: 'yes' })).toBe(false)
    expect(ok(pinWriteBodySchema, { localTip: { en: 'x'.repeat(301) } })).toBe(false)
    expect(ok(pinWriteBodySchema, { localTip: { fr: 'allez tôt' } })).toBe(false)
  })

  it('[E4.2][AC68] the old free flag and a price are not accepted', () => {
    expect(ok(pinWriteBodySchema, { free: true })).toBe(false)
    expect(ok(pinWriteBodySchema, { price: 1 })).toBe(false)
  })

  it('[E4.2][AC68] extra photos: at most 10, no repeat, alt text per language, ids are uuids', () => {
    expect(ok(pinWriteBodySchema, { photos: [{ mediaId: uuid, alt: { en: 'A', de: 'B' } }, { mediaId: uuid2 }] })).toBe(true)
    expect(ok(pinWriteBodySchema, { photos: [{ mediaId: uuid }, { mediaId: uuid.toUpperCase() }] })).toBe(false)
    expect(ok(pinWriteBodySchema, { photos: [{ mediaId: 'nope' }] })).toBe(false)
    expect(ok(pinWriteBodySchema, { photos: Array.from({ length: 11 }, (_, i) => ({ mediaId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` })) })).toBe(false)
    expect(ok(pinWriteBodySchema, { photos: Array.from({ length: 10 }, (_, i) => ({ mediaId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` })) })).toBe(true)
    expect(ok(pinWriteBodySchema, { photos: [{ mediaId: uuid, alt: { en: '   ' } }] })).toBe(false)
    expect(ok(pinWriteBodySchema, { photos: [{ mediaId: uuid, extra: 1 }] })).toBe(false)
    expect(ok(pinWriteBodySchema, { coverAlt: { en: 'The bridge', de: 'Die Brücke' } })).toBe(true)
  })
})

describe('[E4.2][AC63] the outbound link', () => {
  it.each(['https://hotel.example/stay', 'https://hotel.example/a?b=c#d'])('[E4.2][AC63] %s is accepted', (url) => {
    expect(ok(pinWriteBodySchema, { outboundUrl: url })).toBe(true)
  })

  it.each(['http://hotel.example', 'javascript:alert(1)', 'https://hotel.example/with space', 'hotel.example', '', 'https://'])('[E4.2][AC63] %j is refused', (url) => {
    expect(ok(pinWriteBodySchema, { outboundUrl: url })).toBe(false)
  })

  it('[E4.2][AC63] null removes the link and a link longer than 2000 characters is refused', () => {
    expect(ok(pinWriteBodySchema, { outboundUrl: null })).toBe(true)
    expect(ok(pinWriteBodySchema, { outboundUrl: `https://a.example/${'x'.repeat(2000)}` })).toBe(false)
  })
})

describe('[E4.2][AC86] a date entry', () => {
  const day = (over: object) => ({ dates: [{ firstDay: '2026-11-14', lastDay: '2026-11-14', ...over }] })

  it('[E4.2][AC86] 22:00 to 00:30 and an end before the start are refused; a late event with no end is accepted', () => {
    expect(ok(pinWriteBodySchema, day({ startTime: '22:00', endTime: '00:30' }))).toBe(false)
    expect(ok(pinWriteBodySchema, day({ startTime: '20:00', endTime: '19:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, day({ startTime: '22:00' }))).toBe(true)
    expect(ok(pinWriteBodySchema, day({ startTime: '19:30', endTime: '21:00' }))).toBe(true)
  })
})

describe('[E4.2][AC68] the response shapes', () => {
  const pin = {
    id: uuid,
    storeId: uuid2,
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
    draft: { title: { en: 'A' }, tip: {}, localTip: {} },
    published: null,
    firstPublishedAt: null,
    rowVersion: 1,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  }

  it('[E4.2][AC68] a pin response carries the new fields and no type', () => {
    expect(ok(pinSchema, pin)).toBe(true)
    expect(ok(pinSchema, { ...pin, serviceType: undefined })).toBe(false)
  })

  it('[E4.2][AC86] a list item may have the status ended and a warning for a story with no published version', () => {
    const item = { id: uuid, status: 'ended', title: { en: 'Blues' }, slug: { en: 'blues' }, located: true, categoryIds: [], hasDates: true, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, mainStory: { groupId: uuid2, published: false }, hasPendingChanges: false, rowVersion: 3, updatedAt: '2026-10-30T10:00:00.000Z' }

    expect(ok(pinListSchema, { items: [item] })).toBe(true)
    expect(ok(pinListSchema, { items: [{ ...item, status: 'archived' }] })).toBe(false)
  })

  it('[E4.2][AC68] a story option carries its live languages', () => {
    expect(ok(pinStoryOptionListSchema, { items: [{ groupId: uuid, kind: 'story', title: { en: 'Chapel Bridge' }, publishedLanguages: ['en'] }] })).toBe(true)
    expect(ok(pinStoryOptionListSchema, { items: [{ groupId: uuid, kind: 'story', title: {}, publishedLanguages: ['fr'] }] })).toBe(false)
  })
})
