import type { StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { emptyStoryBody } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeGetStoryGroup } from '../../../src/modules/content/application/get-story-group.ts'
import { makeListStoryGroups } from '../../../src/modules/content/application/list-story-groups.ts'
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

const doc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A title', excerpt: '', authorName: '', coverMediaId: null, body: emptyStoryBody, ...over })

async function setup() {
  const stories = createFakeStories()
  const media = createFakeMedia([coverEn, coverDe, processing, retired])
  const uow = { run: <R>(work: (tx: null) => Promise<R>) => work(null) }
  const list = makeListStoryGroups({ uow, stories, media })
  const read = makeGetStoryGroup({ uow, stories })
  const group = (at = t0, storeId = store) => stories.insertGroup(null, storeId, { kind: 'story', subjectPlaceId: null }, at)
  return { stories, list, read, group }
}

describe('[E4.3][AC30] story list use case', () => {
  it('[E4.3][AC30] AC-1 reads each language version\'s state, the title and the ready cover', async () => {
    const { stories, list, group } = await setup()
    const g = await group()
    await stories.insertVersion(null, store, g.id, 'en', { draft: doc({ title: 'The wall', coverMediaId: coverEn.id }) }, t0)
    const de = await stories.insertVersion(null, store, g.id, 'de', { draft: doc({ title: 'Die Mauer', coverMediaId: coverDe.id }) }, t1)

    const result = await list(owner, store)

    expect(result.ok).toBe(true)
    const [entry] = result.ok ? result.value : []
    expect(entry).toMatchObject({ groupId: g.id, kind: 'story', title: { en: 'The wall', de: 'Die Mauer' }, cover: coverEn, updatedAt: t1 })
    expect(entry?.languages.en).toMatchObject({ status: 'draft', everPublished: false, editsNotLive: false, rowVersion: 1, title: 'The wall' })
    expect(entry?.languages.de?.rowVersion).toBe(de?.rowVersion)
  })

  it('[E4.3][AC30] a German-only story has null for English and takes the German title', async () => {
    const { stories, list, group } = await setup()
    const g = await group()
    await stories.insertVersion(null, store, g.id, 'de', { draft: doc({ title: 'Nur Deutsch' }) }, t0)

    const result = await list(owner, store)

    const [entry] = result.ok ? result.value : []
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

    const result = await list(owner, store)

    const entries = result.ok ? result.value : []
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

    const result = await list(owner, store)

    const [entry] = result.ok ? result.value : []
    expect(entry?.languages.en).toMatchObject({ status: 'published', everPublished: true, editsNotLive: true })
    expect(entry?.title.en).toBe('Edited')
    expect(entry?.languages.de).toMatchObject({ status: 'draft', everPublished: true, editsNotLive: false })
    expect(entry?.title.de).toBe('Einst')
  })

  it('[E4.3][AC30] a group with no version is not listed', async () => {
    const { list, group } = await setup()
    await group()

    expect(await list(owner, store)).toEqual({ ok: true, value: [] })
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

    const result = await list(owner, store)

    const entries = result.ok ? result.value : []
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

    const result = await list(owner, store)

    expect(result.ok && result.value.map(e => e.groupId)).toEqual([fresh.id, old.id])
  })

  it('[E4.3][AC30] an owner and a manager read the list, a manager of another store and a guest are forbidden', async () => {
    const { list } = await setup()

    expect((await list(owner, store)).ok).toBe(true)
    expect((await list(manager, store)).ok).toBe(true)
    expect(await list(outsider, store)).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await list(guest, store)).toMatchObject({ ok: false, reason: 'forbidden' })
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
