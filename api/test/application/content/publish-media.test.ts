import type { StoryDraft, TourGuideDoc } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, MediaRecord } from '../../../src/modules/content/ports.ts'
import { emptyStoryBody } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeCreateStoryGroup } from '../../../src/modules/content/application/create-story-group.ts'
import { makeCreateStoryVersion } from '../../../src/modules/content/application/create-story-version.ts'
import { makeCreateTour } from '../../../src/modules/content/application/create-tour.ts'
import { makePublishStoryVersion } from '../../../src/modules/content/application/publish-story-version.ts'
import { makePublishTour } from '../../../src/modules/content/application/publish-tour.ts'
import { createFakeMedia } from '../../support/fake-media.ts'
import { createFakeStories } from '../../support/fake-stories.ts'
import { createFakeTours } from '../../support/fake-tours.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const tx = null

const kinds = { image: 'image/jpeg', audio: 'audio/mpeg', pdf: 'application/pdf' } as const
function row(id: string, kind: keyof typeof kinds, status: MediaRecord['status']): MediaRecord {
  return { id, storeId: store, kind, contentType: kinds[kind], storageKey: `${store}/${id}/original`, byteSize: 1, sha256: 'a'.repeat(64), width: null, height: null, status }
}

function setup(seed: MediaRecord[]) {
  const media = createFakeMedia(seed)
  const audit: AuditEntry[] = []
  const clock = createManualClock(new Date('2026-10-28T10:00:00Z'))
  const uow = { run: <R>(work: (t: null) => Promise<R>) => work(tx) }
  const auditLog = { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) }
  const stories = createFakeStories()
  const tours = createFakeTours()
  const storyDeps = { uow, stories, media, pins: { idsInStore: async () => [] }, audit: auditLog, clock }
  const tourDeps = { uow, tours, media, audit: auditLog, clock, jobs: { send: async () => {} }, graceHours: 24 }
  const ready = (id: string) => media.markReady(tx, media.rows.get(id)!, undefined, clock.now())
  return { ready, stories, createGroup: makeCreateStoryGroup(storyDeps), createVersion: makeCreateStoryVersion(storyDeps), publishStory: makePublishStoryVersion(storyDeps), createTour: makeCreateTour(tourDeps), publishTour: makePublishTour(tourDeps) }
}

const storyDoc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A day on the lake', excerpt: '', authorName: '', authorRole: '', coverMediaId: null, body: emptyStoryBody, ...over })
const tourDoc: TourGuideDoc = { title: { en: 'Old town walk' }, summary: {}, meetingPoint: {}, sections: [] }

async function story(s: ReturnType<typeof setup>, draft: StoryDraft) {
  const group = await s.createGroup(owner, store, { kind: 'story', subjectPlaceId: null }, null)
  if (!group.ok)
    throw new Error('group')
  const version = await s.createVersion(owner, store, group.value.id, 'en', { slug: 'a-day-on-the-lake', draft }, null)
  if (!version.ok)
    throw new Error(`version: ${version.reason}`)
  return group.value.id
}

async function tour(s: ReturnType<typeof setup>, changes: object) {
  const result = await s.createTour(owner, store, { slug: { en: 'old-town-walk' }, pdfMediaId: 'pdf', draft: tourDoc, ...changes }, null)
  if (!result.ok)
    throw new Error(`tour: ${result.reason}`)
  return result.value.id
}

describe('[E2.7] publish refuses media that is still processing', () => {
  it('[E2.7] a story whose cover is processing is media-processing and stays unpublished, then publishes once the cover is ready', async () => {
    const s = setup([row('cover', 'image', 'processing')])
    const id = await story(s, storyDoc({ coverMediaId: 'cover' }))
    expect(await s.publishStory(owner, store, id, 'en', 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['cover'] })
    expect(s.stories.versions.get(`${id}/en`)?.status).toBe('draft')
    await s.ready('cover')
    expect(await s.publishStory(owner, store, id, 'en', 1, null)).toMatchObject({ ok: true, value: { status: 'published' } })
  })

  it('[E2.7] a story whose body image or audio is processing is media-processing', async () => {
    const s = setup([row('img', 'image', 'ready'), row('mp3', 'audio', 'processing')])
    const id = await story(s, storyDoc({ body: { type: 'doc', content: [{ type: 'image', attrs: { mediaId: 'img', alt: '', caption: '' } }, { type: 'audio', attrs: { mediaId: 'mp3', title: '', caption: '' } }] } }))
    expect(await s.publishStory(owner, store, id, 'en', 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['mp3'] })
  })

  it('[E2.7] media-processing names every processing file once, and leaves out the ready ones', async () => {
    const s = setup([row('pdf', 'pdf', 'processing'), row('cover', 'image', 'processing'), row('photo', 'image', 'ready')])
    const stop = { latitude: 47, longitude: 8, title: { en: 'Stop' }, text: {}, minutesFromStart: 0, placeId: null }
    const id = await tour(s, { coverMediaId: 'cover', stops: [{ ...stop, mediaId: 'cover' }, { ...stop, mediaId: 'photo' }] })
    const result = await s.publishTour(owner, store, id, 1, null)
    expect(result).toMatchObject({ ok: false, reason: 'media-processing' })
    expect((result as { mediaIds: string[] }).mediaIds.toSorted()).toEqual(['cover', 'pdf'])
  })

  it('[E2.7] a ready cover, and a story with no media, publish as before', async () => {
    const s = setup([row('cover', 'image', 'ready')])
    const withCover = await story(s, storyDoc({ coverMediaId: 'cover' }))
    expect(await s.publishStory(owner, store, withCover, 'en', 1, null)).toMatchObject({ ok: true })
    const bare = await story(s, storyDoc())
    expect(await s.publishStory(owner, store, bare, 'en', 1, null)).toMatchObject({ ok: true })
  })

  it('[E2.7] the stale check comes before the media check, the media check before the publish gaps', async () => {
    const s = setup([row('cover', 'image', 'processing'), row('pdf', 'pdf', 'ready')])
    const id = await story(s, storyDoc({ coverMediaId: 'cover' }))
    expect(await s.publishStory(owner, store, id, 'en', 9, null)).toEqual({ ok: false, reason: 'stale' })
    const t = await tour(s, { slug: null, coverMediaId: 'cover' })
    expect(await s.publishTour(owner, store, t, 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['cover'] })
  })

  it('[E2.7] a tour whose PDF is processing is media-processing, and publishes after markReady', async () => {
    const s = setup([row('pdf', 'pdf', 'processing')])
    const id = await tour(s, {})
    expect(await s.publishTour(owner, store, id, 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['pdf'] })
    await s.ready('pdf')
    expect(await s.publishTour(owner, store, id, 1, null)).toMatchObject({ ok: true, value: { status: 'published' } })
  })

  it('[E2.7] a tour whose cover or stop photo is processing is media-processing', async () => {
    const stop = { latitude: 47, longitude: 8, title: { en: 'Stop' }, text: {}, minutesFromStart: 0, placeId: null }
    const s = setup([row('pdf', 'pdf', 'ready'), row('cover', 'image', 'processing'), row('photo', 'image', 'processing')])
    const cover = await tour(s, { coverMediaId: 'cover' })
    expect(await s.publishTour(owner, store, cover, 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['cover'] })
    const photo = await tour(s, { stops: [{ ...stop, mediaId: 'photo' }] })
    expect(await s.publishTour(owner, store, photo, 1, null)).toEqual({ ok: false, reason: 'media-processing', mediaIds: ['photo'] })
  })

  it('[E2.7] a tour with ready files publishes', async () => {
    const s = setup([row('pdf', 'pdf', 'ready'), row('cover', 'image', 'ready')])
    const id = await tour(s, { coverMediaId: 'cover' })
    expect(await s.publishTour(owner, store, id, 1, null)).toMatchObject({ ok: true })
  })
})
