import type { PoolClient } from 'pg'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

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

interface PgFailure { code?: string, constraint?: string }

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

async function newPlace(store: string, type: string, slug: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id, type, slug) values ($1, $2, $3) returning id', [store, type, slug])
  return rows[0]!.id
}

function insertVersion(group: string, language: string, store: string, slug: string) {
  return pool.query(
    `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
     values ($1, $2, $3, 'published', $4, now(), '{"title":"T","sections":[]}')`,
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
    const slug = `old-town-${randomUUID().slice(0, 8)}`
    const [g1, g2] = [await newGroup(store), await newGroup(store)] as [string, string]
    await insertVersion(g1, 'en', store, slug)

    const clash = await failure(insertVersion(g2, 'en', store, slug))
    await insertVersion(g2, 'de', store, slug)

    expect(clash).toMatchObject({ code: '23505', constraint: 'story_versions_language_slug_key' })
    expect(await count(pool, 'select count(*) from content.story_versions where store_id = $1', [store])).toBe(2)
  })

  it('[E2.5][ADR-014] a place slug is unique per language', async () => {
    const store = randomUUID()
    const word = `x${randomUUID().replaceAll('-', '').slice(0, 10)}`
    await newPlace(store, 'sight', JSON.stringify({ en: word }))

    const clash = await failure(newPlace(store, 'sight', JSON.stringify({ en: word })))
    await newPlace(store, 'sight', JSON.stringify({ de: word }))

    expect(clash).toMatchObject({ code: '23505', constraint: 'places_slug_en_key' })
    expect(await count(pool, 'select count(*) from content.places where store_id = $1', [store])).toBe(2)
  })

  it('[E2.5] a practical place cannot name a main story', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    const place = await newPlace(store, 'practical')

    const refused = await failure(pool.query('update content.places set main_story_group_id = $2 where id = $1', [place, group]))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_practical_no_story_check' })
  })

  it('[E2.5] a published place with an {"en": null} slug is refused', async () => {
    const place = await newPlace(randomUUID(), 'practical')

    const refused = await failure(publishPlace(place, '{"en":null}', '{"name":{"en":"A"}}'))

    // two checks refuse this slug; Postgres reports the first one it evaluates (alphabetical)
    expect(refused.code).toBe('23514')
    expect(['places_published_fields_check', 'places_slug_shape_check']).toContain(refused.constraint)
  })

  it('[E2.5] a published place without a latitude is refused by the published-fields check', async () => {
    const place = await newPlace(randomUUID(), 'practical')

    const refused = await failure(pool.query(
      `update content.places set status = 'published', first_published_at = now(), slug = $2, longitude = 8.3, published = '{"name":{"en":"A"}}' where id = $1`,
      [place, JSON.stringify({ en: `pier-${randomUUID().slice(0, 8)}` })],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.5] a published place with a NULL published document is refused (the IS TRUE path)', async () => {
    const place = await newPlace(randomUUID(), 'practical')

    const refused = await failure(pool.query(
      `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = 8.3, published = NULL where id = $1`,
      [place, JSON.stringify({ en: `pier-${randomUUID().slice(0, 8)}` })],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.5] a published story version with a NULL published document is refused (the IS TRUE path)', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), NULL)`,
      [group, store, `lion-${randomUUID().slice(0, 8)}`],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
  })

  it('[E2.5] a published place whose name and slug languages differ is refused', async () => {
    const store = randomUUID()
    const place = await newPlace(store, 'practical')

    const refused = await failure(publishPlace(place, '{"en":"a","de":"b"}', '{"name":{"en":"A"}}'))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_published_fields_check' })
  })

  it('[E2.5] a practical place publishes with matching slug and name languages', async () => {
    const store = randomUUID()
    const place = await newPlace(store, 'practical')

    await publishPlace(place, JSON.stringify({ en: `pier-${randomUUID().slice(0, 8)}` }), '{"name":{"en":"A"}}')

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
  })

  it('[E2.5] a published story version without sections is refused', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(
      `insert into content.story_versions (group_id, language, store_id, status, slug, published_at, published)
       values ($1, 'en', $2, 'published', $3, now(), '{"title":"T"}')`,
      [group, store, `lion-${randomUUID().slice(0, 8)}`],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_published_fields_check' })
  })

  it('[E2.5] a story version language other than en or de is refused', async () => {
    const store = randomUUID()
    const group = await newGroup(store)

    const refused = await failure(pool.query(`insert into content.story_versions (group_id, language, store_id) values ($1, 'fr', $2)`, [group, store]))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_language_check' })
  })

  it('[E2.5] an editorial review of a practical place is refused', async () => {
    const store = randomUUID()
    const place = await newPlace(store, 'practical')

    const refused = await failure(pool.query(
      `insert into content.story_groups (store_id, kind, subject_place_id, subject_place_type) values ($1, 'editorial_review', $2, 'practical')`,
      [store, place],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_groups_subject_type_check' })
  })

  it('[E2.5] an editorial review whose subject type does not match the place is refused at commit', async () => {
    const store = randomUUID()
    const place = await newPlace(store, 'sight')

    const refused = await failure(pool.query(
      `insert into content.story_groups (store_id, kind, subject_place_id, subject_place_type) values ($1, 'editorial_review', $2, 'restaurant')`,
      [store, place],
    ))

    expect(refused).toMatchObject({ code: '23503', constraint: 'story_groups_subject_type_fkey' })
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

  it('[E2.5] the content views and every content table exist', async () => {
    const { rows } = await pool.query<{ relname: string }>(`select relname from pg_class where relnamespace = 'content'::regnamespace and relkind in ('r', 'v') order by relname`)

    expect(rows.map(row => row.relname)).toEqual([
      'media',
      'media_refs',
      'place_links',
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
    ])
  })
})

async function inTransaction(work: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await pool.connect()
  let failed: Error | undefined
  try {
    await client.query('begin')
    await work(client)
    await client.query('commit')
  }
  catch (error) {
    failed = error as Error
    await client.query('rollback').catch(() => undefined)
    throw error
  }
  finally {
    client.release(failed)
  }
}

function slugOf(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

async function newDraftVersion(group: string, language: string, store: string): Promise<void> {
  await pool.query('insert into content.story_versions (group_id, language, store_id) values ($1, $2, $3)', [group, language, store])
}

function publishVersion(client: Pick<PoolClient, 'query'>, group: string, language: string) {
  return client.query(
    `update content.story_versions set status = 'published', slug = $3, published_at = now(), published = '{"title":"T","sections":[]}' where group_id = $1 and language = $2`,
    [group, language, slugOf('story')],
  )
}

function publishSight(client: Pick<PoolClient, 'query'>, place: string, group: string) {
  return client.query(
    `update content.places set status = 'published', first_published_at = now(), main_story_group_id = $2, slug = $3, latitude = 47.05, longitude = 8.3, published = '{"name":{"en":"Old Town"}}' where id = $1`,
    [place, group, JSON.stringify({ en: slugOf('sight') })],
  )
}

// A sight published on a group whose English version is published.
async function publishedPin(store: string): Promise<{ group: string, place: string }> {
  const group = await newGroup(store)
  await insertVersion(group, 'en', store, slugOf('story'))
  const place = await newPlace(store, 'sight')
  await publishSight(pool, place, group)
  return { group, place }
}

describe('[E2.5] content rules', () => {
  it('[E2.5][AC43] a story place cannot publish without a published main story, and a practical place can', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await newDraftVersion(group, 'en', store)
    const sight = await newPlace(store, 'sight')

    const refused = await failure(inTransaction(async (client) => {
      await publishSight(client, sight, group)
    }))
    await inTransaction(async (client) => {
      // sight first, version second: only a deferred check accepts this order
      await publishSight(client, sight, group)
      await publishVersion(client, group, 'en')
    })
    const practical = await newPlace(store, 'practical')
    await publishPlace(practical, JSON.stringify({ en: slugOf('toilets') }), '{"name":{"en":"Toilets"}}')

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_pin_has_published_story' })
    expect(await count(pool, `select count(*) from content.places where store_id = $1 and status = 'published'`, [store])).toBe(2)
  })

  it('[E2.5][AC43] a place may publish on a version published earlier', async () => {
    const store = randomUUID()
    const { place } = await publishedPin(store)

    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
  })

  it('[E2.5][AC68] a place type cannot change after creation', async () => {
    const place = await newPlace(randomUUID(), 'sight')

    const refused = await failure(pool.query(`update content.places set type = 'practical' where id = $1`, [place]))

    expect(refused).toMatchObject({ code: '23001' })
    expect((refused as Error).message).toContain('cannot change after it is created')
  })

  it('[E2.5][AC79] a published place can be hidden and cannot be deleted, and a draft can be deleted', async () => {
    const store = randomUUID()
    const draft = await newPlace(store, 'sight')
    const published = await newPlace(store, 'practical')
    await publishPlace(published, JSON.stringify({ en: slugOf('pier') }), '{"name":{"en":"Pier"}}')

    const deleted = await pool.query('delete from content.places where id = $1', [draft])
    const refusedPublished = await failure(pool.query('delete from content.places where id = $1', [published]))
    await pool.query(`update content.places set status = 'hidden' where id = $1`, [published])
    const refusedHidden = await failure(pool.query('delete from content.places where id = $1', [published]))

    expect(deleted.rowCount).toBe(1)
    expect(refusedPublished).toMatchObject({ code: '23001' })
    expect((refusedPublished as Error).message).toContain('cannot be deleted; hide it instead')
    expect(refusedHidden).toMatchObject({ code: '23001' })
    expect((refusedHidden as Error).message).toContain('cannot be deleted; hide it instead')
    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'hidden'`, [published])).toBe(1)
  })

  it('[E2.5] a published story version cannot be deleted, and a draft one can', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await insertVersion(group, 'en', store, slugOf('story'))
    await newDraftVersion(group, 'de', store)

    const refused = await failure(pool.query(`delete from content.story_versions where group_id = $1 and language = 'en'`, [group]))
    const deleted = await pool.query(`delete from content.story_versions where group_id = $1 and language = 'de'`, [group])

    expect(refused).toMatchObject({ code: '23001' })
    expect((refused as Error).message).toContain('cannot be deleted; hide it instead')
    expect(deleted.rowCount).toBe(1)
  })

  it('[E2.5] a group with versions cannot be deleted', async () => {
    const store = randomUUID()
    const group = await newGroup(store)
    await newDraftVersion(group, 'en', store)

    const refused = await failure(pool.query('delete from content.story_groups where id = $1', [group]))

    expect(refused).toMatchObject({ code: '23001', constraint: 'story_versions_group_fkey' })
  })

  it('[E2.5][AC43] the last published version of a pin story cannot be unpublished while a published pin uses it', async () => {
    const store = randomUUID()
    const { group } = await publishedPin(store)

    const refused = await failure(inTransaction(async (client) => {
      await client.query(`update content.story_versions set status = 'draft' where group_id = $1 and language = 'en'`, [group])
    }))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_keep_pin_story' })
    expect(await count(pool, `select count(*) from content.story_versions where group_id = $1 and status = 'published'`, [group])).toBe(1)
  })

  it('[E2.5][AC43] the last published version of a pin story cannot move to another group', async () => {
    const store = randomUUID()
    const { group } = await publishedPin(store)
    const other = await newGroup(store)

    const refused = await failure(inTransaction(async (client) => {
      await client.query(`update content.story_versions set group_id = $2 where group_id = $1 and language = 'en'`, [group, other])
    }))

    expect(refused).toMatchObject({ code: '23514', constraint: 'story_versions_keep_pin_story' })
  })

  it('[E2.5][AC43] a pin story may drop a version when a second one is published in the same transaction', async () => {
    const store = randomUUID()
    const { group } = await publishedPin(store)
    await newDraftVersion(group, 'de', store)

    await inTransaction(async (client) => {
      // unpublish first, publish second: only a deferred check accepts this order
      await client.query(`update content.story_versions set status = 'draft' where group_id = $1 and language = 'en'`, [group])
      await publishVersion(client, group, 'de')
    })

    expect(await count(pool, `select count(*) from content.story_versions where group_id = $1 and status = 'published' and language = 'de'`, [group])).toBe(1)
  })

  it('[E2.5][AC43] a pin story may drop its last version once the place is hidden', async () => {
    const store = randomUUID()
    const { group, place } = await publishedPin(store)

    await inTransaction(async (client) => {
      // unpublish first, hide second: only a deferred check accepts this order
      await client.query(`update content.story_versions set status = 'draft' where group_id = $1 and language = 'en'`, [group])
      await client.query(`update content.places set status = 'hidden' where id = $1`, [place])
    })

    expect(await count(pool, `select count(*) from content.story_versions where group_id = $1 and status = 'published'`, [group])).toBe(0)
  })

  it('[E2.5] reject_delete refuses deleting the last published version of a pin story', async () => {
    const store = randomUUID()
    const { group } = await publishedPin(store)

    const refused = await failure(pool.query(`delete from content.story_versions where group_id = $1 and language = 'en'`, [group]))

    expect(refused).toMatchObject({ code: '23001' })
    expect((refused as Error).message).toContain('cannot be deleted; hide it instead')
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
    expect((refused as Error).message).toContain('is still used and cannot be retired')
    expect(retired.rowCount).toBe(1)
  })

  it('[E2.5] place_story_links lists the main story at rank 0 and a linked or reviewed story at rank 1', async () => {
    const store = randomUUID()
    const place = await newPlace(store, 'sight')
    const [main, mention, review] = [await newGroup(store), await newGroup(store), randomUUID()] as [string, string, string]
    await pool.query('update content.places set main_story_group_id = $2 where id = $1', [place, main])
    await pool.query('insert into content.story_group_places (group_id, place_id, store_id, position) values ($1, $2, $3, 1)', [mention, place, store])
    await pool.query(
      `insert into content.story_groups (id, store_id, kind, subject_place_id, subject_place_type) values ($1, $2, 'editorial_review', $3, 'sight')`,
      [review, store, place],
    )

    const { rows } = await pool.query<{ group_id: string, rank: number }>('select group_id, rank from content.place_story_links where place_id = $1 order by rank, group_id', [place])

    expect(rows).toEqual([
      { group_id: main, rank: 0 },
      ...[mention, review].sort().map(group_id => ({ group_id, rank: 1 })),
    ])
  })
})
