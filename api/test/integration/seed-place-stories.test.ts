import type { PlaceStory } from '../../scripts/seed-data/place-stories.ts'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { legacyStoryGroups, placeStories } from '../../scripts/seed-data/place-stories.ts'
import { placeStoriesStep } from '../../scripts/seed-place-stories.ts'
import { insertStore } from '../support/identity-wiring.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 180_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

const off = { replaceLegacy: false, deleteSamplePins: false, refreshBodies: false }
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
function suffixed(suffix: string): PlaceStory[] {
  const add = (slug: string) => `${slug}-${suffix}`
  return placeStories.map(story => ({ ...story, slug: { en: add(story.slug.en), de: add(story.slug.de) }, places: story.places.map(add), mainStoryFor: story.mainStoryFor.map(add), coverFrom: add(story.coverFrom) }))
}

// A store with the places the data names (published, each with a ready cover except `withoutCover`) and the blog categories.
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
        [mediaId, storeId, `${storeId}/${mediaId}/original.jpg`, 'b'.repeat(64)],
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
  const state = async () => {
    const groups = await pool.query(`select g.id, g.kind, g.subject_place_id, (select json_agg(json_build_object('l', v.language, 's', v.status, 'slug', v.slug, 'cover', v.published->>'coverMediaId', 'checked', v.published->>'checkedOn') order by v.language) from content.story_versions v where v.group_id = g.id) versions,
        (select coalesce(json_agg(place_id order by position), '[]') from content.story_group_places where group_id = g.id) places,
        (select coalesce(json_agg(related_group_id order by position), '[]') from content.story_related where group_id = g.id) related,
        (select coalesce(json_agg(category_id), '[]') from content.story_categories where group_id = g.id) categories
        from content.story_groups g where g.store_id = $1 order by g.id`, [storeId])
    const pins = await pool.query(`select id, main_story_group_id, row_version, status, draft is null as no_draft from content.places where store_id = $1 order by id`, [storeId])
    const hash = await pool.query(`select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) h from (select * from content.story_groups where store_id = $1) t`, [storeId])
    const versionsHash = await pool.query(`select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) h from (select * from content.story_versions where store_id = $1) t`, [storeId])
    const pinHash = await pool.query(`select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) h from (select * from content.places where store_id = $1) t`, [storeId])
    return { groups: groups.rows, pins: pins.rows, hashes: [hash.rows[0].h, versionsHash.rows[0].h, pinHash.rows[0].h] }
  }
  return { storeId, placeIds, state }
}

describe('[seed-place-stories] the stories step on a scratch store', () => {
  it('adds the stories published with covers, links places, related stories and main stories, and a second run changes nothing', async () => {
    const stories = suffixed('a1')
    const store = await scratchStore(stories, ['bachmann-at-bahnhof-luzern-ug'])

    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)).toBe(0)
    const first = await store.state()

    expect(first.groups).toHaveLength(8)
    const reviews = first.groups.filter(g => g.kind === 'editorial_review')
    expect(reviews).toHaveLength(1)
    const review = reviews.find(g => g.subject_place_id === store.placeIds.get('bachmann-at-bahnhof-luzern-ug-a1'))
    expect(review.subject_place_id).toBe(store.placeIds.get('bachmann-at-bahnhof-luzern-ug-a1'))
    expect(review.versions.map((v: { s: string }) => v.s)).toEqual(['draft', 'draft'])
    expect(review.places).toEqual([review.subject_place_id])
    const published = first.groups.filter(g => g.kind === 'story')
    expect(published).toHaveLength(7)
    for (const group of published) {
      expect(group.versions.map((v: { l: string, s: string }) => `${v.l}:${v.s}`)).toEqual(['de:published', 'en:published'])
      expect(group.versions.every((v: { cover: string | null }) => v.cover !== null)).toBe(true)
      expect(group.categories.length).toBe(1)
    }
    const chapel = published.find(g => g.versions[1].slug === 'crossing-the-chapel-bridge-a1')
    expect(chapel.places).toHaveLength(2)
    expect(chapel.related).toHaveLength(2)
    const lion = published.find(g => g.versions[1].slug === 'the-dying-lion-of-lucerne-a1')
    expect(lion.related).toEqual([])
    // Main story: each story's pin points at its group, and a pin that is not a story's main place has none.
    const mainOf = (slug: string) => first.pins.find(p => p.id === store.placeIds.get(slug)).main_story_group_id
    expect(mainOf('lion-monument-a1')).toBe(lion.id)
    expect(mainOf('chapel-bridge-and-water-tower-a1')).toBe(chapel.id)
    expect(mainOf('chapel-bridge-a1')).toBe(chapel.id)
    // A review is the main story of its pin too, also a draft one (DM-5 allows it), and it is linked to its place.
    for (const slug of ['bachmann-at-bahnhof-luzern-ug']) {
      const group = reviews.find(g => g.subject_place_id === store.placeIds.get(`${slug}-a1`))
      expect(mainOf(`${slug}-a1`), slug).toBe(group.id)
      expect(group.places, slug).toEqual([store.placeIds.get(`${slug}-a1`)])
    }
    // A main story set through the save use case leaves no draft behind and the pin published.
    expect(first.pins.every(p => p.no_draft && p.status === 'published')).toBe(true)
    expect(out.stdout).toContain('8 created (14 versions published)')

    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)).toBe(0)
    expect(await store.state()).toEqual(first)
    expect(out.stdout).toContain('Nothing was changed')
    expect(out.stdout).toContain('skipping 8')
  })

  it('a dry run prints the plan and writes nothing', async () => {
    const stories = suffixed('b2')
    const store = await scratchStore(stories)
    const before = await store.state()
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: true, replaceLegacy: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Would create 8 stories and reviews')
    expect(await store.state()).toEqual(before)
  })

  it('a missing place stops the step with a fault and writes nothing', async () => {
    const stories = suffixed('c3')
    const store = await scratchStore(stories.filter(s => s.key !== 'weinmarkt'))
    const before = await store.state()
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)).toBe(1)
    expect(out.stderr).toContain('weinmarkt-c3')
    expect(await store.state()).toEqual(before)
  })

  it('--replace-legacy-stories deletes a legacy group of the list with its links once, keeps others, and the next run deletes nothing', async () => {
    const stories = suffixed('d4')
    const store = await scratchStore(stories)
    const legacy = legacyStoryGroups.find(g => g.slugs[0] === 'qa-story-c2cd1d')!
    const draft = { title: 'Old', excerpt: 'x', authorName: 'a', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } }
    await pool.query(`insert into content.story_groups (id, store_id, kind) values ($1, $2, 'story')`, [legacy.id, store.storeId])
    await pool.query(`insert into content.story_versions (group_id, language, store_id, slug, status, published, published_at) values ($1, 'en', $2, $3, 'published', $4::jsonb, now())`, [legacy.id, store.storeId, legacy.slugs[0], JSON.stringify(draft)])
    const lionId = store.placeIds.get('lion-monument-d4')!
    await pool.query(`update content.places set main_story_group_id = $1 where id = $2`, [legacy.id, lionId])
    // A person's own story is not on the list and stays.
    const mine = (await pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store.storeId])).rows[0].id
    await pool.query(`insert into content.story_versions (group_id, language, store_id, slug, draft) values ($1, 'en', $2, $3, $4::jsonb)`, [mine, store.storeId, `my-own-story-${randomUUID().slice(0, 8)}`, JSON.stringify(draft)])

    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, replaceLegacy: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Will delete 1 legacy stories: qa-story-c2cd1d')
    expect(out.stdout).toContain('1 deleted, 8 created')
    const groups = (await store.state()).groups
    expect(groups.some(g => g.id === legacy.id)).toBe(false)
    expect(groups.some(g => g.id === mine)).toBe(true)
    expect(groups).toHaveLength(9)
    const lion = groups.find(g => g.versions[1]?.slug === 'the-dying-lion-of-lucerne-d4')
    const pin = (await pool.query(`select main_story_group_id from content.places where id = $1`, [lionId])).rows[0]
    expect(pin.main_story_group_id).toBe(lion.id)
    const audit = await pool.query(`select count(*)::int n from platform.audit_log where store_id = $1 and entity = 'story-group' and entity_id = $2 and action = 'deleted'`, [store.storeId, legacy.id])
    expect(audit.rows[0].n).toBe(1)

    const after = await store.state()
    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, replaceLegacy: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Will delete 0 legacy stories')
    expect(await store.state()).toEqual(after)
  })

  it('keeps a main story that a person chose', async () => {
    const stories = suffixed('e5')
    const store = await scratchStore(stories)
    const chosen = (await pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store.storeId])).rows[0].id
    await pool.query(`insert into content.story_versions (group_id, language, store_id, slug, draft) values ($1, 'en', $2, $3, $4::jsonb)`, [chosen, store.storeId, `chosen-${randomUUID().slice(0, 8)}`, JSON.stringify({ title: 't', excerpt: '', authorName: '', coverMediaId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] } })])
    await pool.query(`update content.places set main_story_group_id = $1 where id = $2`, [chosen, store.placeIds.get('weinmarkt-e5')])
    await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)
    const pin = (await pool.query(`select main_story_group_id from content.places where id = $1`, [store.placeIds.get('weinmarkt-e5')])).rows[0]
    expect(pin.main_story_group_id).toBe(chosen)
  })

  it('--delete-sample-pins deletes an unused sample pin through the Delete pin use case, keeps a used one, and a second run deletes nothing', async () => {
    const stories = suffixed('f6')
    const store = await scratchStore(stories)
    const sample = async (slug: string) => {
      const id = randomUUID()
      await pool.query(`insert into content.places (id, store_id, status, slug, latitude, longitude, published, first_published_at) values ($1, $2, 'hidden', $3::jsonb, 47.05, 8.3, $4::jsonb, now())`, [id, store.storeId, JSON.stringify({ en: slug }), JSON.stringify({ name: { en: slug }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} })])
      return id
    }
    const sampleId = await sample('baeckerei-weinmarkt')
    const before = (await pool.query(`select count(*)::int n from content.places where store_id = $1`, [store.storeId])).rows[0].n
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: true, deleteSamplePins: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Would delete 1 sample pins: baeckerei-weinmarkt')
    expect((await pool.query(`select count(*)::int n from content.places where store_id = $1`, [store.storeId])).rows[0].n).toBe(before)

    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, deleteSamplePins: true }, stories)).toBe(0)
    expect((await pool.query(`select count(*)::int n from content.places where id = $1`, [sampleId])).rows[0].n).toBe(0)
    expect((await pool.query(`select count(*)::int n from content.places where store_id = $1`, [store.storeId])).rows[0].n).toBe(before - 1)
    const after = await store.state()
    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, deleteSamplePins: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Would delete 0 sample pins')
    expect(await store.state()).toEqual(after)
  })

  it('--delete-sample-pins stops with nothing written when a story uses the sample pin', async () => {
    const stories = suffixed('g7').filter(s => s.key === 'weinmarkt')
    const store = await scratchStore(stories)
    const id = randomUUID()
    await pool.query(`insert into content.places (id, store_id, status, slug, latitude, longitude, published, first_published_at) values ($1, $2, 'hidden', $3::jsonb, 47.05, 8.3, $4::jsonb, now())`, [id, store.storeId, JSON.stringify({ en: 'baeckerei-weinmarkt' }), JSON.stringify({ name: { en: 'x' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} })])
    const group = (await pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store.storeId])).rows[0].id
    await pool.query(`insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, 1)`, [group, id, store.storeId])
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, deleteSamplePins: true }, stories)).toBe(1)
    expect(out.stderr).toContain('baeckerei-weinmarkt')
    expect((await pool.query(`select count(*)::int n from content.places where id = $1`, [id])).rows[0].n).toBe(1)
  })

  it('--refresh-story-bodies rewrites only the body of a stored version, keeps published ones published and drafts drafts, and a second run changes nothing', async () => {
    const stories = suffixed('h8')
    const store = await scratchStore(stories, ['bachmann-at-bahnhof-luzern-ug'])
    await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)
    // Put an older body (with an extra line) into every stored version, as the first dev run left them.
    const older = (body: { content: unknown[] }) => ({ ...body, content: [...body.content, { type: 'paragraph', content: [{ type: 'text', text: 'Sources: old' }] }] })
    const rows = (await pool.query(`select group_id, language, status, draft, published from content.story_versions where store_id = $1`, [store.storeId])).rows
    for (const row of rows) {
      const slot = row.status === 'published' ? 'published' : 'draft'
      const doc = row[slot]
      await pool.query(`update content.story_versions set ${slot} = $1::jsonb where group_id = $2 and language = $3`, [JSON.stringify({ ...doc, body: older(doc.body) }), row.group_id, row.language])
    }
    const titles = (await pool.query(`select group_id, language, coalesce(published, draft)->>'title' t, coalesce(published, draft)->>'coverMediaId' c from content.story_versions where store_id = $1 order by 1, 2`, [store.storeId])).rows
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: true, refreshBodies: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Would rewrite the body of 16 story versions')

    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, refreshBodies: true }, stories)).toBe(0)
    expect(out.stdout).toContain('16 bodies rewritten')
    const now = (await pool.query(`select group_id, language, status, draft is null no_draft, coalesce(published, draft) doc from content.story_versions where store_id = $1 order by 1, 2`, [store.storeId])).rows
    expect(now.map(r => `${r.status}:${r.no_draft}`).sort()).toEqual(rows.map(r => `${r.status}:${r.status === 'published'}`).sort())
    expect(JSON.stringify(now.map(r => r.doc.body))).not.toContain('Sources: old')
    expect(now.map(r => ({ group_id: r.group_id, language: r.language, t: r.doc.title, c: r.doc.coverMediaId }))).toEqual(titles.map(r => ({ group_id: r.group_id, language: r.language, t: r.t, c: r.c })))

    const after = await store.state()
    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false, refreshBodies: true }, stories)).toBe(0)
    expect(out.stdout).toContain('Nothing was changed')
    expect(await store.state()).toEqual(after)
  })

  it('links an existing story to its place when the place has no main story, once', async () => {
    const stories = suffixed('i9')
    const store = await scratchStore(stories)
    await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)
    const bachmann = store.placeIds.get('bachmann-at-bahnhof-luzern-ug-i9')!
    await pool.query(`update content.places set main_story_group_id = null where id = $1`, [bachmann])
    out.stdout = ''
    expect(await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)).toBe(0)
    expect(out.stdout).toContain('1 main stories set')
    const row = (await pool.query(`select main_story_group_id g from content.places where id = $1`, [bachmann])).rows[0]
    expect((await pool.query(`select subject_place_id from content.story_groups where id = $1`, [row.g])).rows[0].subject_place_id).toBe(bachmann)
    out.stdout = ''
    await placeStoriesStep(pool, store.storeId, { ...off, dry: false }, stories)
    expect(out.stdout).toContain('Nothing was changed')
  })
})
