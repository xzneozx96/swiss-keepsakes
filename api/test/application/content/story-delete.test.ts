import type { Actor } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { makeDeleteStoryGroup } from '../../../src/modules/content/application/delete-story-group.ts'
import { makeGetStoryLinks } from '../../../src/modules/content/application/get-story-links.ts'
import { createFakeStories } from '../../support/fake-stories.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const manager: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[store, 'manager']]) }
const anonymous: Actor = { kind: 'anonymous' }

function setup() {
  const stories = createFakeStories()
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    stories,
    media: { find: async () => [] },
    pins: { idsInStore: async () => [] },
    audit: { record: async () => {} },
    clock: createManualClock(new Date('2026-11-03T10:00:00Z')),
  }
  return { stories, remove: makeDeleteStoryGroup(deps), links: makeGetStoryLinks(deps) }
}

type Setup = ReturnType<typeof setup>

async function story(s: Setup, over: { relatedGroupIds?: string[], storeId?: string } = {}) {
  const group = await s.stories.insertGroup(null, over.storeId ?? store, { kind: 'story', subjectPlaceId: null, relatedGroupIds: over.relatedGroupIds ?? [] }, new Date())
  for (const language of ['en', 'de'] as const)
    await s.stories.insertVersion(null, group.storeId, group.id, language, { slug: `${group.id}-${language}` }, new Date())
  return group
}

describe('[E4.3][AC30] AC-1 Delete story removes the group and both versions', () => {
  it('[E4.3][AC30] the group and both language versions are gone, the answer says 0 pins and 0 stories unlinked', async () => {
    const s = setup()
    const g = await story(s)
    const other = await story(s)

    const result = await s.remove(owner, store, g.id, null)

    expect(result).toEqual({ ok: true, value: { pinsUnlinked: 0, storiesUnlinked: 0 } })
    expect(s.stories.groups.has(g.id)).toBe(false)
    expect([...s.stories.versions.keys()].filter(key => key.startsWith(g.id))).toEqual([])
    expect(s.stories.groups.has(other.id)).toBe(true)
    expect(s.stories.versions.size).toBe(2)
  })

  it('[E4.3][AC30] a published version is deleted too (only a single published version is refused elsewhere)', async () => {
    const s = setup()
    const g = await story(s)
    const en = s.stories.versions.get(`${g.id}/en`)!
    s.stories.versions.set(`${g.id}/en`, { ...en, status: 'published', published: { title: 'T', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [] } }, publishedAt: new Date() })

    expect(await s.remove(owner, store, g.id, null)).toMatchObject({ ok: true })
    expect(s.stories.versions.size).toBe(0)
  })
})

describe('[E4.3][AC30] AC-2 pins and related stories are unlinked, and the answer counts them', () => {
  it('[E4.3][AC30] 2 pins lose their main story, 3 related rows go, the others stay, and the answer says 2 and 3', async () => {
    const s = setup()
    const g = await story(s)
    const three = await Promise.all([1, 2, 3].map(() => story(s, { relatedGroupIds: [g.id] })))
    s.stories.mainStoryOf.set('pin-1', { storeId: store, groupId: g.id })
    s.stories.mainStoryOf.set('pin-2', { storeId: store, groupId: g.id })
    s.stories.mainStoryOf.set('pin-3', { storeId: store, groupId: three[0]!.id })

    const result = await s.remove(owner, store, g.id, null)

    expect(result).toEqual({ ok: true, value: { pinsUnlinked: 2, storiesUnlinked: 3 } })
    expect(s.stories.mainStoryOf.get('pin-1')?.groupId).toBeNull()
    expect(s.stories.mainStoryOf.get('pin-2')?.groupId).toBeNull()
    expect(s.stories.mainStoryOf.get('pin-3')?.groupId).toBe(three[0]!.id)
    for (const t of three)
      expect(s.stories.groups.get(t.id)).toMatchObject({ relatedGroupIds: [], rowVersion: 2 })
  })

  it('[E4.3][AC30] the link read counts the same before the delete, and changes nothing', async () => {
    const s = setup()
    const g = await story(s)
    await story(s, { relatedGroupIds: [g.id] })
    await story(s, { relatedGroupIds: [g.id] })
    s.stories.mainStoryOf.set('pin-1', { storeId: store, groupId: g.id })

    expect(await s.links(owner, store, g.id)).toEqual({ ok: true, value: { pins: 1, stories: 2 } })
    expect(s.stories.groups.has(g.id)).toBe(true)
    expect(s.stories.mainStoryOf.get('pin-1')?.groupId).toBe(g.id)
  })

  it('[E4.3][AC30] a story nothing links to has 0 and 0', async () => {
    const s = setup()
    const g = await story(s)
    expect(await s.links(owner, store, g.id)).toEqual({ ok: true, value: { pins: 0, stories: 0 } })
  })
})

describe('[E4.3][AC30] AC-3 who may delete, and whose story', () => {
  it('[E4.3][AC30] a story of another store is not-found, and nothing changes', async () => {
    const s = setup()
    const g = await story(s, { storeId: 'store-2' })

    expect(await s.remove(owner, store, g.id, null)).toEqual({ ok: false, reason: 'not-found' })
    expect(await s.links(owner, store, g.id)).toEqual({ ok: false, reason: 'not-found' })
    expect(s.stories.groups.has(g.id)).toBe(true)
    expect(s.stories.versions.size).toBe(2)
  })

  it.each([['a member of another store', outsider], ['an anonymous caller', anonymous]])('[E4.3][AC30] %s is forbidden, and nothing is deleted or read', async (_name, actor) => {
    const s = setup()
    const g = await story(s)

    expect(await s.remove(actor, store, g.id, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.links(actor, store, g.id)).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.stories.groups.has(g.id)).toBe(true)
  })

  it('[E4.3][AC30] a manager of the store may delete (manage-content)', async () => {
    const s = setup()
    const g = await story(s)
    expect(await s.remove(manager, store, g.id, null)).toMatchObject({ ok: true })
  })

  it('[E4.3][AC30] AC-4 a story that is already gone is not-found', async () => {
    const s = setup()
    const g = await story(s)
    await s.remove(owner, store, g.id, null)
    expect(await s.remove(owner, store, g.id, null)).toEqual({ ok: false, reason: 'not-found' })
  })
})
