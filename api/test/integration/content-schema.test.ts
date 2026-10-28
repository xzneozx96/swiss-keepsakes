import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

function slugOf(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

async function slugMapOk(value: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_slug_map($1::jsonb) as ok', [value])
  return rows[0]?.ok === true
}

describe('[E2.5] migration 0007: platform helper functions', () => {
  it.each(['{"en":"a-b"}', '{"de":"x"}'])('[E2.5] valid_slug_map accepts %s', async (value) => {
    expect(await slugMapOk(value)).toBe(true)
  })

  it.each(['{}', '{"fr":"x"}', '{"en":null}', '{"en":5}', '{"en":"Old Town"}', '[]'])('[E2.5] valid_slug_map refuses %s', async (value) => {
    expect(await slugMapOk(value)).toBe(false)
  })

  it.each(['{}', '{history-culture,food-drink,lake-mountains,shopping-keepsakes}'])('[E2.5] valid_interests accepts %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(true)
  })

  it.each(['{sport}', null])('[E2.5] valid_interests refuses %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean | null }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(false)
  })
})

interface PgFailure { code?: string, constraint?: string, message?: string }

async function failure(promise: Promise<unknown>): Promise<PgFailure> {
  try {
    await promise
  }
  catch (error) {
    return error as PgFailure
  }
  throw new Error('the statement was expected to fail and succeeded')
}

async function newGroup(store: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  return rows[0]!.id
}

async function newPlace(store: string, slug: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id, slug) values ($1, $2) returning id', [store, slug])
  return rows[0]!.id
}

function insertPublishedVersion(group: string, language: string, store: string, slug: string) {
  return pool.query(
    `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
     values ($1, $2, $3, 'published', $4, now(), '{"title":"T","body":{"type":"doc","content":[]}}')`,
    [group, language, store, slug],
  )
}

function publishPlace(id: string, slug: string, published: string) {
  return pool.query(
    `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = 8.3, published = $3 where id = $1`,
    [id, slug, published],
  )
}

describe('[E2.5] content tables', () => {
  it('[E2.5][ADR-014] the same story slug is allowed once per language', async () => {
    const store = randomUUID()
    const slug = slugOf('old-town')
    const [g1, g2] = [await newGroup(store), await newGroup(store)] as [string, string]
    await insertPublishedVersion(g1, 'en', store, slug)

    const clash = await failure(insertPublishedVersion(g2, 'en', store, slug))
    await insertPublishedVersion(g2, 'de', store, slug)

    expect(clash).toMatchObject({ code: '23505', constraint: 'story_versions_language_slug_key' })
    expect(await count(pool, 'select count(*) from content.story_versions where store_id = $1', [store])).toBe(2)
  })

  it('[E2.5][ADR-014] a place slug is unique per language', async () => {
    const store = randomUUID()
    const word = `x${randomUUID().replaceAll('-', '').slice(0, 10)}`
    await newPlace(store, JSON.stringify({ en: word }))

    const clash = await failure(newPlace(store, JSON.stringify({ en: word })))
    await newPlace(store, JSON.stringify({ de: word }))

    expect(clash).toMatchObject({ code: '23505', constraint: 'places_slug_en_key' })
    expect(await count(pool, 'select count(*) from content.places where store_id = $1', [store])).toBe(2)
  })

  it('[E2.5] a published place with an {"en": null} slug is refused', async () => {
    const place = await newPlace(randomUUID())

    const refused = await failure(publishPlace(place, '{"en":null}', '{"name":{"en":"A"}}'))

    // two checks refuse this slug; Postgres reports the first one it evaluates (alphabetical)
    expect(refused.code).toBe('23514')
    expect(['places_published_fields_check', 'places_slug_shape_check']).toContain(refused.constraint)
  })

  it.each(['{"en":null}', '{"en":"Old Town"}'])('[E2.5] a draft place with the slug %s is refused by the slug-shape check', async (slug) => {
    const refused = await failure(newPlace(randomUUID(), slug))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_slug_shape_check' })
  })

  it.each(['{"en":null}', '{"en":"Old Town"}'])('[E2.5] a draft tour with the slug %s is refused by the slug-shape check', async (slug) => {
    const refused = await failure(pool.query('insert into content.tours (store_id, slug) values ($1, $2)', [randomUUID(), slug]))

    expect(refused).toMatchObject({ code: '23514', constraint: 'tours_slug_shape_check' })
  })

  it.each([
    ['a title', { slug: '{"en":"x"}', latitude: 47.05, published: '{}' }],
    ['a location', { slug: '{"en":"x"}', latitude: null, published: '{"name":{"en":"A"}}' }],
    ['a slug', { slug: null, latitude: 47.05, published: '{"name":{"en":"A"}}' }],
  ])('[E2.11][AC68] a pin lacking %s cannot publish', async (_what, fields) => {
    const place = await newPlace(randomUUID())
    const slug = fields.slug === null ? null : JSON.stringify({ en: slugOf('pier') })

    const refused = await failure(pool.query(
      `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = $3, longitude = 8.3, published = $4 where id = $1`,
      [place, slug, fields.latitude, fields.published],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.11][AC68] a pin lacking a longitude cannot publish', async () => {
    const place = await newPlace(randomUUID())

    const refused = await failure(pool.query(
      `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = NULL, published = '{"name":{"en":"A"}}' where id = $1`,
      [place, JSON.stringify({ en: slugOf('pier') })],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.11][AC68] a pin with only a German title and slug publishes', async () => {
    const place = await newPlace(randomUUID())

    await publishPlace(place, JSON.stringify({ de: slugOf('aussicht') }), '{"name":{"de":"Aussicht"}}')

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
  })

  it('[E2.5] a published place with a NULL published document is refused (the IS TRUE path)', async () => {
    const place = await newPlace(randomUUID())

    const refused = await failure(pool.query(
      `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = 8.3, published = NULL where id = $1`,
      [place, JSON.stringify({ en: slugOf('pier') })],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.5] a published story version with a NULL published document is refused (the IS TRUE path)', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), NULL)`,
      [group, store, slugOf('lion')],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
  })

  it('[E2.5] a published place whose name and slug languages differ is refused', async () => {
    const store = randomUUID()
    const place = await newPlace(store)

    const refused = await failure(publishPlace(place, '{"en":"a","de":"b"}', '{"name":{"en":"A"}}'))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.5] a pin publishes with matching slug and name languages', async () => {
    const store = randomUUID()
    const place = await newPlace(store)

    await publishPlace(place, JSON.stringify({ en: slugOf('pier') }), '{"name":{"en":"A"}}')

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
  })

  it('[E2.11][AC85] a pin publishes with no story and no category', async () => {
    const store = randomUUID()
    const place = await newPlace(store)

    await publishPlace(place, JSON.stringify({ en: slugOf('pier') }), '{"name":{"en":"Pier"}}')

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published' and first_published_at is not null and main_story_group_id is null`, [place])).toBe(1)
    expect(await count(pool, 'select count(*) from content.place_categories where place_id = $1', [place])).toBe(0)
    expect(await count(pool, 'select count(*) from content.story_group_places where place_id = $1', [place])).toBe(0)
  })

  it('[E2.11][AC68] a pin with only an English title, a location and a slug publishes, and places have no type column', async () => {
    const place = await newPlace(randomUUID())

    await publishPlace(place, JSON.stringify({ en: slugOf('lookout') }), '{"name":{"en":"Lookout"}}')

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
    expect(await count(pool, `select count(*) from information_schema.columns where table_schema = 'content' and table_name = 'places' and column_name = 'type'`)).toBe(0)
  })

  it('[E2.11] an editorial review may be about any pin', async () => {
    const store = randomUUID()
    const place = await newPlace(store)

    await pool.query(`insert into content.story_groups (store_id, kind, subject_place_id) values ($1, 'editorial_review', $2)`, [store, place])

    expect(await count(pool, `select count(*) from content.story_groups where subject_place_id = $1`, [place])).toBe(1)
  })

  it('[E2.13][AC30] a published story version with a body document is accepted on insert and on update', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    const body = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi"}]}]}'

    await pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), jsonb_build_object('title', 'T', 'body', $4::jsonb))`,
      [group, store, slugOf('lion'), body],
    )
    const updated = await pool.query(
      `update content.story_versions set published = jsonb_build_object('title', 'T2', 'body', $2::jsonb) where group_id = $1 and language = 'en'`,
      [group, body],
    )

    expect(updated.rowCount).toBe(1)
  })

  it.each([
    ['no body key', '{"title":"T"}'],
    ['a body string', '{"title":"T","body":"text"}'],
    ['a body array', '{"title":"T","body":[]}'],
    ['a body null', '{"title":"T","body":null}'],
    ['a body type other than doc', '{"title":"T","body":{"type":"paragraph","content":[]}}'],
    ['a body object without type', '{"title":"T","body":{"content":[]}}'],
    ['the old sections array and no body', '{"title":"T","sections":[]}'],
  ])('[E2.13][AC30] a published story version with %s is refused by the check', async (_name, published) => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), $4::jsonb)`,
      [group, store, slugOf('lion'), published],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
  })

  it('[E2.13][AC30] a published story version without a title is still refused', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), '{"body":{"type":"doc","content":[]}}')`,
      [group, store, slugOf('lion')],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
  })

  it('[E2.5] a story version language other than en or de is refused', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(`insert into content.story_versions (group_id, language, store_id) values ($1, 'fr', $2)`, [group, store]))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_language_check' })
  })

  it('[E2.5] no foreign key leaves schema content', async () => {
    const { rows } = await pool.query(`
      select c.conname from pg_constraint c
      join pg_class r on r.oid = c.confrelid
      where c.contype = 'f' and c.connamespace = 'content'::regnamespace and r.relnamespace <> 'content'::regnamespace`)

    expect(rows).toEqual([])
  })

  it('[E2.5] the content indexes exist', async () => {
    const names = [
      'media_refs_owner_idx',
      'media_refs_media_fkey_idx',
      'places_slug_en_key',
      'places_slug_de_key',
      'places_main_story_idx',
      'place_dates_place_end_idx',
      'place_dates_store_place_idx',
      'map_categories_parent_idx',
      'blog_categories_parent_idx',
      'place_categories_category_idx',
      'story_categories_category_idx',
      'places_cover_media_idx',
      'story_groups_subject_idx',
      'story_versions_published_idx',
      'story_group_places_place_idx',
      'story_related_target_idx',
      'tours_slug_en_key',
      'tours_slug_de_key',
      'tours_pdf_media_idx',
      'tours_cover_media_idx',
      'tour_stops_media_idx',
      'tour_stops_place_idx',
    ]
    const { rows } = await pool.query<{ indexname: string }>(`select indexname from pg_indexes where schemaname = 'content' and indexname = any($1)`, [names])

    expect(rows.map(row => row.indexname).sort()).toEqual([...names].sort())
  })

  it('[E2.5] the content views and tables of this story exist', async () => {
    const { rows } = await pool.query<{ relname: string }>(`select relname from pg_class where relnamespace = 'content'::regnamespace and relkind in ('r', 'v') order by relname`)

    expect(rows.map(row => row.relname)).toEqual(expect.arrayContaining([
      'media',
      'media_refs',
      'place_links',
      'place_dates',
      'map_categories',
      'blog_categories',
      'place_categories',
      'story_categories',
      'public_pins',
      'place_story_links',
      'places',
      'story_group_places',
      'story_groups',
      'story_keepsake_links',
      'story_related',
      'story_related_readable',
      'story_versions',
      'tour_keepsake_links',
      'tour_stops',
      'tours',
    ]))
  })
})

async function newDraftVersion(group: string, language: string, store: string): Promise<void> {
  await pool.query('insert into content.story_versions (group_id, language, store_id) values ($1, $2, $3)', [group, language, store])
}

describe('[E2.5] content rules', () => {
  it('[E2.5][AC79] [E2.11][AC79] a published place can be hidden and cannot be deleted, and a draft can be deleted', async () => {
    const store = randomUUID()
    const draft = await newPlace(store)
    const published = await newPlace(store)
    await publishPlace(published, JSON.stringify({ en: slugOf('pier') }), '{"name":{"en":"Pier"}}')

    const deleted = await pool.query('delete from content.places where id = $1', [draft])
    const refusedPublished = await failure(pool.query('delete from content.places where id = $1', [published]))
    await pool.query(`update content.places set status = 'hidden' where id = $1`, [published])
    const refusedHidden = await failure(pool.query('delete from content.places where id = $1', [published]))

    expect(deleted.rowCount).toBe(1)
    expect(refusedPublished).toMatchObject({ code: '23001' })
    expect(refusedPublished.message).toContain('cannot be deleted; hide it instead')
    expect(refusedHidden).toMatchObject({ code: '23001' })
    expect(refusedHidden.message).toContain('cannot be deleted; hide it instead')
    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'hidden'`, [published])).toBe(1)
  })

  it('[E2.5][AC79] [E2.11][AC79] a published place cannot clear first_published_at and then be deleted', async () => {
    const store = randomUUID()
    const place = await newPlace(store)
    const first = await publishPlace(place, JSON.stringify({ en: slugOf('pier') }), '{"name":{"en":"Pier"}}')

    const cleared = await failure(pool.query(`update content.places set status = 'draft', first_published_at = NULL where id = $1`, [place]))
    const moved = await failure(pool.query(`update content.places set first_published_at = now() + interval '1 day' where id = $1`, [place]))
    const deleted = await failure(pool.query('delete from content.places where id = $1', [place]))

    expect(first.rowCount).toBe(1)
    expect(cleared).toMatchObject({ code: '23001' })
    expect(cleared.message).toContain('column first_published_at')
    expect(moved).toMatchObject({ code: '23001' })
    expect(moved.message).toContain('column first_published_at')
    expect(deleted).toMatchObject({ code: '23001' })
    expect(deleted.message).toContain('cannot be deleted; hide it instead')
    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published' and first_published_at is not null`, [place])).toBe(1)
  })

  it('[E2.5][AC79] [E2.11][AC79] a published story version cannot be deleted, and a draft one can', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await insertPublishedVersion(group, 'en', store, slugOf('story'))
    await newDraftVersion(group, 'de', store)

    const refused = await failure(pool.query(`delete from content.story_versions where group_id = $1 and language = 'en'`, [group]))
    const deleted = await pool.query(`delete from content.story_versions where group_id = $1 and language = 'de'`, [group])

    expect(refused).toMatchObject({ code: '23001' })
    expect(refused.message).toContain('cannot be deleted; hide it instead')
    expect(deleted.rowCount).toBe(1)
  })

  it('[E2.5][AC79] [E2.11][AC79] a published story version keeps its published text', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await insertPublishedVersion(group, 'en', store, slugOf('story'))

    const cleared = await failure(pool.query(`update content.story_versions set published = NULL where group_id = $1 and language = 'en'`, [group]))
    const replaced = await pool.query(`update content.story_versions set published = '{"title":"New","body":{"type":"doc","content":[]}}' where group_id = $1 and language = 'en'`, [group])
    const unpublished = await pool.query(`update content.story_versions set status = 'draft' where group_id = $1 and language = 'en'`, [group])
    const deletedVersion = await failure(pool.query(`delete from content.story_versions where group_id = $1 and language = 'en'`, [group]))
    const deletedGroup = await failure(pool.query('delete from content.story_groups where id = $1', [group]))

    expect(cleared).toMatchObject({ code: '23001' })
    expect(cleared.message).toContain('column published')
    expect(replaced.rowCount).toBe(1)
    expect(unpublished.rowCount).toBe(1)
    expect(deletedVersion).toMatchObject({ code: '23001' })
    expect(deletedGroup).toMatchObject({ code: '23001', constraint: 'story_versions_group_fkey' })
    expect(await count(pool, `select count(*) from content.story_versions where group_id = $1 and status = 'draft' and published->>'title' = 'New'`, [group])).toBe(1)
  })

  // CASCADE, because Postgres refuses a plain TRUNCATE of a referenced table before any trigger runs.
  // A cascade from places also reaches story_versions, so the message may name either table.
  it.each(['places', 'story_versions', 'media_refs'])('[E2.5][AC79] [E2.11][AC79] TRUNCATE ... CASCADE on content.%s is refused by the trigger', async (table) => {
    const refused = await failure(pool.query(`truncate content.${table} cascade`))

    expect(refused).toMatchObject({ code: '23000' })
    expect(refused.message).toMatch(/TRUNCATE on content\.\w+ is refused/)
  })

  it('[E2.5] a group with versions cannot be deleted', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await newDraftVersion(group, 'en', store)

    const refused = await failure(pool.query('delete from content.story_groups where id = $1', [group]))

    expect(refused).toMatchObject({ code: '23001', constraint: 'story_versions_group_fkey' })
  })

  it('[E2.5] a used media row cannot be retired, and an unused one can', async () => {
    const store = randomUUID()
    const media: string[] = []
    for (const key of ['used', 'free']) {
      const { rows } = await pool.query<{ id: string }>(
        `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
         values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), 'ready') returning id`,
        [store, `${store}/${key}.jpg`],
      )
      media.push(rows[0]!.id)
    }
    const [used, free] = media as [string, string]
    const group = await newGroup(store)
    await newDraftVersion(group, 'en', store)
    await pool.query(
      `insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot) values ($1, $2, 'story_version', $3, 'en', 'draft')`,
      [store, used, group],
    )

    const refused = await failure(pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [used]))
    const retired = await pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [free])

    expect(refused).toMatchObject({ code: '23001' })
    expect(refused.message).toContain('is still used and cannot be retired')
    expect(retired.rowCount).toBe(1)
  })

  it('[E2.5] place_story_links lists the main story at rank 0 and a linked or reviewed story at rank 1', async () => {
    const store = randomUUID()
    const place = await newPlace(store)
    const [main, mention, review] = [await newGroup(store), await newGroup(store), randomUUID()] as [string, string, string]
    await pool.query('update content.places set main_story_group_id = $2 where id = $1', [place, main])
    await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, 1)', [mention, place, store])
    await pool.query(
      `insert into content.story_groups (id, store_id, kind, subject_place_id) values ($1, $2, 'editorial_review', $3)`,
      [review, store, place],
    )

    const { rows } = await pool.query<{ group_id: string, rank: number }>('select group_id, rank from content.place_story_links where place_id = $1 order by rank, group_id', [place])

    expect(rows).toEqual([
      { group_id: main, rank: 0 },
      ...[mention, review].sort().map(group_id => ({ group_id, rank: 1 })),
    ])
  })

  it('[E2.5] place_story_links lists a main story that is also linked on the place once, at rank 0', async () => {
    const store = randomUUID()
    const place = await newPlace(store)
    const group = await newGroup(store)
    await pool.query('update content.places set main_story_group_id = $2 where id = $1', [place, group])
    await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, 1)', [group, place, store])

    const { rows } = await pool.query<{ group_id: string, rank: number }>('select group_id, rank from content.place_story_links where place_id = $1', [place])

    expect(rows).toEqual([{ group_id: group, rank: 0 }])
  })
})
