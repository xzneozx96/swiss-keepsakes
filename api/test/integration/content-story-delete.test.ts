import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import { randomUUID } from 'node:crypto'
import { emptyStoryBody } from '@sk/domain/content'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { createStoryRepository } from '../../src/modules/content/adapters/story-repository.ts'
import { makeDeleteStoryGroup } from '../../src/modules/content/application/delete-story-group.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createContentHttp } from './content-http.ts'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

// Delete story (E4.3, migration 0024) over the real app and the real database.
const { pool, db } = openTestDatabase()
const env = createContentHttp({ pool, db })

afterAll(async () => {
  await pool.end()
})

type Staff = Awaited<ReturnType<typeof env.storeWithStaff>>

const slug = () => `story-${randomUUID().slice(0, 8)}`
const doc = (cover: string): StoryDraft => ({ title: 'A day on the lake', excerpt: 'A day out on the water.', authorName: '', coverMediaId: cover, body: emptyStoryBody })

async function image(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), 'ready') returning id`,
    [store, `${store}/${randomUUID()}`],
  )
  return rows[0]!.id
}

// A story with an English draft and a German version that is published, through the real routes. Both name a cover.
async function story(staff: Staff) {
  const created = await (await env.call(staff.groups, { method: 'POST', headers: staff.owner.headers, body: {} })).json() as { id: string }
  const slugs = { en: slug(), de: slug() }
  const covers = { en: await image(staff.storeId), de: await image(staff.storeId) }
  for (const language of ['en', 'de'] as const) {
    const made = await env.call(`${staff.groups}/${created.id}/versions`, { method: 'POST', headers: staff.owner.headers, body: { language, slug: slugs[language], draft: doc(covers[language]) } })
    expect(made.status).toBe(201)
  }
  const published = await env.call(`${staff.groups}/${created.id}/versions/de/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })
  expect(published.status).toBe(200)
  return { id: created.id, slugs, covers, path: `${staff.groups}/${created.id}` }
}

async function place(store: string, mainStory: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id, main_story_group_id) values ($1, $2) returning id', [store, mainStory])
  return rows[0]!.id
}

async function related(store: string, group: string, target: string, position = 1) {
  await pool.query('insert into content.story_related (group_id, store_id, position, related_group_id) values ($1, $2, $3, $4)', [group, store, position, target])
}

const rows = (table: string, column: string, id: string) => count(pool, `select count(*) from content.${table} where ${column} = $1`, [id])

describe('[E4.3][AC30] AC-1 Delete story removes the whole story and keeps what it pointed at', () => {
  it('[E4.3][AC30] both versions, the links and the media references are gone; places, keepsakes, categories and files stay; the German page is no longer served', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)
    const places = [await place(staff.storeId), await place(staff.storeId)]
    await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $4, 1), ($1, $3, $4, 2)', [s.id, places[0], places[1], staff.storeId])
    const productId = randomUUID()
    await pool.query('insert into content.story_keepsake_links (group_id, store_id, position, product_id) values ($1, $2, 1, $3)', [s.id, staff.storeId, productId])
    const category = (await pool.query<{ id: string }>(`insert into content.blog_categories (store_id, name, slug) values ($1, '{"en":"Walks","de":"Wanderungen"}', $2) returning id`, [staff.storeId, slug()])).rows[0]!.id
    await pool.query('insert into content.story_categories (group_id, category_id, store_id) values ($1, $2, $3)', [s.id, category, staff.storeId])
    expect(await rows('media_refs', 'owner_id', s.id)).toBeGreaterThanOrEqual(2)
    expect((await env.call(`/api/public/stories/${s.slugs.de}?lang=de`)).status).toBe(200)

    const removed = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers })

    expect(removed.status).toBe(200)
    expect(await removed.json()).toEqual({ pinsUnlinked: 0, storiesUnlinked: 0 })
    for (const table of ['story_groups', 'story_versions', 'story_group_places', 'story_keepsake_links', 'story_categories', 'story_related', 'media_refs'])
      expect(await rows(table, table === 'story_groups' ? 'id' : table === 'media_refs' ? 'owner_id' : 'group_id', s.id), table).toBe(0)
    expect(await count(pool, 'select count(*) from content.places where id = any($1::uuid[])', [places])).toBe(2)
    expect(await rows('blog_categories', 'id', category)).toBe(1)
    expect(await count(pool, 'select count(*) from content.media where id = any($1::uuid[])', [Object.values(s.covers)])).toBe(2)
    expect((await env.call(`/api/public/stories/${s.slugs.de}?lang=de`)).status).toBe(404)
  })
})

describe('[E4.3][AC30] AC-2 pins and related stories are unlinked in the same transaction', () => {
  async function linked(staff: Staff) {
    const s = await story(staff)
    const pins = [await place(staff.storeId, s.id), await place(staff.storeId, s.id)]
    const others = [await story(staff), await story(staff), await story(staff)]
    for (const other of others)
      await related(staff.storeId, other.id, s.id)
    const bystanderPin = await place(staff.storeId, others[0]!.id)
    return { s, pins, others, bystanderPin }
  }

  it('[E4.3][AC30] the link read counts 2 pins and 3 stories, the delete reports the same and leaves the pins and the other stories standing', async () => {
    const staff = await env.storeWithStaff()
    const { s, pins, others, bystanderPin } = await linked(staff)

    const before = await env.call(`${s.path}/links`, { headers: staff.owner.headers })
    expect(before.status).toBe(200)
    expect(await before.json()).toEqual({ pins: 2, stories: 3 })

    const removed = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers })

    expect(removed.status).toBe(200)
    expect(await removed.json()).toEqual({ pinsUnlinked: 2, storiesUnlinked: 3 })
    const pinRows = await pool.query<{ main_story_group_id: string | null, row_version: number }>('select main_story_group_id, row_version from content.places where id = any($1::uuid[])', [pins])
    expect(pinRows.rows).toEqual([{ main_story_group_id: null, row_version: 2 }, { main_story_group_id: null, row_version: 2 }])
    expect(await rows('story_related', 'related_group_id', s.id)).toBe(0)
    expect(await count(pool, 'select count(*) from content.story_groups where id = any($1::uuid[])', [others.map(o => o.id)])).toBe(3)
    expect(await count(pool, 'select count(*) from content.story_groups where id = any($1::uuid[]) and row_version = 2', [others.map(o => o.id)])).toBe(3)
    expect((await pool.query<{ main_story_group_id: string }>('select main_story_group_id from content.places where id = $1', [bystanderPin])).rows[0]?.main_story_group_id).toBe(others[0]!.id)
    expect((await env.call(`${s.path}/links`, { headers: staff.owner.headers })).status).toBe(404)
  })

  it('[E4.3][AC30] a delete that fails after the pins were cleared changes nothing', async () => {
    const staff = await env.storeWithStaff()
    const { s, pins, others } = await linked(staff)
    const actor: Actor = { kind: 'staff', userId: staff.owner.userId, guestId: randomUUID(), stores: new Map([[staff.storeId, 'owner']]) }
    const stories = createStoryRepository()
    const failing = makeDeleteStoryGroup({
      uow: createUnitOfWork(db),
      stories: { ...stories, removeVersions: async () => { throw new Error('forced failure') } },
      media: createMediaRepository(),
      pins: createPinRepository(),
      audit: createAuditLog(systemClock),
      clock: systemClock,
    })

    await expect(failing(actor, staff.storeId, s.id, null)).rejects.toThrow('forced failure')

    const pinRows = await pool.query<{ main_story_group_id: string | null, row_version: number }>('select main_story_group_id, row_version from content.places where id = any($1::uuid[])', [pins])
    expect(pinRows.rows).toEqual([{ main_story_group_id: s.id, row_version: 1 }, { main_story_group_id: s.id, row_version: 1 }])
    expect(await rows('story_related', 'related_group_id', s.id)).toBe(3)
    expect(await count(pool, 'select count(*) from content.story_groups where id = any($1::uuid[]) and row_version = 1', [others.map(o => o.id)])).toBe(3)
    expect(await rows('story_versions', 'group_id', s.id)).toBe(2)
    expect(await rows('story_groups', 'id', s.id)).toBe(1)
  })
})

describe('[E4.3][AC30] AC-3 whose story and who may', () => {
  it('[E4.3][AC30] a member of store A deleting a story of store B gets 404 and the story is unchanged', async () => {
    const a = await env.storeWithStaff()
    const b = await env.storeWithStaff()
    const s = await story(b)

    const removed = await env.call(`${a.groups}/${s.id}`, { method: 'DELETE', headers: a.owner.headers })
    const read = await env.call(`${a.groups}/${s.id}/links`, { headers: a.owner.headers })

    expect(removed.status).toBe(404)
    expect(read.status).toBe(404)
    expect(await rows('story_versions', 'group_id', s.id)).toBe(2)
    expect(await rows('story_groups', 'id', s.id)).toBe(1)
  })

  it('[E4.3][AC30] a signed-in user with no membership in the store gets 403, and so does the path of another store, and nothing is deleted', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)
    const stranger = await env.signIn()

    const removed = await env.call(s.path, { method: 'DELETE', headers: stranger.headers })
    const read = await env.call(`${s.path}/links`, { headers: stranger.headers })

    expect(removed.status).toBe(403)
    expect(read.status).toBe(403)
    expect(await rows('story_versions', 'group_id', s.id)).toBe(2)
  })
})

describe('[E4.3][AC30] AC-4 idempotency', () => {
  it('[E4.3][AC30] the same Idempotency-Key replays the answer with Idempotent-Replayed and deletes nothing else', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)
    const bystander = await story(staff)
    const key = `delete-${randomUUID()}`

    const first = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers, key })
    const again = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers, key })

    expect(first.status).toBe(200)
    expect(first.headers.get('Idempotent-Replayed')).toBeNull()
    expect(again.status).toBe(200)
    expect(again.headers.get('Idempotent-Replayed')).toBe('true')
    expect(await again.json()).toEqual({ pinsUnlinked: 0, storiesUnlinked: 0 })
    expect(await rows('story_groups', 'id', bystander.id)).toBe(1)
    expect(await rows('story_versions', 'group_id', bystander.id)).toBe(2)
  })

  it('[E4.3][AC30] a delete with no Idempotency-Key is 400 idempotency-key-required and the story stays', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)

    const response = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers, key: null })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ type: 'idempotency-key-required' })
    expect(await rows('story_groups', 'id', s.id)).toBe(1)
  })

  it('[E4.3][AC30] a story that is already gone, deleted again with a new key, is 404', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)
    expect((await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers })).status).toBe(200)

    const again = await env.call(s.path, { method: 'DELETE', headers: staff.owner.headers })

    expect(again.status).toBe(404)
    expect(await again.json()).toMatchObject({ type: 'not-found' })
  })
})

describe('[E4.3][AC30] the single-version rule is unchanged', () => {
  it('[E4.3][AC30] deleting only the published German version still answers 409 published-cannot-be-deleted, and the draft English one goes', async () => {
    const staff = await env.storeWithStaff()
    const s = await story(staff)

    const refused = await env.call(`${s.path}/versions/de`, { method: 'DELETE', headers: { ...staff.owner.headers, 'If-Match': '2' } })
    const draft = await env.call(`${s.path}/versions/en`, { method: 'DELETE', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'published-cannot-be-deleted' })
    expect(draft.status).toBe(204)
    expect(await rows('story_versions', 'group_id', s.id)).toBe(1)
  })
})
