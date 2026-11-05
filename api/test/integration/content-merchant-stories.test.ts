import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { StoryListPage, StoryListQuery } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { emptyStoryBody } from '@sk/domain/content'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { createStoryRepository } from '../../src/modules/content/adapters/story-repository.ts'
import { makeCreateStoryGroup } from '../../src/modules/content/application/create-story-group.ts'
import { makeCreateStoryVersion } from '../../src/modules/content/application/create-story-version.ts'
import { makePublishStoryVersion } from '../../src/modules/content/application/publish-story-version.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// ADR-033 slice 4: the SQL of the stories table, against the scratch database (CI runs it; the slice's author could not).
// Every test makes its own store, so the counts are exact.

function setup() {
  const store = randomUUID()
  const actor: Actor = { kind: 'staff', userId: randomUUID(), guestId: randomUUID(), stores: new Map([[store, 'owner']]) }
  const clock = createManualClock(new Date('2026-10-27T10:00:00Z'))
  const uow = createUnitOfWork(db)
  const stories = createStoryRepository()
  const deps = { uow, stories, media: createMediaRepository(), pins: createPinRepository(), audit: createAuditLog(clock), clock }
  return { store, actor, uow, stories, createGroup: makeCreateStoryGroup(deps), createVersion: makeCreateStoryVersion(deps), publish: makePublishStoryVersion(deps) }
}

type Setup = ReturnType<typeof setup>

const query = (over: Partial<StoryListQuery> = {}): StoryListQuery => ({ status: 'all', sort: 'updated', page: 1, pageSize: 100, ...over })
const read = (s: Setup, over: Partial<StoryListQuery> = {}): Promise<StoryListPage> => s.uow.run(tx => s.stories.listGroups(tx, s.store, query(over)))
const ids = (page: StoryListPage) => page.rows.map(row => row.groupId)
const doc = (title: string): StoryDraft => ({ title, excerpt: 'An excerpt.', authorName: '', coverMediaId: null, body: emptyStoryBody })

async function media(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), 'ready') returning id`,
    [store, `${store}/${randomUUID()}`],
  )
  return rows[0]!.id
}

interface Made { en?: string, de?: string, live?: ('en' | 'de')[] }

async function story(s: Setup, made: Made): Promise<string> {
  const group = await s.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: null }, null)
  if (!group.ok)
    throw new Error(`group failed: ${group.reason}`)
  for (const language of ['en', 'de'] as const) {
    const title = made[language]
    if (title === undefined)
      continue
    const created = await s.createVersion(s.actor, s.store, group.value.id, language, { slug: `s-${randomUUID().slice(0, 8)}`, draft: { ...doc(title), coverMediaId: await media(s.store) } }, null)
    if (!created.ok)
      throw new Error(`version failed: ${created.reason}`)
    if (made.live?.includes(language)) {
      const published = await s.publish(s.actor, s.store, group.value.id, language, created.value.rowVersion, null)
      if (!published.ok)
        throw new Error(`publish failed: ${published.reason}`)
    }
  }
  return group.value.id
}

const touch = (id: string, at: string) => pool.query(`update content.story_versions set updated_at = $2 where group_id = $1`, [id, at])
const created = (id: string, at: string) => pool.query(`update content.story_groups set created_at = $2 where id = $1`, [id, at])

describe('[ADR-033] the stories table on the real database', () => {
  it('pages groups, not version rows: a group with two versions is one row, and every group appears once across pages with equal sort keys', async () => {
    const s = setup()
    const made = await Promise.all(Array.from({ length: 5 }, (_, index) => story(s, { en: `Story ${index}`, de: `Geschichte ${index}` })))
    await Promise.all(made.map(id => touch(id, '2026-10-27 09:00:00.123456+00')))
    await Promise.all(made.map(id => created(id, '2026-10-27 08:00:00.5+00')))

    for (const sort of ['updated', 'created'] as const) {
      const full = await read(s, { sort })
      const walked: string[] = []
      for (const page of [1, 2, 3]) {
        const part = await read(s, { sort, page, pageSize: 2 })
        walked.push(...ids(part))
        expect(part.total).toBe(5)
      }

      expect(ids(full)).toHaveLength(5)
      expect(walked).toEqual(ids(full))
      // The last key is the id, descending.
      expect(ids(full)).toEqual([...made].sort().reverse())
    }
  })

  it('orders by the latest version update (updated) or by creation (created), newest first', async () => {
    const s = setup()
    const old = await story(s, { en: 'Old' })
    const fresh = await story(s, { en: 'Fresh' })
    await created(old, '2026-10-01 00:00:00+00')
    await created(fresh, '2026-10-02 00:00:00+00')
    await touch(old, '2026-10-20 00:00:00+00')
    await touch(fresh, '2026-10-10 00:00:00+00')

    expect(ids(await read(s, { sort: 'updated' }))).toEqual([old, fresh])
    expect(ids(await read(s, { sort: 'created' }))).toEqual([fresh, old])
  })

  it('a group with no version is not listed or counted, and a page past the end has no rows and the real total', async () => {
    const s = setup()
    await s.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: null }, null)
    const one = await story(s, { en: 'Only one' })

    const all = await read(s)
    const past = await read(s, { page: 9, pageSize: 10 })

    expect(ids(all)).toEqual([one])
    expect(all.tabs).toEqual({ all: 1, published: 0, drafts: 1 })
    expect(past.rows).toEqual([])
    expect(past.total).toBe(1)
  })

  it('the tabs: published is any live language, drafts is none; the counts follow the search and not the tab', async () => {
    const s = setup()
    const live = await story(s, { en: 'Live wall', live: ['en'] })
    const half = await story(s, { en: 'Wall half', de: 'Mauer halb', live: ['de'] })
    const draft = await story(s, { en: 'Wall draft' })
    const other = await story(s, { en: 'Bridge' })

    const published = await read(s, { status: 'published' })
    const drafts = await read(s, { status: 'drafts' })
    const searched = await read(s, { status: 'drafts', q: 'wall' })

    expect(ids(published).sort()).toEqual([live, half].sort())
    expect(ids(drafts).sort()).toEqual([draft, other].sort())
    expect(published.tabs).toEqual({ all: 4, published: 2, drafts: 2 })
    expect(ids(searched)).toEqual([draft])
    expect(searched.total).toBe(1)
    // The search narrows the counts, the tab does not.
    expect(searched.tabs).toEqual({ all: 3, published: 2, drafts: 1 })
    expect(other).toBeTruthy()
  })

  it('the search matches a title of either language in any case, and % and _ are plain characters', async () => {
    const s = setup()
    const german = await story(s, { de: 'Löwendenkmal' })
    await story(s, { en: '100% sure' })

    expect(ids(await read(s, { q: 'LÖWEN' }))).toEqual([german])
    expect((await read(s, { q: '%' })).total).toBe(1)
    expect((await read(s, { q: '_' })).total).toBe(0)
  })

  it('looks groups up by id, only of this store and only with a version, in the order given', async () => {
    const s = setup()
    const other = setup()
    const a = await story(s, { en: 'A' })
    const b = await story(s, { en: 'B' })
    const empty = await s.createGroup(s.actor, s.store, { kind: 'story', subjectPlaceId: null }, null)
    const foreign = await story(other, { en: 'Foreign' })

    const rows = await s.uow.run(tx => s.stories.listGroupsByIds(tx, s.store, [b, a, foreign, empty.ok ? empty.value.id : '']))

    expect(rows.map(row => row.groupId)).toEqual([b, a])
  })
})
