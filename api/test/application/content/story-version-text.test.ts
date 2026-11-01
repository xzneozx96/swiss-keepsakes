import type { StoryBody, StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord } from '../../../src/modules/content/ports.ts'
import { emptyStoryBody } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { makeGetStoryVersionText } from '../../../src/modules/content/application/get-story-version-text.ts'
import { createFakeMedia, mediaDefaults } from '../../support/fake-media.ts'
import { createFakeStories } from '../../support/fake-stories.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const manager: Actor = { kind: 'staff', userId: 'u3', guestId: 'g3', stores: new Map([[store, 'manager']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u4', guestId: 'g4' }
const at = new Date('2026-10-27T10:00:00Z')

const file = (id: string, over: Partial<MediaRecord> = {}): MediaRecord => ({ ...mediaDefaults, id, storeId: store, kind: 'image', storageKey: `${id}.jpg`, contentType: 'image/jpeg', byteSize: 1, sha256: 'a'.repeat(64), width: 1200, height: 800, status: 'ready', ...over })
const cover = file('00000000-0000-4000-8000-0000000000c1')
const inline = file('00000000-0000-4000-8000-0000000000a1')
const otherStore = file('00000000-0000-4000-8000-0000000000b1', { storeId: 'store-2' })

const body: StoryBody = { type: 'doc', content: [
  { type: 'paragraph', content: [{ type: 'text', text: 'Walk the wall.' }] },
  { type: 'image', attrs: { mediaId: inline.id.toUpperCase(), alt: 'The wall', caption: '' } },
  { type: 'image', attrs: { mediaId: inline.id, alt: 'Again', caption: '' } },
  { type: 'image', attrs: { mediaId: otherStore.id, alt: 'Not ours', caption: '' } },
] }
const doc = (over: Partial<StoryDraft> = {}): StoryDraft => ({ title: 'A morning on the Musegg wall', excerpt: '', authorName: '', coverMediaId: cover.id, body, ...over })

async function setup() {
  const stories = createFakeStories()
  const media = createFakeMedia([cover, inline, otherStore])
  const group = await stories.insertGroup(null, store, { kind: 'story', subjectPlaceId: null }, at)
  const read = makeGetStoryVersionText({ uow: { run: work => work(null) }, stories, media })
  return { stories, group, read }
}

describe('the text of a story version for a preview', () => {
  it('reads the draft, with the cover and each file of the body once, and not a file of another store', async () => {
    const { stories, group, read } = await setup()
    await stories.insertVersion(null, store, group.id, 'de', { draft: doc() }, at)

    const result = await read(owner, store, group.id, 'de')

    expect(result).toMatchObject({ ok: true, value: { status: 'draft', title: 'A morning on the Musegg wall', cover, body, updatedAt: at } })
    expect(result.ok && result.value.media).toEqual([inline])
  })

  it('reads the draft over the published text, and says `draft` for a published version with edits on top', async () => {
    const { stories, group, read } = await setup()
    const version = await stories.insertVersion(null, store, group.id, 'en', { draft: doc({ title: 'Live title' }) }, at)
    const published = await stories.publishVersion(null, version!, at)
    const edited = await stories.saveVersion(null, published, { draft: doc({ title: 'Edited title' }) }, at)

    expect(await read(owner, store, group.id, 'en')).toMatchObject({ ok: true, value: { status: 'draft', title: 'Edited title' } })
    expect(edited.draft?.title).toBe('Edited title')
  })

  it('reads the published text as published when no draft lies on it', async () => {
    const { stories, group, read } = await setup()
    const version = await stories.insertVersion(null, store, group.id, 'en', { draft: doc({ title: 'Live title' }) }, at)
    await stories.publishVersion(null, version!, at)

    expect(await read(manager, store, group.id, 'en')).toMatchObject({ ok: true, value: { status: 'published', title: 'Live title' } })
  })

  it('says `draft` for a version taken down, which keeps its published text', async () => {
    const { stories, group, read } = await setup()
    const version = await stories.insertVersion(null, store, group.id, 'en', { draft: doc({ title: 'Live title' }) }, at)
    const published = await stories.publishVersion(null, version!, at)
    await stories.unpublishVersion(null, published, at)

    expect(await read(owner, store, group.id, 'en')).toMatchObject({ ok: true, value: { status: 'draft', title: 'Live title' } })
  })

  it('reads a version with no document as an empty draft, and a cover that is gone as none', async () => {
    const { stories, group, read } = await setup()
    await stories.insertVersion(null, store, group.id, 'en', {}, at)
    await stories.insertVersion(null, store, group.id, 'de', { draft: doc({ coverMediaId: otherStore.id, body: emptyStoryBody }) }, at)

    expect(await read(owner, store, group.id, 'en')).toMatchObject({ ok: true, value: { status: 'draft', title: '', cover: null, body: emptyStoryBody, media: [] } })
    expect(await read(owner, store, group.id, 'de')).toMatchObject({ ok: true, value: { cover: null, media: [] } })
  })

  it('is not-found for a language the group has no version in, and for a group of another store', async () => {
    const { stories, group, read } = await setup()
    await stories.insertVersion(null, store, group.id, 'en', { draft: doc() }, at)

    expect(await read(owner, store, group.id, 'de')).toMatchObject({ ok: false, reason: 'not-found' })
    expect(await read(owner, store, '00000000-0000-4000-8000-000000000999', 'en')).toMatchObject({ ok: false, reason: 'not-found' })
  })

  it('is forbidden to a guest and to staff of another store, before anything is read', async () => {
    const { stories, group, read } = await setup()
    await stories.insertVersion(null, store, group.id, 'en', { draft: doc() }, at)

    expect(await read(guest, store, group.id, 'en')).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await read(outsider, store, group.id, 'en')).toMatchObject({ ok: false, reason: 'forbidden' })
  })
})
