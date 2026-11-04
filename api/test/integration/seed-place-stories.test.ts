import type { PlaceStory } from '../../scripts/seed-data/place-stories.ts'
import type { MediaUploader } from '../../scripts/seed-media-upload.ts'
import { createHash, randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { placeCovers, placeStories } from '../../scripts/seed-data/place-stories.ts'
import { storyPhotos } from '../../scripts/seed-data/story-photos.ts'
import { placeStoriesStep, storyPhotoKeys } from '../../scripts/seed-place-stories.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 240_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

const out = { stdout: '', stderr: '' }
beforeEach(() => {
  out.stdout = ''
  out.stderr = ''
  vi.spyOn(process.stdout, 'write').mockImplementation((text) => {
    out.stdout += String(text)
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((text) => {
    out.stderr += String(text)
    return true
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await pool.end()
})

// Story and place slugs are unique across stores, so the test works on copies of the data with a suffix of its own.
function suffixed(suffix: string, stories: readonly PlaceStory[] = placeStories): PlaceStory[] {
  const add = (slug: string) => `${slug}-${suffix}`
  return stories.map(story => ({ ...story, slug: { en: add(story.slug.en), de: add(story.slug.de) }, places: story.places.map(add), mainStoryFor: story.mainStoryFor.map(add), coverFrom: add(story.coverFrom) }))
}
const coversOf = (suffix: string) => placeCovers.map(entry => ({ ...entry, place: `${entry.place}-${suffix}` }))

// What the first dev run left: other titles, no photos, the cover of the place.
function older(stories: PlaceStory[]): PlaceStory[] {
  return stories.map(story => ({
    ...story,
    cover: undefined,
    versions: {
      en: { title: `Old ${story.key}`, excerpt: 'Old summary.', blocks: ['Old paragraph.'] },
      de: { title: `Alt ${story.key}`, excerpt: 'Alte Kurzfassung.', blocks: ['Alter Absatz.'] },
    },
  }))
}

// A store with the places the data names (published; each has a ready cover unless `withoutCover` starts it) and the blog categories.
async function scratchStore(stories: PlaceStory[], withoutCover: string[] = []) {
  const storeId = randomUUID()
  await insertStore(pool, storeId)
  for (const slug of ['history', 'old-town-history', 'legends'])
    await pool.query(`insert into content.blog_categories (store_id, name, slug) values ($1, $2::jsonb, $3)`, [storeId, JSON.stringify({ en: slug }), slug])
  const placeIds = new Map<string, string>()
  const slugs = [...new Set(stories.flatMap(s => [...s.places, s.coverFrom, ...s.mainStoryFor]))]
  for (const slug of slugs) {
    let mediaId: string | null = null
    if (!withoutCover.some(plain => slug.startsWith(plain))) {
      mediaId = randomUUID()
      await pool.query(
        `insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status)
         values ($1, $2, 'image', $3, 'image/jpeg', 1000, $4, 1280, 960, 'ready')`,
        [mediaId, storeId, `${storeId}/${mediaId}/original.jpg`, createHash('sha256').update(slug).digest('hex')],
      )
    }
    const id = randomUUID()
    placeIds.set(slug, id)
    await pool.query(
      `insert into content.places (id, store_id, status, slug, latitude, longitude, cover_media_id, published, first_published_at)
       values ($1, $2, 'published', $3::jsonb, 47.05, 8.3, $4, $5::jsonb, now())`,
      [id, storeId, JSON.stringify({ en: slug }), mediaId, JSON.stringify({ name: { en: slug }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} })],
    )
  }
  // The media path needs object storage; the test puts the file in the library with a row of its own.
  const uploads: string[] = []
  const uploader: MediaUploader = async (name, bytes, alt) => {
    const id = randomUUID()
    uploads.push(name)
    await pool.query(
      `insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status, name, alt)
       values ($1, $2, 'image', $3, 'image/jpeg', $4, $5, 1800, 1200, 'ready', $6, $7::jsonb)`,
      [id, storeId, `${storeId}/${id}/original.jpg`, bytes.byteLength, createHash('sha256').update(bytes).digest('hex'), name, JSON.stringify(alt ?? {})],
    )
    return id
  }
  const state = async () => {
    const groups = await pool.query(`select g.id, g.kind, g.subject_place_id, (select json_agg(json_build_object('l', v.language, 's', v.status, 'slug', v.slug, 'cover', v.published->>'coverMediaId', 'title', v.published->>'title', 'draft', v.draft is not null) order by v.language) from content.story_versions v where v.group_id = g.id) versions,
        (select coalesce(json_agg(place_id order by position), '[]') from content.story_group_places where group_id = g.id) places,
        (select coalesce(json_agg(related_group_id order by position), '[]') from content.story_related where group_id = g.id) related
        from content.story_groups g where g.store_id = $1 order by g.id`, [storeId])
    const pins = await pool.query(`select id, main_story_group_id, cover_media_id, status, draft is null as no_draft from content.places where store_id = $1 order by id`, [storeId])
    const hashOf = async (table: string) => (await pool.query(`select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) h from (select * from ${table} where store_id = $1) t`, [storeId])).rows[0].h
    return { groups: groups.rows, pins: pins.rows, hashes: [await hashOf('content.story_groups'), await hashOf('content.story_versions'), await hashOf('content.places'), await hashOf('content.media')] }
  }
  return { storeId, placeIds, state, uploader, uploads }
}

describe('[seed-place-stories] the stories step on a scratch store', () => {
  it('creates the stories and reviews with photos, covers and links, and a second run changes nothing', async () => {
    const stories = suffixed('a1')
    const covers = coversOf('a1')
    const store = await scratchStore(stories, ['bachmann-at-bahnhof-luzern-ug', 'coop-bahnhof-luzern', 'migros-bahnhof-luzern', 'manor-luzern'])

    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers })).toBe(0)
    const first = await store.state()

    expect(first.groups).toHaveLength(11)
    expect(first.groups.filter(g => g.kind === 'editorial_review')).toHaveLength(4)
    // The Manor review has no cover photo, so it is created as a draft; every other text is published with a cover.
    const manor = first.groups.find(g => g.versions[0].slug.startsWith('warenhaus-manor'))
    expect(manor.versions.map((v: { s: string }) => v.s)).toEqual(['draft', 'draft'])
    for (const group of first.groups.filter(g => g !== manor)) {
      expect(group.versions.map((v: { l: string, s: string }) => `${v.l}:${v.s}`)).toEqual(['de:published', 'en:published'])
      expect(group.versions.every((v: { cover: string | null, draft: boolean }) => v.cover !== null && !v.draft)).toBe(true)
    }
    expect(first.pins.find(p => p.id === store.placeIds.get('manor-luzern-a1'))!.main_story_group_id).toBe(manor.id)
    // Every photo of the data is in the library once, and the shops without a cover got one.
    const photoKeys = new Set(stories.flatMap(storyPhotoKeys).concat(covers.map(c => c.photo)))
    expect(store.uploads).toHaveLength(photoKeys.size)
    expect(first.pins.filter(p => p.cover_media_id === null)).toHaveLength(1)
    const library = await pool.query(`select count(*)::int described from content.media where store_id = $1 and alt->>'en' <> '' and alt->>'de' <> ''`, [store.storeId])
    expect(library.rows[0].described).toBe(photoKeys.size)
    // The bodies hold image nodes that point at library items of this store.
    const images = await pool.query(`select count(*)::int n from content.story_versions v, jsonb_path_query(v.published, 'strict $.** ? (@.type == "image")') node
       where v.store_id = $1 and exists (select 1 from content.media m where m.store_id = $1 and m.id::text = node->'attrs'->>'mediaId')`, [store.storeId])
    const expected = stories.reduce((n, s) => n + (['en', 'de'] as const).reduce((m, l) => m + s.versions[l].blocks.filter(b => typeof b !== 'string' && 'photo' in b).length, 0), 0)
    expect(images.rows[0].n).toBe(expected)
    expect(out.stdout).toContain('11 created (20 versions published)')

    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers })).toBe(0)
    expect(await store.state()).toEqual(first)
    expect(out.stdout).toContain('Nothing was changed')
    expect(store.uploads).toHaveLength(photoKeys.size)
  })

  it('replaces title, short summary, cover, body and photos of stored stories, publishes a draft review, keeps the links, and a third run changes nothing', async () => {
    const stories = suffixed('b2')
    const covers = coversOf('b2')
    const old = older(stories)
    const store = await scratchStore(stories, ['bachmann-at-bahnhof-luzern-ug', 'coop-bahnhof-luzern', 'migros-bahnhof-luzern', 'manor-luzern'])

    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, old, { uploader: store.uploader, covers: [] })).toBe(0)
    const before = await store.state()
    // The four reviews have no cover on the place, so they are drafts, as on dev.
    expect(before.groups.filter(g => g.versions.every((v: { s: string }) => v.s === 'draft'))).toHaveLength(4)
    expect(before.groups.every(g => g.versions.every((v: { title: string | null, s: string }) => v.s === 'draft' || /^(?:Old|Alt) /.test(v.title ?? '')))).toBe(true)
    expect(store.uploads).toEqual([])

    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { dry: true }, stories, { uploader: store.uploader, covers })).toBe(0)
    expect(out.stdout).toContain('Would rewrite 22 story versions')
    expect(out.stdout).toMatch(/Would upload \d+ photos/)
    expect(out.stdout).toContain('Would rewrite 22 story versions')
    expect(await store.state()).toEqual(before)

    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers })).toBe(0)
    expect(out.stdout).toContain('22 versions rewritten, 3 place covers set')
    const after = await store.state()
    expect(after.groups).toHaveLength(11)
    for (const group of after.groups) {
      const isManor = group.versions[0].slug.startsWith('warenhaus-manor')
      // The Manor review has no cover photo: it gets the new text and stays a draft.
      expect(group.versions.map((v: { s: string }) => v.s)).toEqual(isManor ? ['draft', 'draft'] : ['published', 'published'])
      if (!isManor)
        expect(group.versions.every((v: { draft: boolean }) => !v.draft)).toBe(true)
    }
    const titles = after.groups.filter(g => !g.versions[0].slug.startsWith('warenhaus-manor')).flatMap(g => g.versions.map((v: { title: string }) => v.title)).sort()
    expect(titles).toEqual(stories.filter(s => s.key !== 'manor-review').flatMap(s => [s.versions.en.title, s.versions.de.title]).sort())
    const manorTitles = (await pool.query(`select draft->>'title' t from content.story_versions where store_id = $1 and (slug like 'warenhaus-manor%' or slug like 'manor-department%') order by language`, [store.storeId])).rows.map(r => r.t)
    expect(manorTitles).toEqual([stories.find(s => s.key === 'manor-review')!.versions.de.title, stories.find(s => s.key === 'manor-review')!.versions.en.title])
    // Links, groups and main stories are untouched; only the three shop pins gained a cover.
    expect(after.groups.map(g => ({ id: g.id, kind: g.kind, places: g.places, related: g.related }))).toEqual(before.groups.map(g => ({ id: g.id, kind: g.kind, places: g.places, related: g.related })))
    expect(after.pins.map(p => p.main_story_group_id)).toEqual(before.pins.map(p => p.main_story_group_id))
    expect(after.pins.filter(p => p.cover_media_id === null)).toHaveLength(1)
    // The audit trail records the publish of each rewritten version.
    const audit = await pool.query(`select count(*)::int n from platform.audit_log where store_id = $1 and entity = 'story-version' and action = 'published'`, [store.storeId])
    expect(audit.rows[0].n).toBeGreaterThanOrEqual(20)

    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers })).toBe(0)
    expect(out.stdout).toContain('Nothing was changed')
    expect(await store.state()).toEqual(after)
  })

  it('a dry run prints the plan and writes nothing', async () => {
    const stories = suffixed('c3')
    const store = await scratchStore(stories)
    const before = await store.state()
    expect(await placeStoriesStep(pool, store.storeId, { dry: true }, stories, { uploader: store.uploader, covers: coversOf('c3') })).toBe(0)
    expect(out.stdout).toContain('Would create 11 stories and reviews')
    expect(store.uploads).toEqual([])
    expect(await store.state()).toEqual(before)
  })

  it('a missing place stops the step with a fault and writes nothing', async () => {
    const stories = suffixed('d4')
    const store = await scratchStore(stories.filter(s => s.key !== 'weinmarkt'))
    const before = await store.state()
    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers: [] })).toBe(1)
    expect(out.stderr).toContain('weinmarkt-d4')
    expect(store.uploads).toEqual([])
    expect(await store.state()).toEqual(before)
  })

  it('keeps a main story that a person chose', async () => {
    const stories = suffixed('e5')
    const store = await scratchStore(stories)
    const chosen = (await pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store.storeId])).rows[0].id
    await pool.query(`insert into content.story_versions (group_id, language, store_id, slug, draft) values ($1, 'en', $2, $3, $4::jsonb)`, [chosen, store.storeId, `chosen-${randomUUID().slice(0, 8)}`, JSON.stringify({ title: 't', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } })])
    await pool.query(`update content.places set main_story_group_id = $1 where id = $2`, [chosen, store.placeIds.get('weinmarkt-e5')])
    await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers: [] })
    const pin = (await pool.query(`select main_story_group_id from content.places where id = $1`, [store.placeIds.get('weinmarkt-e5')])).rows[0]
    expect(pin.main_story_group_id).toBe(chosen)
  })

  it('links an existing story to its place when the place has no main story, once', async () => {
    const stories = suffixed('f6')
    const store = await scratchStore(stories)
    await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers: [] })
    const bachmann = store.placeIds.get('bachmann-at-bahnhof-luzern-ug-f6')!
    await pool.query(`update content.places set main_story_group_id = null where id = $1`, [bachmann])
    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers: [] })).toBe(0)
    expect(out.stdout).toContain('1 main stories set')
    const row = (await pool.query(`select main_story_group_id g from content.places where id = $1`, [bachmann])).rows[0]
    expect((await pool.query(`select subject_place_id from content.story_groups where id = $1`, [row.g])).rows[0].subject_place_id).toBe(bachmann)
    out.stdout = ''
    await placeStoriesStep(pool, store.storeId, { dry: false }, stories, { uploader: store.uploader, covers: [] })
    expect(out.stdout).toContain('Nothing was changed')
  })

  it('lists the photos of the data that the store lacks only once', () => {
    expect(new Set(storyPhotos.map(p => p.key)).size).toBe(storyPhotos.length)
  })
})
