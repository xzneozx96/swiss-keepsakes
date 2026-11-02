import { isGoogleMapsHost, pinListSchema, pinSchema, pinStoryOptionListSchema, pinWriteBodySchema, storyGroupCreateBodySchema, tourWriteBodySchema } from '@sk/api-contract'
import { interestCodes } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { isGoogleMapsHost as apiIsGoogleMapsHost } from '../../src/modules/content/application/maps-link.ts'

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
  it('[T-009][AC5] service type and food kind are gone from the pin body: they come from the categories', () => {
    expect(ok(pinWriteBodySchema, { serviceType: 'water' })).toBe(false)
    expect(ok(pinWriteBodySchema, { foodKind: 'market' })).toBe(false)
    expect(ok(pinWriteBodySchema, { mustVisit: true })).toBe(true)
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

describe('a stored Google Maps link', () => {
  it.each([
    'https://maps.app.goo.gl/RiTbLwL8vxFxPzk38',
    'https://goo.gl/maps/abc123',
    'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516489,8.3049602,17z/data=!3d47.05!4d8.30',
    'https://www.google.com/maps?q=47.05165,8.30496',
    'https://www.google.ch/maps/search/?api=1&query=47.05,8.3',
    'https://maps.google.com/maps?q=47.05,8.3',
  ])('%s is accepted', (url) => {
    expect(ok(pinWriteBodySchema, { mapsLink: url })).toBe(true)
  })

  it.each([
    'http://maps.app.goo.gl/abc',
    'https://maps.app.goo.gl/',
    'https://goo.gl/other/abc',
    'https://www.google.com/search?q=maps',
    'https://evil.example/maps/place',
    'https://www.google.com.evil.example/maps',
    'https://user:pw@www.google.com/maps',
    'https://www.google.com:8443/maps',
    'https://www.google.com/maps with space',
    'javascript:alert(1)',
    'maps.app.goo.gl/abc',
    '',
    `https://www.google.com/maps?q=${'x'.repeat(2000)}`,
  ])('%j is refused', (url) => {
    expect(ok(pinWriteBodySchema, { mapsLink: url })).toBe(false)
  })

  it('null removes the link', () => {
    expect(ok(pinWriteBodySchema, { mapsLink: null })).toBe(true)
  })

  it('knows the same hosts as the link reader of the API', () => {
    for (const host of ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'maps.google.ch', 'google.co.uk', 'evil.example', 'google.com.evil.example'])
      expect(isGoogleMapsHost(host)).toBe(apiIsGoogleMapsHost(host))
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
    draft: { title: { en: 'A' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} },
    published: null,
    firstPublishedAt: null,
    rowVersion: 1,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  }

  it('[E4.2][AC68] a pin response carries the new fields and no type', () => {
    expect(ok(pinSchema, pin)).toBe(true)
    expect(ok(pinSchema, { ...pin, mustVisit: undefined })).toBe(false)
  })

  it('[E4.2][AC68] the alt text of the photos is in the draft, by media id, and a photo is only its media id', () => {
    const withAlt = { ...pin, photos: [{ mediaId: uuid }], draft: { title: { en: 'A' }, tip: {}, localTip: {}, coverAlt: { en: 'Cover' }, photoAlt: { [uuid]: { en: 'Photo' } } } }

    expect(ok(pinSchema, withAlt)).toBe(true)
    expect(ok(pinSchema, { ...withAlt, draft: { ...withAlt.draft, photoAlt: { 'not-an-id': { en: 'Photo' } } } })).toBe(false)
    expect(ok(pinSchema, { ...withAlt, draft: { title: { en: 'A' }, tip: {}, localTip: {} } })).toBe(false)
  })

  it('[E4.2][AC86] a list item may have the status ended and a warning for a story with no published version', () => {
    const item = { id: uuid, status: 'ended', title: { en: 'Blues' }, slug: { en: 'blues' }, located: true, categoryIds: [], hasDates: true, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, mainStory: { groupId: uuid2, published: false }, rowVersion: 3, updatedAt: '2026-10-30T10:00:00.000Z' }

    expect(ok(pinListSchema, { items: [item] })).toBe(true)
    expect(ok(pinListSchema, { items: [{ ...item, status: 'archived' }] })).toBe(false)
  })

  it('[E4.2][AC68] a story option carries its live languages and the state of each language', () => {
    const languages = { en: 'published', de: 'none' }
    expect(ok(pinStoryOptionListSchema, { items: [{ groupId: uuid, kind: 'story', title: { en: 'Chapel Bridge' }, languages, publishedLanguages: ['en'] }] })).toBe(true)
    expect(ok(pinStoryOptionListSchema, { items: [{ groupId: uuid, kind: 'story', title: {}, languages, publishedLanguages: ['fr'] }] })).toBe(false)
    expect(ok(pinStoryOptionListSchema, { items: [{ groupId: uuid, kind: 'story', title: {}, languages: { en: 'live', de: 'none' }, publishedLanguages: [] }] })).toBe(false)
  })
})
