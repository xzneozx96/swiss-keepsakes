import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { PinListPage, PinListQuery } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { emptyStoryBody } from '@sk/domain/content'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createMediaRepository } from '../../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../../src/modules/content/adapters/pin-repository.ts'
import { makeCreatePin } from '../../src/modules/content/application/create-pin.ts'
import { makeHidePin } from '../../src/modules/content/application/hide-pin.ts'
import { makePublishPin } from '../../src/modules/content/application/publish-pin.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

// ADR-033 slice 4: the SQL of the pins table, against the scratch database (CI runs it; the slice's author could not).
// Every test makes its own store, so the counts are exact.

// 10:00 UTC on 27.10.2026 is 11:00 in Zurich (CET, summer time ended on the 25th).
const NOW = new Date('2026-10-27T10:00:00Z')

function setup() {
  const store = randomUUID()
  const actor: Actor = { kind: 'staff', userId: randomUUID(), guestId: randomUUID(), stores: new Map([[store, 'owner']]) }
  const clock = createManualClock(NOW)
  const uow = createUnitOfWork(db)
  const pins = createPinRepository()
  const deps = { uow, pins, media: createMediaRepository(), audit: createAuditLog(clock), clock }
  return { store, actor, uow, pins, create: makeCreatePin(deps), publish: makePublishPin(deps), hide: makeHidePin(deps) }
}

type Setup = ReturnType<typeof setup>

const query = (over: Partial<PinListQuery> = {}): PinListQuery => ({ status: [], category: [], stay: [], type: [], sort: 'edited', page: 1, pageSize: 100, ...over })
const read = (s: Setup, over: Partial<PinListQuery> = {}, now = NOW): Promise<PinListPage> => s.uow.run(tx => s.pins.list(tx, s.store, query(over), now))
const ids = (page: PinListPage) => page.rows.map(row => row.id)

async function category(store: string, name: string, parentId: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.map_categories (store_id, name, slug, parent_id) values ($1, $2::jsonb, $3, $4) returning id`,
    [store, JSON.stringify({ en: name }), `${name.toLowerCase()}-${randomUUID().slice(0, 8)}`, parentId],
  )
  return rows[0]!.id
}

interface Made { title?: { en?: string, de?: string }, stayTag?: 'short_stay' | 'multi_day' | 'both', categoryIds?: string[], dates?: { firstDay: string, lastDay: string, startTime: string | null, endTime: string | null }[], link?: string }

async function pin(s: Setup, made: Made = {}) {
  const result = await s.create(s.actor, s.store, { title: made.title ?? { en: `Pin ${randomUUID().slice(0, 6)}` }, latitude: 47.05, longitude: 8.3, stayTag: made.stayTag ?? 'both', categoryIds: made.categoryIds ?? [], dates: made.dates ?? [], ...(made.link ? { outboundUrl: made.link } : {}) }, null)
  if (!result.ok)
    throw new Error(`create failed: ${result.reason}`)
  return result.value
}

async function live(s: Setup, made: Made = {}) {
  const created = await pin(s, made)
  const published = await s.publish(s.actor, s.store, created.id, created.rowVersion, null)
  if (!published.ok)
    throw new Error(`publish failed: ${published.reason}`)
  return published.value
}

const setUpdated = (id: string, at: string) => pool.query('update content.places set updated_at = $2 where id = $1', [id, at])

describe('[ADR-033] the pins table on the real database', () => {
  it('walks every page with equal sort keys, microseconds apart, and meets each pin exactly once, like a full read', async () => {
    const s = setup()
    const made = []
    for (let index = 0; index < 7; index += 1)
      made.push(await pin(s))
    // Three share a timestamp to the microsecond; the others differ by less than a millisecond.
    await Promise.all(made.map((row, index) => setUpdated(row.id, index < 3 ? '2026-10-27 09:00:00.123456+00' : `2026-10-27 09:00:00.1234${index}0+00`)))

    const full = await read(s)
    const walked: string[] = []
    for (const page of [1, 2, 3, 4]) {
      const part = await read(s, { page, pageSize: 2 })
      walked.push(...ids(part))
      expect(part.total).toBe(7)
    }

    expect(ids(full)).toHaveLength(7)
    expect(walked).toEqual(ids(full))
    expect(new Set(walked).size).toBe(7)
  })

  it('a page past the end has no rows and the real total and counts', async () => {
    const s = setup()
    await pin(s)
    await pin(s)

    const past = await read(s, { page: 9, pageSize: 10 })

    expect(past.rows).toEqual([])
    expect(past.total).toBe(2)
    expect(past.statuses.draft).toBe(2)
  })

  it('the status filter works on the derived status: ended follows the injected clock in Europe/Zurich, to the minute', async () => {
    const s = setup()
    const date = (lastDay: string, endTime: string | null) => [{ firstDay: lastDay, lastDay, startTime: null, endTime }]
    const running = await live(s, { dates: date('2026-10-27', '11:01') })
    const justEnded = await live(s, { dates: date('2026-10-27', '11:00') })
    const yesterday = await live(s, { dates: date('2026-10-26', null) })
    const today = await live(s, { dates: date('2026-10-27', null) })
    const place = await live(s)
    const draft = await pin(s, { dates: date('2026-10-01', null) })
    const hidden = await live(s, { dates: date('2026-10-01', null) })
    await s.hide(s.actor, s.store, hidden.id, hidden.rowVersion, null)

    const ended = await read(s, { status: ['ended'] })
    const published = await read(s, { status: ['published'] })
    const later = await read(s, { status: ['ended'] }, new Date('2026-10-27T23:00:00Z'))

    expect(ids(ended).sort()).toEqual([justEnded.id, yesterday.id].sort())
    expect(ids(published).sort()).toEqual([running.id, today.id, place.id].sort())
    // 23:00 UTC is midnight in Zurich: the pins with no end time are over as well.
    expect(ids(later)).toContain(today.id)
    expect(ids(await read(s, { status: ['draft', 'hidden'] })).sort()).toEqual([draft.id, hidden.id].sort())
    expect(ended.statuses).toEqual({ draft: 1, published: 3, hidden: 1, ended: 2 })
  })

  it('stay, type and category filters narrow together; a group is an OR; none matches a pin with no category', async () => {
    const s = setup()
    const walks = await category(s.store, 'Walks')
    const lakes = await category(s.store, 'Lakes', walks)
    const a = await pin(s, { stayTag: 'short_stay', categoryIds: [walks] })
    const b = await pin(s, { stayTag: 'multi_day', categoryIds: [lakes], dates: [{ firstDay: '2026-12-01', lastDay: '2026-12-02', startTime: null, endTime: null }] })
    const c = await pin(s, { stayTag: 'both' })

    expect(ids(await read(s, { stay: ['short_stay'] }))).toEqual([a.id])
    expect(ids(await read(s, { type: ['event'] }))).toEqual([b.id])
    expect(ids(await read(s, { category: [lakes] }))).toEqual([b.id])
    expect(ids(await read(s, { category: ['none'] }))).toEqual([c.id])
    expect(ids(await read(s, { category: [walks, 'none'] })).sort()).toEqual([a.id, c.id].sort())
    expect(ids(await read(s, { stay: ['multi_day'], type: ['event'] }))).toEqual([b.id])
    expect(ids(await read(s, { stay: ['short_stay'], type: ['event'] }))).toEqual([])
  })

  it('the search is a plain-text match on either title and either slug; % and _ are plain characters', async () => {
    const s = setup()
    const wall = await live(s, { title: { en: 'Lion Wall' } })
    const german = await pin(s, { title: { de: 'Löwen Mauer' } })
    await pin(s, { title: { en: '100% sure' } })

    expect(ids(await read(s, { q: 'LION' }))).toEqual([wall.id])
    expect(ids(await read(s, { q: 'mauer' }))).toEqual([german.id])
    expect(ids(await read(s, { q: 'lion-wall' }))).toEqual([wall.id])
    expect(ids(await read(s, { q: '%' })).length).toBe(1)
    expect((await read(s, { q: '_' })).total).toBe(0)
  })

  it('every facet equals a count over the full read that ignores the group\'s own ticks, and a parent counts its children', async () => {
    const s = setup()
    const walks = await category(s.store, 'Walks')
    const lakes = await category(s.store, 'Lakes', walks)
    await pin(s, { title: { en: 'Alpha' }, stayTag: 'short_stay', categoryIds: [lakes] })
    await live(s, { title: { en: 'Alpine' }, stayTag: 'short_stay', categoryIds: [walks] })
    await live(s, { title: { en: 'Beta' }, stayTag: 'both', dates: [{ firstDay: '2026-12-01', lastDay: '2026-12-02', startTime: null, endTime: null }] })
    const filtered = await read(s, { status: ['published'], stay: ['short_stay'], q: 'alp' })
    const everything = await read(s)
    const pinsOf = (page: PinListPage) => page.rows

    // Statuses ignore the status tick: the stay and the search still apply (Alpha is a short-stay draft, Alpine a live one).
    expect(filtered.statuses).toEqual({ draft: 1, published: 1, hidden: 0, ended: 0 })
    // Stays ignore the stay tick: the live pins that match "alp" are Alpine only.
    expect(filtered.stays).toEqual({ short_stay: 1, multi_day: 0, both: 0 })
    expect(filtered.total).toBe(1)
    // Categories: Walks has Alpine and, through Lakes, Alpha. Lakes has Alpha. Nothing is uncategorised but Beta.
    expect(everything.categories).toEqual({ [walks]: 2, [lakes]: 1, none: 1 })
    expect(everything.types).toEqual({ place: 2, event: 1 })
    expect(pinsOf(everything)).toHaveLength(3)
  })

  it('looks pins up by id, only of this store, and by the host of a published pin\'s link', async () => {
    const s = setup()
    const other = setup()
    const tower = await live(s, { link: 'https://www.zyt.example/tower' })
    const draft = await pin(s, { link: 'https://zyt.example/draft' })
    const foreign = await live(other, { link: 'https://zyt.example/other' })

    const byIds = await s.uow.run(tx => s.pins.lookup(tx, s.store, { ids: [draft.id, foreign.id] }))
    const byHost = await s.uow.run(tx => s.pins.lookup(tx, s.store, { ids: [], host: 'zyt.example' }))

    expect(byIds.map(row => row.id)).toEqual([draft.id])
    expect(byHost.map(row => row.id)).toEqual([tower.id])
  })
})

describe('[ADR-033] the story picker on the real database', () => {
  const doc = (title: string): StoryDraft => ({ title, excerpt: '', authorName: '', coverMediaId: null, body: emptyStoryBody })

  async function story(store: string, title: string, status: 'draft' | 'published', languages: ('en' | 'de')[] = ['en']): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
    for (const language of languages) {
      if (status === 'draft')
        await pool.query(`insert into content.story_versions (group_id, store_id, language, status, draft) values ($1, $2, $3, 'draft', $4::jsonb)`, [rows[0]!.id, store, language, JSON.stringify(doc(title))])
      else
        await pool.query(`insert into content.story_versions (group_id, store_id, language, status, slug, published, published_at) values ($1, $2, $3, 'published', $4::jsonb, $5::jsonb, now())`, [rows[0]!.id, store, language, JSON.stringify({ [language]: `s-${randomUUID().slice(0, 8)}` }), JSON.stringify(doc(title))])
    }
    return rows[0]!.id
  }

  it('offers live stories that match the search, at most the limit, newest first, and always the chosen story', async () => {
    const s = setup()
    const other = setup()
    const wall = await story(s.store, 'The Lion Wall', 'published')
    const bridge = await story(s.store, 'The bridge', 'published')
    const draft = await story(s.store, 'Lion draft', 'draft')
    await story(other.store, 'Lion elsewhere', 'published')
    const options = (query: { q?: string, groupId?: string, limit: number }) => s.uow.run(tx => s.pins.storyOptions(tx, s.store, query)).then(rows => rows.map(row => row.groupId))

    expect(await options({ limit: 10 })).toEqual([bridge, wall])
    expect(await options({ q: 'LION', limit: 10 })).toEqual([wall])
    expect(await options({ limit: 1 })).toEqual([bridge])
    // The chosen story is added when it is not among the matches, whatever its state.
    expect(await options({ q: 'lion', groupId: draft, limit: 10 })).toEqual([draft, wall])
    expect(await options({ q: 'bridge', groupId: wall, limit: 10 })).toEqual([bridge, wall])
  })
})
