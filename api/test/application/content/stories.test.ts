import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AuditEntry, MediaRow, StoryVersionChanges } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeCreateStoryGroup } from '../../../src/modules/content/application/create-story-group.ts'
import { makeCreateStoryVersion } from '../../../src/modules/content/application/create-story-version.ts'
import { makeDeleteStoryVersion } from '../../../src/modules/content/application/delete-story-version.ts'
import { makeMoveStoryVersion } from '../../../src/modules/content/application/move-story-version.ts'
import { makePublishStoryVersion } from '../../../src/modules/content/application/publish-story-version.ts'
import { makeSaveStoryGroup } from '../../../src/modules/content/application/save-story-group.ts'
import { makeSaveStoryVersion } from '../../../src/modules/content/application/save-story-version.ts'
import { makeUnpublishStoryVersion } from '../../../src/modules/content/application/unpublish-story-version.ts'
import { createFakeStories } from '../../support/fake-stories.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }

const doc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A day on the lake', excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [], ...over })
const complete: StoryVersionChanges = { slug: 'a-day-on-the-lake', draft: doc() }

function setup(media: MediaRow[] = []) {
  const stories = createFakeStories()
  const audit: AuditEntry[] = []
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    stories,
    media: { find: async (_tx: null, _storeId: string, ids: string[]) => media.filter(m => ids.includes(m.id)) },
    audit: { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) },
    clock: createManualClock(new Date('2026-10-27T10:00:00Z')),
  }
  return {
    stories,
    audit,
    createGroup: makeCreateStoryGroup(deps),
    saveGroup: makeSaveStoryGroup(deps),
    createVersion: makeCreateStoryVersion(deps),
    saveVersion: makeSaveStoryVersion(deps),
    publish: makePublishStoryVersion(deps),
    unpublish: makeUnpublishStoryVersion(deps),
    move: makeMoveStoryVersion(deps),
    remove: makeDeleteStoryVersion(deps),
  }
}

type Setup = ReturnType<typeof setup>

async function group(s: Setup) {
  const result = await s.createGroup(owner, store, { kind: 'story', subjectPlaceId: null }, null)
  if (!result.ok)
    throw new Error('create group failed')
  return result.value
}

async function version(s: Setup, groupId: string, language: 'en' | 'de' = 'en', changes: StoryVersionChanges = complete) {
  const result = await s.createVersion(owner, store, groupId, language, changes, null)
  if (!result.ok)
    throw new Error(`create version failed: ${result.reason}`)
  return result.value
}

describe('story use cases', () => {
  it('[E2.6][AC30] a story with a complete EN version and no DE version publishes the EN version and no rule asks for a second language', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const result = await s.publish(owner, store, g.id, 'en', 1, null)
    expect(result).toMatchObject({ ok: true, value: { language: 'en', status: 'published' } })
    expect(s.stories.versions.has(`${g.id}/de`)).toBe(false)
  })

  it.each([
    ['slug', { slug: null }],
    ['title', { draft: doc({ title: ' ' }) }],
  ] as const)('[E2.6][AC30] publishing a version with no %s is incomplete', async (gap, lacking) => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id, 'en', { ...complete, ...lacking })
    expect(await s.publish(owner, store, g.id, 'en', 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: [gap] })
    expect(s.stories.versions.get(`${g.id}/en`)).toMatchObject({ status: 'draft', rowVersion: 1 })
  })

  it('[E2.6][AC30] publishing copies the draft to published, clears the draft, bumps row_version and writes an audit row', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const result = await s.publish(owner, store, g.id, 'en', 1, 'req-1')
    expect(result).toMatchObject({ ok: true, value: { status: 'published', rowVersion: 2, draft: null, published: { title: 'A day on the lake' } } })
    expect(result.ok && result.value.publishedAt).toEqual(new Date('2026-10-27T10:00:00Z'))
    expect(s.audit).toEqual([{ storeId: store, actor: 'staff:u1', entity: 'story-version', entityId: g.id, action: 'published', before: { status: 'draft' }, after: { status: 'published', language: 'en', rowVersion: 2 }, requestId: 'req-1' }])
  })

  it('[E2.6][AC30] clearing the slug of a published version is incomplete', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await s.publish(owner, store, g.id, 'en', 1, null)
    expect(await s.saveVersion(owner, store, g.id, 'en', 2, { slug: null }, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(s.stories.versions.get(`${g.id}/en`)).toMatchObject({ slug: 'a-day-on-the-lake', rowVersion: 2 })
  })

  it('[E2.6][AC30] a published story version cannot move to another group and nothing changes', async () => {
    const s = setup()
    const a = await group(s)
    const b = await group(s)
    await version(s, a.id)
    await s.publish(owner, store, a.id, 'en', 1, null)
    expect(await s.move(owner, store, a.id, 'en', 2, b.id, null)).toEqual({ ok: false, reason: 'published-cannot-move' })
    expect(s.stories.versions.get(`${a.id}/en`)).toMatchObject({ groupId: a.id, rowVersion: 2 })
    expect(s.stories.versions.has(`${b.id}/en`)).toBe(false)
  })

  it('[E2.6] a draft version moves to a group with no version in its language', async () => {
    const s = setup()
    const a = await group(s)
    const b = await group(s)
    await version(s, a.id)
    const result = await s.move(owner, store, a.id, 'en', 1, b.id, null)
    expect(result).toMatchObject({ ok: true, value: { groupId: b.id, rowVersion: 2 } })
    expect(s.stories.versions.has(`${a.id}/en`)).toBe(false)
  })

  it('[E2.6] a move onto a group that has that language is version-exists', async () => {
    const s = setup()
    const a = await group(s)
    const b = await group(s)
    await version(s, a.id)
    await version(s, b.id, 'en', { slug: 'other' })
    expect(await s.move(owner, store, a.id, 'en', 1, b.id, null)).toEqual({ ok: false, reason: 'version-exists' })
    expect(s.stories.versions.get(`${a.id}/en`)).toMatchObject({ groupId: a.id, rowVersion: 1 })
  })

  it('[E2.6] a move onto a group of another store is not-found', async () => {
    const s = setup()
    const a = await group(s)
    await version(s, a.id)
    const foreign = await s.stories.insertGroup(null, 'store-2', { kind: 'story', subjectPlaceId: null }, new Date())
    expect(await s.move(owner, store, a.id, 'en', 1, foreign.id, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] AC-1 a story version saved with a stale If-Match is stale and a missing one never reaches the use case', async () => {
    const s = setup()
    const g = await group(s)
    const v = await version(s, g.id)
    s.stories.versions.set(`${g.id}/en`, { ...v, rowVersion: 3 })
    expect(await s.saveVersion(owner, store, g.id, 'en', 2, { slug: 'other' }, null)).toEqual({ ok: false, reason: 'stale' })
    expect(s.stories.versions.get(`${g.id}/en`)).toMatchObject({ rowVersion: 3, slug: 'a-day-on-the-lake' })
    expect(await s.saveVersion(owner, store, g.id, 'en', 3, { slug: 'other' }, null)).toMatchObject({ ok: true, value: { rowVersion: 4, slug: 'other' } })
  })

  it('[E2.6] AC-1 a story group saved at row_version 3 with If-Match 3 returns 4', async () => {
    const s = setup()
    const g = await group(s)
    s.stories.groups.set(g.id, { ...g, rowVersion: 3 })
    expect(await s.saveGroup(owner, store, g.id, 3, { placeIds: ['p1', 'p2'] }, null)).toMatchObject({ ok: true, value: { rowVersion: 4, placeIds: ['p1', 'p2'] } })
    expect(await s.saveGroup(owner, store, g.id, 3, { placeIds: [] }, null)).toEqual({ ok: false, reason: 'stale' })
  })

  it('[E2.6] AC-6 a retired cover, a retired image block and a retired audio block are each media-retired', async () => {
    const s = setup([
      { id: 'img', kind: 'image', status: 'retired' },
      { id: 'aud', kind: 'audio', status: 'retired' },
      { id: 'ok', kind: 'image', status: 'ready' },
      { id: 'voice', kind: 'audio', status: 'ready' },
    ])
    const g = await group(s)
    const v = await version(s, g.id)
    const block = (b: object) => doc({ sections: [{ id: 's1', heading: '', blocks: [b as never] }] })
    for (const draft of [
      doc({ coverMediaId: 'img' }),
      block({ type: 'image', mediaId: 'img', caption: '' }),
      block({ type: 'audio', mediaId: 'aud', title: '', caption: '' }),
    ])
      expect(await s.saveVersion(owner, store, g.id, 'en', 1, { draft }, null)).toEqual({ ok: false, reason: 'media-retired' })
    expect(await s.createVersion(owner, store, g.id, 'de', { draft: doc({ coverMediaId: 'img' }) }, null)).toEqual({ ok: false, reason: 'media-retired' })
    // An audio file is no cover; an image is no audio block.
    expect(await s.saveVersion(owner, store, g.id, 'en', 1, { draft: doc({ coverMediaId: 'voice' }) }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.saveVersion(owner, store, g.id, 'en', 1, { draft: block({ type: 'audio', mediaId: 'ok', title: '', caption: '' }) }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await s.saveVersion(owner, store, g.id, 'en', 1, { draft: doc({ coverMediaId: 'ok' }) }, null)).toMatchObject({ ok: true })
    expect(s.stories.versions.get(`${g.id}/en`)?.rowVersion).toBe(v.rowVersion + 1)
  })

  it('[E2.6][AC79] a version that kept published text cannot be deleted, a never-published draft version can', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await version(s, g.id, 'de', { slug: 'ein-tag' })
    await s.publish(owner, store, g.id, 'en', 1, null)
    await s.unpublish(owner, store, g.id, 'en', 2, null)
    expect(await s.remove(owner, store, g.id, 'en', null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    expect(s.stories.versions.has(`${g.id}/en`)).toBe(true)
    expect(await s.remove(owner, store, g.id, 'de', null)).toEqual({ ok: true, value: { groupId: g.id, language: 'de' } })
    expect(s.stories.versions.has(`${g.id}/de`)).toBe(false)
  })

  it('[E2.6] unpublishing a draft version is not-published', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    expect(await s.unpublish(owner, store, g.id, 'en', 1, null)).toEqual({ ok: false, reason: 'not-published' })
  })

  it('[E2.6] unpublishing a published version keeps the published text and audits it', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await s.publish(owner, store, g.id, 'en', 1, null)
    const result = await s.unpublish(owner, store, g.id, 'en', 2, 'req-2')
    expect(result).toMatchObject({ ok: true, value: { status: 'draft', rowVersion: 3, published: { title: 'A day on the lake' } } })
    expect(s.audit.at(-1)).toEqual({ storeId: store, actor: 'staff:u1', entity: 'story-version', entityId: g.id, action: 'unpublished', before: { status: 'published' }, after: { status: 'draft', language: 'en', rowVersion: 3 }, requestId: 'req-2' })
  })

  it('[E2.6] creating a version in a language the group has is version-exists, and a missing group is not-found', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    expect(await s.createVersion(owner, store, g.id, 'en', {}, null)).toEqual({ ok: false, reason: 'version-exists' })
    expect(await s.createVersion(owner, store, 'nope', 'en', {}, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] an editorial review needs its subject place and a story must not have one', async () => {
    const s = setup()
    expect(await s.createGroup(owner, store, { kind: 'editorial_review', subjectPlaceId: null }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.createGroup(owner, store, { kind: 'story', subjectPlaceId: 'p1' }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.createGroup(owner, store, { kind: 'editorial_review', subjectPlaceId: 'p1' }, null)).toMatchObject({ ok: true, value: { kind: 'editorial_review', subjectPlaceId: 'p1' } })
  })

  it('[E2.6] a version of a group of another store is not-found for every version use case', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const calls = [
      s.createVersion(outsider2(), 'store-3', g.id, 'de', {}, null),
      s.saveVersion(outsider2(), 'store-3', g.id, 'en', 1, {}, null),
      s.publish(outsider2(), 'store-3', g.id, 'en', 1, null),
      s.unpublish(outsider2(), 'store-3', g.id, 'en', 1, null),
      s.move(outsider2(), 'store-3', g.id, 'en', 1, g.id, null),
      s.remove(outsider2(), 'store-3', g.id, 'en', null),
      s.saveGroup(outsider2(), 'store-3', g.id, 1, {}, null),
    ]
    for (const result of await Promise.all(calls))
      expect(result).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E2.6] AC-7 an outsider is forbidden', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const calls = [
      s.createGroup(outsider, store, { kind: 'story', subjectPlaceId: null }, null),
      s.saveGroup(outsider, store, g.id, 1, {}, null),
      s.createVersion(outsider, store, g.id, 'de', {}, null),
      s.saveVersion(outsider, store, g.id, 'en', 1, {}, null),
      s.publish(outsider, store, g.id, 'en', 1, null),
      s.unpublish(outsider, store, g.id, 'en', 1, null),
      s.move(outsider, store, g.id, 'en', 1, g.id, null),
      s.remove(outsider, store, g.id, 'en', null),
    ]
    for (const result of await Promise.all(calls))
      expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.stories.versions.get(`${g.id}/en`)?.rowVersion).toBe(1)
  })
})

function outsider2(): Actor {
  return { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([['store-3', 'owner']]) }
}
