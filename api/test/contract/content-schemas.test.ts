import {
  pinPublishBodySchema,
  pinSchema,
  pinWriteBodySchema,
  problemTypes,
  storyDraftSchema,
  storyGroupCreateBodySchema,
  storyGroupSaveBodySchema,
  storyVersionCreateBodySchema,
  storyVersionMoveBodySchema,
  storyVersionSaveBodySchema,
  storyVersionSchema,
  tourPublishBodySchema,
  tourSchema,
  tourWriteBodySchema,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const uuid = '3f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2d'
const uuid2 = '4f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2e'
const uuid3 = '5f1c1d0e-8a57-4c0e-9b8e-5d0f6a7b1c2f'
// n distinct ids, so a length test is not also a duplicate test
const distinct = (n: number) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) => schema.safeParse(value).success

describe('[E2.6] content write schemas', () => {
  it('[E2.6] a pin body with a price is refused', () => {
    expect(ok(pinWriteBodySchema, { title: { en: 'Chapel Bridge' } })).toBe(true)
    expect(ok(pinWriteBodySchema, { title: { en: 'Chapel Bridge' }, price: 10 })).toBe(false)
  })

  it('[E2.6][AC68] a pin body with a type is refused', () => {
    expect(ok(pinWriteBodySchema, { type: 'event' })).toBe(false)
  })

  it('[E2.6][AC30] a pin publish body is optional in its slug, takes a slug in one or both languages and nothing else', () => {
    expect(ok(pinPublishBodySchema, {})).toBe(true)
    expect(ok(pinPublishBodySchema, { slug: { de: 'kapellbruecke' } })).toBe(true)
    expect(ok(pinPublishBodySchema, { slug: { en: 'a', de: 'b' } })).toBe(true)
    expect(ok(pinPublishBodySchema, { slug: {} })).toBe(false)
    expect(ok(pinPublishBodySchema, { slug: { de: 'Not A Slug' } })).toBe(false)
    expect(ok(pinPublishBodySchema, { slug: { fr: 'pont' } })).toBe(false)
    expect(ok(pinPublishBodySchema, { title: { en: 'x' } })).toBe(false)
  })

  it('[E2.6][AC30] a tour publish body is optional in its slug, takes a slug in one or both languages and nothing else', () => {
    expect(ok(tourPublishBodySchema, {})).toBe(true)
    expect(ok(tourPublishBodySchema, { slug: { de: 'luzern-tour' } })).toBe(true)
    expect(ok(tourPublishBodySchema, { slug: { en: 'a', de: 'b' } })).toBe(true)
    expect(ok(tourPublishBodySchema, { slug: {} })).toBe(false)
    expect(ok(tourPublishBodySchema, { slug: { de: 'Not A Slug' } })).toBe(false)
    expect(ok(tourPublishBodySchema, { slug: { fr: 'pont' } })).toBe(false)
    expect(ok(tourPublishBodySchema, { title: { en: 'x' } })).toBe(false)
  })

  it('[E2.6] a localized title of "" or "  " is refused, {} is accepted', () => {
    expect(ok(pinWriteBodySchema, { title: { en: '' } })).toBe(false)
    expect(ok(pinWriteBodySchema, { title: { en: '  ' } })).toBe(false)
    expect(ok(pinWriteBodySchema, { title: {} })).toBe(true)
    expect(ok(pinWriteBodySchema, { title: { en: 'x'.repeat(301) } })).toBe(false)
    expect(ok(pinWriteBodySchema, { title: { en: 'x'.repeat(300) } })).toBe(true)
    const parsed = pinWriteBodySchema.parse({ title: { en: '  Lion  ' } })
    expect(parsed.title).toEqual({ en: 'Lion' })
  })

  it('[E2.6] a one-day date entry with times and a range with times are told apart', () => {
    const date = (d: Record<string, unknown>) => ({ dates: [d] })
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: '10:00', endTime: '12:00' }))).toBe(true)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-03', startTime: '10:00', endTime: null }))).toBe(false)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-03', startTime: null, endTime: null }))).toBe(true)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-03', lastDay: '2026-11-01', startTime: null, endTime: null }))).toBe(false)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: null, endTime: '12:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: '12:00', endTime: '12:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, date({ firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: '10:00', endTime: null }))).toBe(true)
  })

  it('[E2.6] weekly hours need opens before closes', () => {
    const hours = (h: Record<string, unknown>) => ({ weeklyHours: [h] })
    expect(ok(pinWriteBodySchema, hours({ day: 1, opens: '09:00', closes: '17:30' }))).toBe(true)
    expect(ok(pinWriteBodySchema, hours({ day: 1, opens: '09:00', closes: '24:00' }))).toBe(true)
    expect(ok(pinWriteBodySchema, hours({ day: 1, opens: '17:00', closes: '09:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, hours({ day: 1, opens: '09:00', closes: '09:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, hours({ day: 8, opens: '09:00', closes: '10:00' }))).toBe(false)
    expect(ok(pinWriteBodySchema, hours({ day: 1, opens: '24:00', closes: '24:00' }))).toBe(false)
  })

  it('[E2.6] pin location, slug, interests and list limits', () => {
    expect(ok(pinWriteBodySchema, { latitude: 91 })).toBe(false)
    expect(ok(pinWriteBodySchema, { longitude: -181 })).toBe(false)
    expect(ok(pinWriteBodySchema, { latitude: 47.05, longitude: 8.3, address: null })).toBe(true)
    expect(ok(pinWriteBodySchema, { address: '' })).toBe(false)
    expect(ok(pinWriteBodySchema, { slug: { en: 'chapel-bridge' } })).toBe(true)
    expect(ok(pinWriteBodySchema, { slug: { en: 'Chapel Bridge' } })).toBe(false)
    expect(ok(pinWriteBodySchema, { interests: ['food-drink'] })).toBe(true)
    expect(ok(pinWriteBodySchema, { interests: ['nightlife'] })).toBe(false)
    expect(ok(pinWriteBodySchema, { categoryIds: distinct(21) })).toBe(false)
  })

  it('[E2.6] every content write body (pin, story group, story version, tour) refuses a price key', () => {
    const tour = { slug: { en: 'old-town' } }
    expect(ok(tourWriteBodySchema, tour)).toBe(true)
    expect(ok(tourWriteBodySchema, { ...tour, price: 5 })).toBe(false)
    expect(ok(storyGroupCreateBodySchema, {})).toBe(true)
    expect(ok(storyGroupCreateBodySchema, { price: 5 })).toBe(false)
    expect(ok(storyGroupSaveBodySchema, { price: 5 })).toBe(false)
    expect(ok(storyVersionCreateBodySchema, { language: 'en' })).toBe(true)
    expect(ok(storyVersionCreateBodySchema, { language: 'en', price: 5 })).toBe(false)
    expect(ok(storyVersionSaveBodySchema, { price: 5 })).toBe(false)
    expect(ok(storyVersionMoveBodySchema, { targetGroupId: uuid, price: 5 })).toBe(false)
    expect(ok(pinWriteBodySchema, { price: 5 })).toBe(false)
  })

  it('[E2.6] a tour body with a departure is refused', () => {
    expect(ok(tourWriteBodySchema, { departure: '2026-11-01' })).toBe(false)
    expect(ok(tourWriteBodySchema, { departures: [] })).toBe(false)
    expect(ok(tourWriteBodySchema, { durationMinutes: 0 })).toBe(false)
    expect(ok(tourWriteBodySchema, { durationMinutes: null })).toBe(true)
    expect(ok(tourWriteBodySchema, { keepsakeProductIds: distinct(4) })).toBe(false)
    const stop = { latitude: 47, longitude: 8, title: { en: 'Start' }, text: {}, minutesFromStart: 0, mediaId: null, placeId: null }
    expect(ok(tourWriteBodySchema, { stops: [stop] })).toBe(true)
    expect(ok(tourWriteBodySchema, { stops: [{ ...stop, minutesFromStart: -1 }] })).toBe(false)
  })

  it('[E2.6] a story group with 4 related stories is refused', () => {
    expect(ok(storyGroupSaveBodySchema, { relatedGroupIds: [uuid, uuid2, uuid3] })).toBe(true)
    expect(ok(storyGroupSaveBodySchema, { relatedGroupIds: [uuid, uuid2, uuid3, distinct(1)[0]] })).toBe(false)
    expect(ok(storyGroupSaveBodySchema, { keepsakeProductIds: distinct(7) })).toBe(false)
    expect(storyGroupCreateBodySchema.parse({}).kind).toBe('story')
    expect(ok(storyGroupCreateBodySchema, { kind: 'editorial_review', subjectPlaceId: uuid })).toBe(true)
    expect(ok(storyGroupSaveBodySchema, { kind: 'story' })).toBe(false)
    expect(ok(storyGroupSaveBodySchema, { subjectPlaceId: uuid })).toBe(false)
  })

  it('[E2.13] story draft: the old intro, sections and readMinutes are refused and the body is required', () => {
    const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] }
    const draft = { title: 'T', excerpt: '', authorName: '', coverMediaId: null, body }
    expect(ok(storyDraftSchema, draft)).toBe(true)
    expect(ok(storyDraftSchema, { ...draft, intro: '' })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, readMinutes: 3 })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, sections: [] })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, body: undefined })).toBe(false)
    expect(ok(storyVersionSaveBodySchema, { draft })).toBe(true)
    expect(ok(storyVersionSaveBodySchema, { draft: { ...draft, body: 'x' } })).toBe(false)
  })

  it('[E2.14][AC30] story draft: authorRole is refused, and the check date is an optional calendar day', () => {
    const body = { type: 'doc', content: [] }
    const draft = { title: 'T', excerpt: '', authorName: 'Sonja', coverMediaId: null, body }
    const refused = storyDraftSchema.safeParse({ ...draft, authorRole: 'Owner' })
    expect(refused.success).toBe(false)
    expect(JSON.stringify(refused.error?.issues)).toContain('authorRole')
    expect(ok(storyVersionSaveBodySchema, { draft: { ...draft, authorRole: '' } })).toBe(false)
    expect(ok(storyVersionCreateBodySchema, { language: 'en', draft: { ...draft, authorRole: 'Guide' } })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, checkedOn: '2026-10-01' })).toBe(true)
    expect(ok(storyDraftSchema, { ...draft, checkedOn: null })).toBe(true)
    expect(ok(storyDraftSchema, draft)).toBe(true)
    for (const bad of ['2026-13-01', '2026-02-30', 'yesterday', '', '2026-10-01T10:00:00Z'])
      expect(ok(storyDraftSchema, { ...draft, checkedOn: bad })).toBe(false)
  })

  it('[E2.14][AC30] the story view schema has no authorRole and carries the check date', () => {
    const iso = '2026-10-27T10:00:00.000Z'
    const draft = { title: 'T', excerpt: '', authorName: '', coverMediaId: null, checkedOn: '2026-10-01', body: { type: 'doc', content: [] } }
    const view = { groupId: uuid, storeId: uuid, language: 'en', status: 'draft', slug: null, draft, published: null, publishedAt: null, rowVersion: 1, createdAt: iso, updatedAt: iso }
    expect(storyVersionSchema.parse(view).draft).toEqual(draft)
    expect(Object.keys(storyVersionSchema.parse({ ...view, draft: { ...draft, authorRole: 'x' } }).draft!)).not.toContain('authorRole')
  })

  it('[E2.6] views serialise dates as ISO strings', () => {
    const iso = '2026-10-27T10:00:00.000Z'
    const pin = {
      id: uuid,
      storeId: uuid,
      status: 'published',
      slug: { en: 'a' },
      latitude: 1,
      longitude: 2,
      address: null,
      weeklyHours: [],
      stayTag: 'both',
      interests: [],
      serviceType: null,
      mustVisit: false,
      foodKind: null,
      coverMediaId: null,
      photos: [],
      outboundUrl: null,
      mainStoryGroupId: null,
      categoryIds: [],
      dates: [{ id: uuid, firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: null, endTime: null }],
      draft: null,
      published: { title: { en: 'A' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} },
      firstPublishedAt: iso,
      rowVersion: 3,
      createdAt: iso,
      updatedAt: iso,
    }
    expect(ok(pinSchema, pin)).toBe(true)
    expect(ok(pinSchema, { ...pin, createdAt: new Date() })).toBe(false)
    const tour = {
      id: uuid,
      storeId: uuid,
      status: 'draft',
      slug: null,
      stayTag: 'both',
      interests: [],
      durationMinutes: null,
      coverMediaId: null,
      pdfMediaId: null,
      keepsakeProductIds: [],
      stops: [],
      draft: null,
      published: null,
      rowVersion: 1,
      createdAt: iso,
      updatedAt: iso,
    }
    expect(ok(tourSchema, tour)).toBe(true)
  })

  it('[E2.6] a slug map needs a key, and null clears it', () => {
    for (const schema of [pinWriteBodySchema, tourWriteBodySchema]) {
      expect(ok(schema, { slug: {} })).toBe(false)
      expect(ok(schema, { slug: null })).toBe(true)
      expect(ok(schema, { slug: { de: 'altstadt' } })).toBe(true)
    }
  })

  it('[E2.6] null latitude and longitude clear the location', () => {
    expect(ok(pinWriteBodySchema, { latitude: null, longitude: null })).toBe(true)
  })

  it('[E2.6] a story group kind and its subject place agree', () => {
    expect(ok(storyGroupCreateBodySchema, { kind: 'editorial_review' })).toBe(false)
    expect(ok(storyGroupCreateBodySchema, { kind: 'story', subjectPlaceId: uuid })).toBe(false)
    expect(ok(storyGroupCreateBodySchema, { subjectPlaceId: uuid })).toBe(false)
    expect(ok(storyGroupCreateBodySchema, { kind: 'editorial_review', subjectPlaceId: uuid })).toBe(true)
    const result = storyGroupCreateBodySchema.safeParse({ kind: 'editorial_review' })
    expect(!result.success && result.error.issues[0]?.path).toEqual(['subjectPlaceId'])
  })

  it('[E2.6] an id list with a repeated id is refused, in every list', () => {
    const twice = [uuid, uuid]
    const once = [uuid, uuid2]
    for (const key of ['categoryIds', 'placeIds', 'keepsakeProductIds', 'relatedGroupIds']) {
      expect(ok(storyGroupSaveBodySchema, { [key]: twice }), key).toBe(false)
      expect(ok(storyGroupSaveBodySchema, { [key]: once }), key).toBe(true)
    }
    expect(ok(pinWriteBodySchema, { categoryIds: twice })).toBe(false)
    expect(ok(pinWriteBodySchema, { categoryIds: once })).toBe(true)
    expect(ok(tourWriteBodySchema, { keepsakeProductIds: twice })).toBe(false)
    expect(ok(tourWriteBodySchema, { keepsakeProductIds: once })).toBe(true)
  })

  it('[E2.6] ids that differ only in letter case are one id', () => {
    expect(ok(pinWriteBodySchema, { categoryIds: [uuid, uuid.toUpperCase()] })).toBe(false)
    expect(ok(storyGroupSaveBodySchema, { placeIds: [uuid, uuid.toUpperCase()] })).toBe(false)
  })

  it('[E2.6] durations and stop offsets have a ceiling, the boundary passes', () => {
    const stop = { latitude: 47, longitude: 8 }
    expect(ok(tourWriteBodySchema, { durationMinutes: 10080 })).toBe(true)
    expect(ok(tourWriteBodySchema, { durationMinutes: 10081 })).toBe(false)
    expect(ok(tourWriteBodySchema, { durationMinutes: 2147483648 })).toBe(false)
    expect(ok(tourWriteBodySchema, { stops: [{ ...stop, minutesFromStart: 10080 }] })).toBe(true)
    expect(ok(tourWriteBodySchema, { stops: [{ ...stop, minutesFromStart: 10081 }] })).toBe(false)
  })

  it('[E2.6] a pin date is within 2000 to 2100', () => {
    const day = (firstDay: string, lastDay = firstDay) => ({ dates: [{ firstDay, lastDay }] })
    expect(ok(pinWriteBodySchema, day('2000-01-01'))).toBe(true)
    expect(ok(pinWriteBodySchema, day('2100-12-31'))).toBe(true)
    expect(ok(pinWriteBodySchema, day('0000-01-01', '2026-01-01'))).toBe(false)
    expect(ok(pinWriteBodySchema, day('1999-12-31'))).toBe(false)
    expect(ok(pinWriteBodySchema, day('2026-01-01', '2101-01-01'))).toBe(false)
  })

  it('[E2.6] text with a NUL character is refused in every free-text field, a slug may be cleared with null', () => {
    const nul = 'a\u0000b'
    const draft = { title: 'T', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } }
    const paragraph = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })
    expect(ok(pinWriteBodySchema, { title: { en: nul } })).toBe(false)
    expect(ok(pinWriteBodySchema, { tip: { de: nul } })).toBe(false)
    expect(ok(pinWriteBodySchema, { address: nul })).toBe(false)
    expect(ok(tourWriteBodySchema, { draft: { summary: { en: nul } } })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, title: nul })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, body: paragraph(nul) })).toBe(false)
    expect(ok(storyDraftSchema, { ...draft, body: { type: 'doc', content: [{ type: 'image', attrs: { mediaId: uuid, alt: nul, caption: '' } }] } })).toBe(false)
    expect(ok(storyDraftSchema, draft)).toBe(true)
    expect(ok(storyVersionSaveBodySchema, { slug: null })).toBe(true)
  })

  it('[E2.6] a story version view carries a draft without write limits', () => {
    const iso = '2026-10-27T10:00:00.000Z'
    const long = 'x'.repeat(30000)
    const view = { groupId: uuid, storeId: uuid, language: 'en', status: 'draft', slug: null, published: null, publishedAt: null, rowVersion: 1, createdAt: iso, updatedAt: iso }
    const draft = { title: '', excerpt: long, authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } }
    expect(ok(storyVersionSchema, { ...view, draft })).toBe(true)
  })

  it('[E2.6] every new problem code is in problemTypes', () => {
    for (const code of ['precondition-failed', 'precondition-required', 'publish-incomplete', 'media-retired', 'media-invalid', 'reference-invalid', 'content-slug-taken', 'slug-conflict', 'published-cannot-be-deleted', 'published-version-cannot-move', 'version-exists', 'not-published', 'content-in-use'])
      expect(problemTypes).toContain(code)
  })
})
