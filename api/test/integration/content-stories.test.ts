import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { guardUseCases, mapDatabaseError } from '../../src/modules/content/adapters/database-errors.ts'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { createStoryRepository } from '../../src/modules/content/adapters/story-repository.ts'
import { makeCreateStoryGroup } from '../../src/modules/content/application/create-story-group.ts'
import { makeCreateStoryVersion } from '../../src/modules/content/application/create-story-version.ts'
import { makeDeleteStoryVersion } from '../../src/modules/content/application/delete-story-version.ts'
import { makeMoveStoryVersion } from '../../src/modules/content/application/move-story-version.ts'
import { makePublishStoryVersion } from '../../src/modules/content/application/publish-story-version.ts'
import { makeSaveStoryGroup } from '../../src/modules/content/application/save-story-group.ts'
import { makeSaveStoryVersion } from '../../src/modules/content/application/save-story-version.ts'
import { makeUnpublishStoryVersion } from '../../src/modules/content/application/unpublish-story-version.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { createContentHttp } from './content-http.ts'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

function setup() {
  const store = randomUUID()
  const actor: Actor = { kind: 'staff', userId: randomUUID(), guestId: randomUUID(), stores: new Map([[store, 'owner']]) }
  const clock = createManualClock(new Date('2026-10-27T10:00:00Z'))
  const uow = createUnitOfWork(db)
  const stories = createStoryRepository()
  const deps = { uow, stories, media: createMediaRepository(), audit: createAuditLog(clock), clock }
  const use = guardUseCases({
    createGroup: makeCreateStoryGroup(deps),
    saveGroup: makeSaveStoryGroup(deps),
    createVersion: makeCreateStoryVersion(deps),
    saveVersion: makeSaveStoryVersion(deps),
    publish: makePublishStoryVersion(deps),
    unpublish: makeUnpublishStoryVersion(deps),
    move: makeMoveStoryVersion(deps),
    remove: makeDeleteStoryVersion(deps),
  })
  return { store, actor, use, uow, stories }
}

type Setup = ReturnType<typeof setup>

const slug = () => `story-${randomUUID().slice(0, 8)}`
const doc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A day on the lake', excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [], ...over })

async function media(store: string, kind: 'image' | 'audio' = 'image'): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, $2, $3, $4, 10, repeat('a', 64), 'ready') returning id`,
    [store, kind, `${store}/${randomUUID()}`, kind === 'audio' ? 'audio/mpeg' : 'image/jpeg'],
  )
  return rows[0]!.id
}

async function group(s: Setup, extra: Record<string, unknown> = {}) {
  const result = await s.use.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: null, ...extra }, null)
  if (!result.ok)
    throw new Error(`create group failed: ${result.reason}`)
  return result.value
}

async function version(s: Setup, groupId: string, language: 'en' | 'de' = 'en', changes: { slug?: string | null, draft?: StoryDraft } = { slug: slug(), draft: doc() }) {
  const result = await s.use.createVersion(s.actor, s.store, groupId, language, changes, null)
  if (!result.ok)
    throw new Error(`create version failed: ${result.reason}`)
  return result.value
}

async function thrown(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work()
  }
  catch (error) {
    return error
  }
  throw new Error('expected a failure')
}

const refs = (groupId: string, slot: string) => count(pool, `select count(*) from content.media_refs where owner_id = $1 and slot = $2`, [groupId, slot])

async function versionRow(groupId: string, language = 'en') {
  const { rows } = await pool.query<{ group_id: string, status: string, row_version: number, published: unknown, draft: unknown }>(
    'select group_id, status, row_version, published, draft from content.story_versions where group_id = $1 and language = $2',
    [groupId, language],
  )
  return rows[0]
}

describe('[E2.6] story repository on the real database', () => {
  it('[E2.6][AC30] EN publishes alone against the real guards', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const result = await s.use.publish(s.actor, s.store, g.id, 'en', 1, randomUUID())
    expect(result).toMatchObject({ ok: true, value: { language: 'en', status: 'published', rowVersion: 2, draft: null, published: { title: 'A day on the lake' } } })
    expect(result.ok && result.value.publishedAt).toBeInstanceOf(Date)
    expect(await count(pool, `select count(*) from content.story_versions where group_id = $1`, [g.id])).toBe(1)
    expect(await count(pool, `select count(*) from platform.audit_log where entity = 'story-version' and entity_id = $1 and action = 'published' and after->>'language' = 'en'`, [g.id])).toBe(1)
    const unpublished = await s.use.unpublish(s.actor, s.store, g.id, 'en', 2, null)
    expect(unpublished).toMatchObject({ ok: true, value: { status: 'draft', rowVersion: 3, published: { title: 'A day on the lake' } } })
    const again = await s.use.publish(s.actor, s.store, g.id, 'en', 3, null)
    expect(again).toMatchObject({ ok: true, value: { status: 'published', publishedAt: result.ok ? result.value.publishedAt : null } })
  })

  it('[E2.6][AC30] publishing a version with no slug is incomplete and the row stays a draft', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id, 'en', { draft: doc() })
    expect(await s.use.publish(s.actor, s.store, g.id, 'en', 1, null)).toEqual({ ok: false, reason: 'incomplete', gaps: ['slug'] })
    expect(await versionRow(g.id)).toMatchObject({ status: 'draft', row_version: 1 })
  })

  it('[E2.6] AC-1 two saves racing with the same If-Match: one 200, one stale, row_version +1', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    const results = await Promise.all([
      s.use.saveVersion(s.actor, s.store, g.id, 'en', 1, { draft: doc({ title: 'One' }) }, null),
      s.use.saveVersion(s.actor, s.store, g.id, 'en', 1, { draft: doc({ title: 'Two' }) }, null),
    ])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(results.filter(r => !r.ok)).toEqual([{ ok: false, reason: 'stale' }])
    expect((await versionRow(g.id))?.row_version).toBe(2)
  })

  it('[E2.6] the same slug in the same language on two versions is slug-taken', async () => {
    const s = setup()
    const taken = slug()
    const a = await group(s)
    await version(s, a.id, 'en', { slug: taken })
    const b = await group(s)
    expect(await s.use.createVersion(s.actor, s.store, b.id, 'en', { slug: taken }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    const other = await version(s, b.id, 'en', { slug: slug() })
    expect(await s.use.saveVersion(s.actor, s.store, b.id, 'en', other.rowVersion, { slug: taken }, null)).toEqual({ ok: false, reason: 'slug-taken' })
    expect((await versionRow(b.id))?.row_version).toBe(1)
    // The same slug in the other language is another URL.
    expect(await s.use.createVersion(s.actor, s.store, b.id, 'de', { slug: taken }, null)).toMatchObject({ ok: true })
  })

  it('[E2.6] media_refs follow the save: draft refs replaced, published refs after publish, so retiring a used media row is refused by the database', async () => {
    const s = setup()
    const cover = await media(s.store)
    const voice = await media(s.store, 'audio')
    const next = await media(s.store)
    const g = await group(s)
    const withMedia = doc({ coverMediaId: cover, sections: [{ id: 's1', heading: 'H', blocks: [{ type: 'audio', mediaId: voice, title: '', caption: '' }, { type: 'image', mediaId: cover, caption: '' }] }] })
    await version(s, g.id, 'en', { slug: slug(), draft: withMedia })
    expect(await refs(g.id, 'draft')).toBe(2)
    const retire = (id: string) => pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [id])
    expect(await thrown(() => retire(cover))).toMatchObject({ code: '23001' })

    await s.use.saveVersion(s.actor, s.store, g.id, 'en', 1, { draft: doc({ coverMediaId: next }) }, null)
    expect(await refs(g.id, 'draft')).toBe(1)
    await retire(voice)

    await s.use.publish(s.actor, s.store, g.id, 'en', 2, null)
    expect(await refs(g.id, 'draft')).toBe(0)
    expect(await refs(g.id, 'published')).toBe(1)
    expect(await thrown(() => retire(next))).toMatchObject({ code: '23001' })
    expect(await s.use.saveVersion(s.actor, s.store, g.id, 'en', 3, { draft: doc({ coverMediaId: voice }) }, null)).toEqual({ ok: false, reason: 'media-retired' })

    // A draft version that is deleted lets go of its media.
    const lone = await group(s)
    const loneCover = await media(s.store)
    await version(s, lone.id, 'de', { slug: slug(), draft: doc({ coverMediaId: loneCover }) })
    expect(await refs(lone.id, 'draft')).toBe(1)
    expect(await s.use.remove(s.actor, s.store, lone.id, 'de', null)).toMatchObject({ ok: true })
    expect(await refs(lone.id, 'draft')).toBe(0)
    await retire(loneCover)
  })

  it('[E2.6] one media file written with different letter case in two blocks leaves one media_refs row', async () => {
    const s = setup()
    const image = await media(s.store)
    const g = await group(s)
    const block = (mediaId: string) => ({ type: 'image' as const, mediaId, caption: '' })
    const draft = doc({ sections: [{ id: 's1', heading: '', blocks: [block(image), block(image.toUpperCase())] }] })
    expect(await s.use.createVersion(s.actor, s.store, g.id, 'en', { slug: slug(), draft }, null)).toMatchObject({ ok: true })
    expect(await refs(g.id, 'draft')).toBe(1)
  })

  it('[E2.6] media of another store is media-invalid and nothing is written', async () => {
    const s = setup()
    const foreign = await media(randomUUID())
    const g = await group(s)
    expect(await s.use.createVersion(s.actor, s.store, g.id, 'en', { draft: doc({ coverMediaId: foreign }) }, null)).toEqual({ ok: false, reason: 'media-invalid' })
    expect(await count(pool, 'select count(*) from content.story_versions where group_id = $1', [g.id])).toBe(0)
  })

  it('[E2.6][AC30] a move of a published version is refused by the use case and the row\'s group_id is unchanged (the database has no trigger for it)', async () => {
    const s = setup()
    const a = await group(s)
    const b = await group(s)
    await version(s, a.id)
    await s.use.publish(s.actor, s.store, a.id, 'en', 1, null)
    expect(await s.use.move(s.actor, s.store, a.id, 'en', 2, b.id, null)).toEqual({ ok: false, reason: 'published-cannot-move' })
    expect(await versionRow(a.id)).toMatchObject({ group_id: a.id, row_version: 2 })
    expect(await versionRow(b.id)).toBeUndefined()
  })

  it('[E2.6] a draft version moves with its media refs; a group with that language, or of another store, refuses', async () => {
    const s = setup()
    const cover = await media(s.store)
    const a = await group(s)
    const b = await group(s)
    const c = await group(s)
    await version(s, a.id, 'en', { slug: slug(), draft: doc({ coverMediaId: cover }) })
    await version(s, c.id, 'en', { slug: slug() })
    expect(await s.use.move(s.actor, s.store, a.id, 'en', 1, c.id, null)).toEqual({ ok: false, reason: 'version-exists' })
    const foreign = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [randomUUID()])).rows[0]!.id
    expect(await s.use.move(s.actor, s.store, a.id, 'en', 1, foreign, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.use.move(s.actor, s.store, a.id, 'en', 1, randomUUID(), null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.use.move(s.actor, s.store, a.id, 'en', 1, b.id, null)).toMatchObject({ ok: true, value: { groupId: b.id, rowVersion: 2 } })
    expect(await versionRow(a.id)).toBeUndefined()
    expect(await refs(b.id, 'draft')).toBe(1)
    expect(await refs(a.id, 'draft')).toBe(0)
  })

  it('[E2.6][AC79] a direct delete of a version that kept published text raises restrict_violation and mapDatabaseError says published-cannot-be-deleted', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await s.use.publish(s.actor, s.store, g.id, 'en', 1, null)
    await s.use.unpublish(s.actor, s.store, g.id, 'en', 2, null)
    const error = await thrown(() => s.uow.run(tx => s.stories.removeVersion(tx, s.store, g.id, 'en')))
    expect(error).toMatchObject({ cause: { code: '23001' } })
    expect(mapDatabaseError(error)).toEqual({ reason: 'published-cannot-be-deleted' })
    expect(await s.use.remove(s.actor, s.store, g.id, 'en', null)).toEqual({ ok: false, reason: 'published-cannot-be-deleted' })
    expect(await versionRow(g.id)).toMatchObject({ status: 'draft' })
    const lone = await version(s, g.id, 'de', { slug: slug() })
    expect(await s.use.remove(s.actor, s.store, g.id, lone.language, null)).toEqual({ ok: true, value: { groupId: g.id, language: 'de' } })
  })

  it('[E2.6][AC79] the database refuses to clear published text, and mapDatabaseError does not call that in-use', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await s.use.publish(s.actor, s.store, g.id, 'en', 1, null)
    const error = await thrown(() => pool.query(`update content.story_versions set published = null, status = 'draft' where group_id = $1`, [g.id]))
    expect(error).toMatchObject({ code: '23001', message: expect.stringContaining('cannot change after insert') })
    expect(mapDatabaseError({ cause: error })).toBeUndefined()
  })

  it('[E2.6] a published version saved to a state the CHECK refuses is mapped to incomplete', async () => {
    const s = setup()
    const g = await group(s)
    await version(s, g.id)
    await s.use.publish(s.actor, s.store, g.id, 'en', 1, null)
    const error = await thrown(() => pool.query(`update content.story_versions set slug = null where group_id = $1`, [g.id]))
    expect(error).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
    expect(mapDatabaseError({ cause: error })).toEqual({ reason: 'incomplete', gaps: [] })
  })

  it('[E2.6] category, place and related links of a group are replaced as lists and a category of another store is reference-invalid', async () => {
    const s = setup()
    const category = async (store: string) => (await pool.query<{ id: string }>(
      `insert into content.blog_categories (store_id, name, slug) values ($1, '{"en":"Food"}', $2) returning id`,
      [store, slug()],
    )).rows[0]!.id
    const pin = async () => (await pool.query<{ id: string }>(`insert into content.places (store_id) values ($1) returning id`, [s.store])).rows[0]!.id
    const [c1, c2, foreignCategory] = [await category(s.store), await category(s.store), await category(randomUUID())]
    const [p1, p2, p3] = [await pin(), await pin(), await pin()]
    const other = await group(s)
    const g = await group(s, { categoryIds: [c1], placeIds: [p1, p2], keepsakeProductIds: [randomUUID(), randomUUID()], relatedGroupIds: [other.id] })
    expect(g).toMatchObject({ categoryIds: [c1], placeIds: [p1, p2], relatedGroupIds: [other.id] })
    const saved = await s.use.saveGroup(s.actor, s.store, g.id, 1, { categoryIds: [c2], placeIds: [p3, p1], keepsakeProductIds: [] }, null)
    expect(saved).toMatchObject({ ok: true, value: { rowVersion: 2, categoryIds: [c2], placeIds: [p3, p1], keepsakeProductIds: [], relatedGroupIds: [other.id] } })
    expect((await pool.query('select position from content.story_group_places where group_id = $1 order by position', [g.id])).rows).toEqual([{ position: 1 }, { position: 2 }])

    expect(await s.use.saveGroup(s.actor, s.store, g.id, 2, { categoryIds: [foreignCategory] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.saveGroup(s.actor, s.store, g.id, 2, { relatedGroupIds: [g.id] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.saveGroup(s.actor, s.store, g.id, 2, { placeIds: [randomUUID()] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.saveGroup(s.actor, s.store, g.id, 2, { relatedGroupIds: [randomUUID()] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: null, categoryIds: [foreignCategory] }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await count(pool, 'select count(*) from content.story_categories where group_id = $1', [g.id])).toBe(1)
    expect((await pool.query<{ row_version: number }>('select row_version from content.story_groups where id = $1', [g.id])).rows[0]?.row_version).toBe(2)
  })

  it('[E2.6] a story group of editorial_review needs its subject pin and a story must not have one', async () => {
    const s = setup()
    const pins = createPinRepository()
    const pin = await s.uow.run(tx => pins.insert(tx, s.store, { title: { en: 'Chapel Bridge' } }, new Date()))
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'editorial_review', subjectPlaceId: null }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: pin.id }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'editorial_review', subjectPlaceId: pin.id }, null)).toMatchObject({ ok: true, value: { kind: 'editorial_review', subjectPlaceId: pin.id } })
    // What the use case checks up front, the database CHECK still maps if it is reached.
    const error = await thrown(() => pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'editorial_review')`, [s.store]))
    expect(mapDatabaseError({ cause: error })).toEqual({ reason: 'reference-invalid' })
    // The subject place is a deferred foreign key: a pin of another store, or none, is refused at commit.
    const foreign = await s.uow.run(tx => pins.insert(tx, randomUUID(), { title: { en: 'Elsewhere' } }, new Date()))
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'editorial_review', subjectPlaceId: foreign.id }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    expect(await s.use.createGroup(s.actor, s.store, { kind: 'editorial_review', subjectPlaceId: randomUUID() }, null)).toEqual({ ok: false, reason: 'reference-invalid' })
    // And the pin cannot be deleted while a review is about it.
    const error2 = await thrown(() => s.uow.run(tx => pins.remove(tx, s.store, pin.id)))
    expect(mapDatabaseError(error2)).toEqual({ reason: 'in-use' })
  })
})

// The story routes over the real app: real sessions, the real Idempotency-Key middleware and the real database.
describe('[E2.6] the story routes over the real app and the database', () => {
  // Every sign-in is two round trips and several statements, which is slow against a Neon branch.
  const env = createContentHttp({ pool, db })
  const timeout = 120_000

  async function auditRows(entityId: string) {
    return (await pool.query<{ entity: string, action: string, store_id: string, request_id: string }>(
      `select entity, action, store_id, request_id from platform.audit_log where entity_id = $1 order by at, id`,
      [entityId],
    )).rows
  }

  async function groupAndVersion(staff: Awaited<ReturnType<typeof env.storeWithStaff>>, body: object = { slug: slug(), draft: doc() }) {
    const { owner, groups } = staff
    const created = await (await env.call(groups, { method: 'POST', headers: owner.headers, body: {} })).json() as { id: string }
    const made = await env.call(`${groups}/${created.id}/versions`, { method: 'POST', headers: owner.headers, body: { language: 'en', ...body } })
    return { groupId: created.id, versionPath: `${groups}/${created.id}/versions/en`, made }
  }

  it('[E2.6] AC-1 end to end for a story version with real ETags', async () => {
    const staff = await env.storeWithStaff()
    const { owner, groups } = staff

    const createdGroup = await env.call(groups, { method: 'POST', headers: owner.headers, body: { interests: ['food-drink'] } })
    expect(createdGroup.status).toBe(201)
    expect(createdGroup.headers.get('ETag')).toBe('"1"')
    const groupBody = await createdGroup.json() as { id: string }
    expect(groupBody).toMatchObject({ kind: 'story', interests: ['food-drink'], rowVersion: 1 })

    const createdVersion = await env.call(`${groups}/${groupBody.id}/versions`, { method: 'POST', headers: owner.headers, body: { language: 'en', slug: slug(), draft: doc() } })
    expect(createdVersion.status).toBe(201)
    expect(createdVersion.headers.get('ETag')).toBe('"1"')
    const path = `${groups}/${groupBody.id}/versions/en`

    const saved = await env.call(path, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': createdVersion.headers.get('ETag')! }, body: { draft: doc({ title: 'Second title' }) } })
    expect(saved.status).toBe(200)
    expect(saved.headers.get('ETag')).toBe('"2"')
    expect(await saved.json()).toMatchObject({ status: 'draft', rowVersion: 2, draft: { title: 'Second title' } })

    const stale = await env.call(path, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: { draft: doc({ title: 'Lost' }) } })
    expect(stale.status).toBe(412)
    expect(stale.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    const none = await env.call(path, { method: 'PATCH', headers: owner.headers, body: { draft: doc({ title: 'Lost' }) } })
    expect(none.status).toBe(428)
    const bad = await env.call(path, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': 'abc' }, body: {} })
    expect(bad.status).toBe(400)
    expect(await versionRow(groupBody.id)).toMatchObject({ row_version: 2, draft: { title: 'Second title' } })

    const savedGroup = await env.call(`${groups}/${groupBody.id}`, { method: 'PATCH', headers: { ...owner.headers, 'If-Match': '1' }, body: { stayTag: 'multi_day' } })
    expect(savedGroup.status).toBe(200)
    expect(savedGroup.headers.get('ETag')).toBe('"2"')
    const second = await env.call(`${groups}/${groupBody.id}/versions`, { method: 'POST', headers: owner.headers, body: { language: 'en' } })
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ type: 'version-exists' })
  }, timeout)

  it('[E2.6][AC30] publish end to end writes an audit row, and the other language is untouched', async () => {
    const staff = await env.storeWithStaff()
    const { groupId, versionPath } = await groupAndVersion(staff)

    const published = await env.call(`${versionPath}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    expect(published.status).toBe(200)
    expect(published.headers.get('ETag')).toBe('"2"')
    expect(await published.json()).toMatchObject({ language: 'en', status: 'published', draft: null, published: { title: 'A day on the lake' }, rowVersion: 2 })
    const [row, ...rest] = await auditRows(groupId)
    expect(rest).toEqual([])
    expect(row).toMatchObject({ entity: 'story-version', action: 'published', store_id: staff.storeId })
    expect(row?.request_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await count(pool, 'select count(*) from content.story_versions where group_id = $1', [groupId])).toBe(1)

    const unpublished = await env.call(`${versionPath}/unpublish`, { method: 'POST', headers: { ...staff.manager.headers, 'If-Match': '2' } })
    expect(unpublished.status).toBe(200)
    expect(await unpublished.json()).toMatchObject({ status: 'draft', rowVersion: 3 })
    expect((await auditRows(groupId)).map(r => r.action)).toEqual(['published', 'unpublished'])
  }, timeout)

  it('[E2.6] a publish with no slug answers 422 publish-incomplete and writes no audit row', async () => {
    const staff = await env.storeWithStaff()
    const { groupId, versionPath } = await groupAndVersion(staff, { draft: doc() })

    const response = await env.call(`${versionPath}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ in: 'body', path: 'slug' }] })
    expect(await auditRows(groupId)).toEqual([])
  }, timeout)

  it('[E2.6][AC79] deleting a published version answers 409, and a draft one 204', async () => {
    const staff = await env.storeWithStaff()
    const { groupId, versionPath } = await groupAndVersion(staff)
    await env.call(`${versionPath}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    const refused = await env.call(versionPath, { method: 'DELETE', headers: staff.owner.headers })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'published-cannot-be-deleted' })
    expect(await count(pool, 'select count(*) from content.story_versions where group_id = $1', [groupId])).toBe(1)

    const draft = await groupAndVersion(staff)
    const removed = await env.call(draft.versionPath, { method: 'DELETE', headers: staff.owner.headers })
    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe('')
    expect(await count(pool, 'select count(*) from content.story_versions where group_id = $1', [draft.groupId])).toBe(0)
  }, timeout)

  it('[E2.6][AC30] a published version answers 409 published-version-cannot-move, a draft one moves', async () => {
    const staff = await env.storeWithStaff()
    const { owner, groups } = staff
    const published = await groupAndVersion(staff)
    await env.call(`${published.versionPath}/publish`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' } })
    const target = await (await env.call(groups, { method: 'POST', headers: owner.headers, body: {} })).json() as { id: string }

    const refused = await env.call(`${published.versionPath}/move`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '2' }, body: { targetGroupId: target.id } })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'published-version-cannot-move' })

    const draft = await groupAndVersion(staff)
    const moved = await env.call(`${draft.versionPath}/move`, { method: 'POST', headers: { ...owner.headers, 'If-Match': '1' }, body: { targetGroupId: target.id } })
    expect(moved.status).toBe(200)
    expect(moved.headers.get('ETag')).toBe('"2"')
    expect(await moved.json()).toMatchObject({ groupId: target.id, language: 'en', rowVersion: 2 })
  }, timeout)

  it('[E2.6] AC-6 a retired cover answers 422 media-retired and the draft is unchanged', async () => {
    const staff = await env.storeWithStaff()
    const { groupId, versionPath } = await groupAndVersion(staff)
    const cover = await media(staff.storeId)
    await pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [cover])

    const response = await env.call(versionPath, { method: 'PATCH', headers: { ...staff.owner.headers, 'If-Match': '1' }, body: { draft: doc({ coverMediaId: cover }) } })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'media-retired' })
    expect(await versionRow(groupId)).toMatchObject({ row_version: 1, draft: { coverMediaId: null } })
  }, timeout)

  it('[E2.6] AC-7 the other store\'s owner gets 403 and a group of another store is 404 through my store', async () => {
    const lucerne = await env.storeWithStaff()
    const zug = await env.storeWithStaff()
    const theirs = await groupAndVersion(zug)

    const refused = await env.call(lucerne.groups, { method: 'POST', headers: zug.owner.headers, body: {} })
    expect(refused.status).toBe(403)
    expect((await env.call(lucerne.groups, { method: 'POST', body: {} })).status).toBe(401)

    const through = `${lucerne.groups}/${theirs.groupId}/versions/en`
    const headers = { ...lucerne.owner.headers, 'If-Match': '1' }
    expect((await env.call(through, { method: 'PATCH', headers, body: {} })).status).toBe(404)
    expect((await env.call(`${through}/publish`, { method: 'POST', headers })).status).toBe(404)
    expect((await env.call(through, { method: 'DELETE', headers: lucerne.owner.headers })).status).toBe(404)
    expect((await env.call(`${lucerne.groups}/${theirs.groupId}`, { method: 'PATCH', headers, body: {} })).status).toBe(404)
    expect(await versionRow(theirs.groupId)).toMatchObject({ row_version: 1 })
  }, timeout)

  it('[E2.6] a replayed publish with the same Idempotency-Key answers the first response and writes one audit row', async () => {
    const staff = await env.storeWithStaff()
    const { groupId, versionPath } = await groupAndVersion(staff)
    const key = `publish-${randomUUID()}`
    const publish = () => env.call(`${versionPath}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' }, key })

    const first = await publish()
    const again = await publish()

    expect(first.status).toBe(200)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await again.json()).toEqual(await first.json())
    expect(await auditRows(groupId)).toHaveLength(1)
  }, timeout)
})
