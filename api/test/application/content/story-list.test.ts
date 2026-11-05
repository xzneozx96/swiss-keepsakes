import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, StoryListQuery } from '../../../src/modules/content/ports.ts'
import { emptyStoryBody } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeGetStoryGroup } from '../../../src/modules/content/application/get-story-group.ts'
import { makeListStoryGroups, makeListStoryGroupsByIds } from '../../../src/modules/content/application/list-story-groups.ts'
import { createFakeMedia, mediaDefaults } from '../../support/fake-media.ts'
import { createFakeStories } from '../../support/fake-stories.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const manager: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[store, 'manager']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }
const t0 = new Date('2026-10-27T10:00:00Z')
const t1 = new Date('2026-10-27T11:00:00Z')
const t2 = new Date('2026-10-27T12:00:00Z')

const file = (id: string, over: Partial<MediaRecord> = {}): MediaRecord => ({ ...mediaDefaults, id, storeId: store, kind: 'image', storageKey: `${id}.jpg`, contentType: 'image/jpeg', byteSize: 1, sha256: 'a'.repeat(64), width: 1200, height: 800, status: 'ready', ...over })
const coverEn = file('00000000-0000-4000-8000-0000000000c1')
const coverDe = file('00000000-0000-4000-8000-0000000000c2')
const processing = file('00000000-0000-4000-8000-0000000000c3', { status: 'processing' })
const retired = file('00000000-0000-4000-8000-0000000000c4', { status: 'retired' })

const query = (over: Partial<StoryListQuery> = {}): StoryListQuery => ({ status: 'all', sort: 'updated', page: 1, pageSize: 20, ...over })
const doc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A title', excerpt: '', authorName: '', coverMediaId: null, body: emptyStoryBody, ...over })

async function setup() {
  const stories = createFakeStories()
  const media = createFakeMedia([coverEn, coverDe, processing, retired])
  const uow = { run: <R>(work: (tx: null) => Promise<R>) => work(null) }
  const list = makeListStoryGroups({ uow, stories, media })
  const read = makeGetStoryGroup({ uow, stories })
  const byIds = makeListStoryGroupsByIds({ uow, stories, media })
  const group = (at = t0, storeId = store) => stories.insertGroup(null, storeId, { kind: 'story', subjectPlaceId: null }, at)
  return { stories, list, byIds, read, group }
}

describe('[E4.3][AC30] story list use case', () => {
  it('[E4.3][AC30] AC-1 reads each language version\'s state, the title and the ready cover', async () => {
    const { stories, list, group } = await setup()
    const g = await group()
    await stories.insertVersion(null, store, g.id, 'en', { draft: doc({ title: 'The wall', coverMediaId: coverEn.id }) }, t0)
    const de = await stories.insertVersion(null, store, g.id, 'de', { draft: doc({ title: 'Die Mauer', coverMediaId: coverDe.id }) }, t1)

    const result = await list(owner, store, query())

    expect(result.ok).toBe(true)
    const [entry] = result.ok ? result.value.entries : []
    expect(entry).toMatchObject({ groupId: g.id, kind: 'story', title: { en: 'The wall', de: 'Die Mauer' }, cover: coverEn, updatedAt: t1 })
    expect(entry?.languages.en).toMatchObject({ status: 'draft', everPublished: false, editsNotLive: false, rowVersion: 1, title: 'The wall' })
    expect(entry?.languages.de?.rowVersion).toBe(de?.rowVersion)
  })

  it('[E4.3][AC30] a German-only story has null for English and takes the German title', async () => {
    const { stories, list, group } = await setup()
    const g = await group()
    await stories.insertVersion(null, store, g.id, 'de', { draft: doc({ title: 'Nur Deutsch' }) }, t0)

    const result = await list(owner, store, query())

    const [entry] = result.ok ? result.value.entries : []
    expect(entry?.languages.en).toBeNull()
    expect(entry?.languages.de).not.toBeNull()
    expect(entry?.title).toEqual({ de: 'Nur Deutsch' })
  })

  it('[E4.3][AC30] an empty English title falls back to the German one, and both empty gives an empty title map', async () => {
    const { stories, list, group } = await setup()
    const a = await group(t1)
    await stories.insertVersion(null, store, a.id, 'en', { draft: doc({ title: '   ' }) }, t1)
    await stories.insertVersion(null, store, a.id, 'de', { draft: doc({ title: 'Mit Titel' }) }, t1)
    const b = await group(t0)
    await stories.insertVersion(null, store, b.id, 'en', { draft: doc({ title: '' }) }, t0)

    const result = await list(owner, store, query())

    const entries = result.ok ? result.value.entries : []
    expect(entries.find(e => e.groupId === a.id)?.title).toEqual({ de: 'Mit Titel' })
    expect(entries.find(e => e.groupId === b.id)?.title).toEqual({})
  })

  it('[E4.3][AC30] a published version with a draft on top is editsNotLive, and an unpublished one keeps everPublished', async () => {
    const { stories, list, group } = await setup()
    const g = await group()
    const en = await stories.insertVersion(null, store, g.id, 'en', { draft: doc({ title: 'Live' }) }, t0)
    const published = await stories.publishVersion(null, en!, t0)
    await stories.saveVersion(null, published, { draft: doc({ title: 'Edited' }) }, t1)
    const de = await stories.insertVersion(null, store, g.id, 'de', { draft: doc({ title: 'Einst' }) }, t0)
    const dePub = await stories.publishVersion(null, de!, t0)
    await stories.unpublishVersion(null, dePub, t1)

    const result = await list(owner, store, query())

    const [entry] = result.ok ? result.value.entries : []
    expect(entry?.languages.en).toMatchObject({ status: 'published', everPublished: true, editsNotLive: true })
    expect(entry?.title.en).toBe('Edited')
    expect(entry?.languages.de).toMatchObject({ status: 'draft', everPublished: true, editsNotLive: false })
    expect(entry?.title.de).toBe('Einst')
  })

  it('[E4.3][AC30] a group with no version is not listed', async () => {
    const { list, group } = await setup()
    await group()

    expect(await list(owner, store, query())).toMatchObject({ ok: true, value: { entries: [], total: 0, tabs: { all: 0, published: 0, drafts: 0 } } })
  })

  it('[E4.3][AC30] a cover that is processing or retired reads null', async () => {
    const { stories, list, group } = await setup()
    const a = await group()
    await stories.insertVersion(null, store, a.id, 'en', { draft: doc({ coverMediaId: processing.id }) }, t0)
    const b = await group()
    await stories.insertVersion(null, store, b.id, 'en', { draft: doc({ coverMediaId: retired.id }) }, t0)
    const c = await group()
    await stories.insertVersion(null, store, c.id, 'en', { draft: doc({ coverMediaId: processing.id }) }, t0)
    await stories.insertVersion(null, store, c.id, 'de', { draft: doc({ coverMediaId: coverDe.id }) }, t0)

    const result = await list(owner, store, query())

    const entries = result.ok ? result.value.entries : []
    expect(entries.find(e => e.groupId === a.id)?.cover).toBeNull()
    expect(entries.find(e => e.groupId === b.id)?.cover).toBeNull()
    expect(entries.find(e => e.groupId === c.id)?.cover).toEqual(coverDe)
  })

  it('[E4.3][AC30] the list is newest update first and holds the groups of this store only', async () => {
    const { stories, list, group } = await setup()
    const old = await group(t0)
    await stories.insertVersion(null, store, old.id, 'en', { draft: doc() }, t0)
    const fresh = await group(t0)
    await stories.insertVersion(null, store, fresh.id, 'en', { draft: doc() }, t2)
    const other = await group(t2, 'store-2')
    await stories.insertVersion(null, 'store-2', other.id, 'en', { draft: doc() }, t2)

    const result = await list(owner, store, query())

    expect(result.ok && result.value.entries.map(e => e.groupId)).toEqual([fresh.id, old.id])
  })

  it('[E4.3][AC30] an owner and a manager read the list, a manager of another store and a guest are forbidden', async () => {
    const { list } = await setup()

    expect((await list(owner, store, query())).ok).toBe(true)
    expect((await list(manager, store, query())).ok).toBe(true)
    expect(await list(outsider, store, query())).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await list(guest, store, query())).toMatchObject({ ok: false, reason: 'forbidden' })
  })
})

describe('[E4.3][AC30] story group read', () => {
  it('[E4.3][AC30] reads the group with both versions, null for a missing language', async () => {
    const { stories, read, group } = await setup()
    const g = await group()
    const en = await stories.insertVersion(null, store, g.id, 'en', { draft: doc() }, t0)

    const result = await read(owner, store, g.id)

    expect(result).toEqual({ ok: true, value: { group: g, versions: { en, de: null } } })
  })

  it('[E4.3][AC30] a group of another store is not-found', async () => {
    const { read, group } = await setup()
    const other = await group(t0, 'store-2')

    expect(await read(owner, store, other.id)).toMatchObject({ ok: false, reason: 'not-found' })
    expect(await read(owner, store, '00000000-0000-4000-8000-000000000999')).toMatchObject({ ok: false, reason: 'not-found' })
  })

  it('[E4.3][AC30] forbidden for a guest', async () => {
    const { read, group } = await setup()
    const g = await group()

    expect(await read(guest, store, g.id)).toMatchObject({ ok: false, reason: 'forbidden' })
  })
})

describe('[ADR-033] story list pages', () => {
  // Ten stories: s0 is the oldest. The odd ones are published in English; "Wall" is in the titles of s2 and s3 (s3 in German only).
  async function ten() {
    const { stories, list, group } = await setup()
    const ids: string[] = []
    for (let i = 0; i < 10; i += 1) {
      const at = new Date(t0.getTime() + i * 60_000)
      const g = await group(at)
      const title = i === 2 ? 'The Wall' : i === 3 ? 'Die wall' : `Story ${i}`
      const en = await stories.insertVersion(null, store, g.id, i === 3 ? 'de' : 'en', { draft: doc({ title }) }, at)
      if (i % 2 === 1)
        await stories.publishVersion(null, en!, at)
      ids.push(g.id)
    }
    return { list, ids, stories, group }
  }

  it('answers one page with the total, the page and the page size, newest created first by default', async () => {
    const { list, ids } = await ten()

    const result = await list(owner, store, query({ sort: 'created', page: 2, pageSize: 4 }))

    expect(result.ok && result.value).toMatchObject({ total: 10, page: 2, pageSize: 4 })
    expect(result.ok && result.value.entries.map(e => e.groupId)).toEqual([ids[5], ids[4], ids[3], ids[2]])
  })

  it('a page past the end has no entries and the real total and counts', async () => {
    const { list } = await ten()

    const result = await list(owner, store, query({ page: 9, pageSize: 10 }))

    expect(result.ok && result.value).toMatchObject({ entries: [], total: 10, tabs: { all: 10, published: 5, drafts: 5 } })
  })

  it('the status tab narrows the page and the total, while the counts keep every tab', async () => {
    const { list, ids } = await ten()

    const result = await list(owner, store, query({ status: 'published', sort: 'created' }))

    expect(result.ok && result.value.entries.map(e => e.groupId)).toEqual([ids[9], ids[7], ids[5], ids[3], ids[1]])
    expect(result.ok && result.value).toMatchObject({ total: 5, tabs: { all: 10, published: 5, drafts: 5 } })
  })

  it('the search matches a title of either language in any case and the tab counts follow it', async () => {
    const { list, ids } = await ten()

    const result = await list(owner, store, query({ q: 'WALL', sort: 'created' }))

    expect(result.ok && result.value.entries.map(e => e.groupId)).toEqual([ids[3], ids[2]])
    expect(result.ok && result.value).toMatchObject({ total: 2, tabs: { all: 2, published: 1, drafts: 1 } })
  })

  it('a % or _ in the search is a plain character', async () => {
    const { list } = await ten()

    const result = await list(owner, store, query({ q: '%' }))

    expect(result.ok && result.value.total).toBe(0)
  })

  it('every sort ends in the id, so equal keys never repeat a row across pages', async () => {
    const { stories, list, group } = await setup()
    const made = []
    for (let i = 0; i < 5; i += 1) {
      const g = await group(t0)
      await stories.insertVersion(null, store, g.id, 'en', { draft: doc() }, t0)
      made.push(g.id)
    }

    for (const sort of ['created', 'updated'] as const) {
      const first = await list(owner, store, query({ sort, page: 1, pageSize: 3 }))
      const second = await list(owner, store, query({ sort, page: 2, pageSize: 3 }))
      const seen = [...(first.ok ? first.value.entries : []), ...(second.ok ? second.value.entries : [])].map(e => e.groupId)

      expect([...seen].sort()).toEqual([...made].sort())
      expect(seen).toEqual([...seen].sort().reverse())
    }
  })
})

describe('[ADR-033] story lookup by ids', () => {
  it('reads the stories named, of this store, with the same entry as the list; a group with no version and an unknown id are left out', async () => {
    const { stories, byIds, group } = await setup()
    const a = await group(t0)
    await stories.insertVersion(null, store, a.id, 'en', { draft: doc({ title: 'The wall', coverMediaId: coverEn.id }) }, t0)
    const b = await group(t0)
    await stories.insertVersion(null, store, b.id, 'en', { draft: doc({ title: 'Other' }) }, t0)
    const empty = await group(t0)
    const foreign = await group(t0, 'store-2')
    await stories.insertVersion(null, 'store-2', foreign.id, 'en', { draft: doc() }, t0)

    const result = await byIds(owner, store, [a.id, empty.id, foreign.id, 'nope'])

    expect(result.ok && result.value.map(e => e.groupId)).toEqual([a.id])
    expect(result.ok && result.value[0]).toMatchObject({ title: { en: 'The wall' }, cover: coverEn })
    expect(await byIds(guest, store, [a.id])).toMatchObject({ ok: false, reason: 'forbidden' })
  })
})
