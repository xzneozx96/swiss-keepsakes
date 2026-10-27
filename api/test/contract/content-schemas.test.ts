import {
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
    expect(ok(pinWriteBodySchema, { categoryIds: Array.from({ length: 21 }).fill(uuid) })).toBe(false)
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
    expect(ok(storyGroupSaveBodySchema, { keepsakeProductIds: Array.from({ length: 7 }).fill(uuid) })).toBe(false)
    expect(storyGroupCreateBodySchema.parse({}).kind).toBe('story')
    expect(ok(storyGroupCreateBodySchema, { kind: 'editorial_review', subjectPlaceId: uuid })).toBe(true)
    expect(ok(storyGroupSaveBodySchema, { kind: 'story' })).toBe(false)
    expect(ok(storyGroupSaveBodySchema, { subjectPlaceId: uuid })).toBe(false)
  })

  it('[E2.6] story draft limits', () => {
    const draft = (sections: unknown[]) => ({ title: 'T', excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections })
    const section = (blocks: unknown[]) => ({ id: 's1', heading: 'H', blocks })
    expect(ok(storyDraftSchema, draft([section([{ type: 'paragraph', text: 'x' }])]))).toBe(true)
    expect(ok(storyDraftSchema, draft(Array.from({ length: 61 }).fill(section([]))))).toBe(false)
    expect(ok(storyDraftSchema, draft([section(Array.from({ length: 201 }).fill({ type: 'paragraph', text: 'x' }))]))).toBe(false)
    expect(ok(storyDraftSchema, draft([section([{ type: 'video', youtubeId: 'dQw4w9WgXcQ', title: 't', caption: '' }])]))).toBe(true)
    expect(ok(storyDraftSchema, draft([section([{ type: 'gif' }])]))).toBe(false)
    expect(ok(storyVersionSaveBodySchema, { draft: draft([]) })).toBe(true)
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
      coverMediaId: null,
      mainStoryGroupId: null,
      categoryIds: [],
      dates: [{ id: uuid, firstDay: '2026-11-01', lastDay: '2026-11-01', startTime: null, endTime: null }],
      draft: null,
      published: { title: { en: 'A' }, tip: {} },
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

  it('[E2.6] a story version view carries a draft without write limits', () => {
    const iso = '2026-10-27T10:00:00.000Z'
    const long = 'x'.repeat(30000)
    const view = { groupId: uuid, storeId: uuid, language: 'en', status: 'draft', slug: null, published: null, publishedAt: null, rowVersion: 1, createdAt: iso, updatedAt: iso }
    const draft = { title: '', excerpt: long, intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [] }
    expect(ok(storyVersionSchema, { ...view, draft })).toBe(true)
  })

  it('[E2.6] every new problem code is in problemTypes', () => {
    for (const code of ['precondition-failed', 'precondition-required', 'publish-incomplete', 'media-retired', 'media-invalid', 'reference-invalid', 'content-slug-taken', 'published-cannot-be-deleted', 'published-version-cannot-move', 'version-exists', 'not-published', 'content-in-use'])
      expect(problemTypes).toContain(code)
  })
})
