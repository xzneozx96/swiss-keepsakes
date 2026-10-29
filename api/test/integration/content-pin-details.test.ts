import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createContentHttp } from './content-http.ts'
import { count, openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const { pool, db } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

const env = createContentHttp({ pool, db })

const slugFor = () => `pin-${randomUUID().slice(0, 8)}`
const located = { latitude: 47.0502, longitude: 8.3093 }

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

async function image(storeId: string, status: 'processing' | 'ready' = 'ready'): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status, width, height)
     values ($1, 'image', $2, 'image/jpeg', 10, repeat('a', 64), $3, 10, 10) returning id`,
    [storeId, `${storeId}/${randomUUID()}`, status],
  )
  return rows[0]!.id
}

async function pdf(storeId: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
     values ($1, 'pdf', $2, 'application/pdf', 10, repeat('a', 64), 'ready') returning id`,
    [storeId, `${storeId}/${randomUUID()}`],
  )
  return rows[0]!.id
}

type Staff = Awaited<ReturnType<typeof env.storeWithStaff>>

async function create(staff: Staff, body: object) {
  const response = await env.call(staff.pins, { method: 'POST', headers: staff.owner.headers, body })
  expect(response.status).toBe(201)
  return await response.json() as { id: string, rowVersion: number, photos: { mediaId: string, alt: object }[], outboundUrl: string | null, draft: { localTip: object } | null }
}

const patch = (staff: Staff, id: string, version: number, body: object) =>
  env.call(`${staff.pins}/${id}`, { method: 'PATCH', headers: { ...staff.owner.headers, 'If-Match': String(version) }, body })

describe('[E4.2][AC41] migration 0010: five interests in the database', () => {
  it.each(['{local-activities}', '{history-culture,food-drink,lake-mountains,shopping-keepsakes,local-activities}'])('[E4.2][AC41] valid_interests accepts %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(true)
  })

  it.each(['{free-useful}', '{sport}'])('[E4.2][AC41] valid_interests still refuses %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(false)
  })

  it('[E4.2][AC41] a pin, a story group and a tour take local-activities, and another code is refused by the table CHECK', async () => {
    const store = randomUUID()

    await pool.query(`insert into content.places (store_id, interests) values ($1, '{local-activities}')`, [store])
    await pool.query(`insert into content.story_groups (store_id, kind, interests) values ($1, 'story', '{local-activities}')`, [store])
    expect((await failure(pool.query(`insert into content.places (store_id, interests) values ($1, '{nightlife}')`, [store]))).constraint).toBe('places_interests_check')
    expect((await failure(pool.query(`insert into content.story_groups (store_id, kind, interests) values ($1, 'story', '{nightlife}')`, [store]))).constraint).toBe('story_groups_interests_check')
  })
})

describe('[E4.2][AC68] migration 0010: the pin columns and the photo table', () => {
  it.each([
    ['service_type', 'toilets', 'wifi', 'places_service_type_check'],
    ['food_kind', 'cafe-bakery', 'cafe', 'places_food_kind_check'],
  ])('[E4.2][AC68] %s takes its codes and refuses %s', async (column, good, bad, constraint) => {
    const store = randomUUID()

    await pool.query(`insert into content.places (store_id, ${column}) values ($1, $2)`, [store, good])
    expect((await failure(pool.query(`insert into content.places (store_id, ${column}) values ($1, $2)`, [store, bad]))).constraint).toBe(constraint)
    expect(await count(pool, `select count(*) from content.places where store_id = $1 and ${column} is null`, [store])).toBe(0)
  })

  it('[E4.2][AC68] must_visit defaults to false and the old free flag does not exist', async () => {
    const store = randomUUID()
    const { rows } = await pool.query<{ must_visit: boolean, service_type: string | null, food_kind: string | null }>('insert into content.places (store_id) values ($1) returning must_visit, service_type, food_kind', [store])

    expect(rows[0]).toEqual({ must_visit: false, service_type: null, food_kind: null })
    expect(await count(pool, `select count(*) from information_schema.columns where table_schema = 'content' and table_name = 'places' and column_name = 'free'`)).toBe(0)
  })

  it.each([
    ['{"en":"The bridge","de":"Die Brücke"}', true],
    ['{}', true],
    ['{"en":""}', false],
    ['{"en":"   "}', false],
    ['{"fr":"Le pont"}', false],
    ['{"en":5}', false],
    ['[]', false],
  ])('[E4.2][AC68] valid_alt_text(%s) is %s', async (value, expected) => {
    const { rows } = await pool.query<{ ok: boolean }>('select content.valid_alt_text($1::jsonb) as ok', [value])

    expect(rows[0]?.ok).toBe(expected)
  })

  it('[E4.2][AC68] extra photos: one position per pin, one row per photo, positions 1 to 10, the media must be an image of the same store', async () => {
    const store = randomUUID()
    const pin = (await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])).rows[0]!.id
    const [a, b] = [await image(store), await image(store)]
    const add = (position: number, media: string, alt = '{}') =>
      pool.query('insert into content.place_photos (place_id, store_id, position, media_id, alt) values ($1, $2, $3, $4, $5::jsonb)', [pin, store, position, media, alt])

    await add(1, a, '{"en":"First"}')
    await add(2, b)
    expect((await failure(add(2, await image(store)))).constraint).toBe('place_photos_pkey')
    expect((await failure(add(3, a))).constraint).toBe('place_photos_media_key')
    expect((await failure(add(0, await image(store)))).constraint).toBe('place_photos_position_check')
    expect((await failure(add(11, await image(store)))).constraint).toBe('place_photos_position_check')
    expect((await failure(add(3, await image(store), '{"en":""}'))).constraint).toBe('place_photos_alt_check')
    expect((await failure(add(3, await pdf(store)))).constraint).toBe('place_photos_media_fkey')
    expect((await failure(add(3, await image(randomUUID())))).constraint).toBe('place_photos_media_fkey')
  })

  it('[E4.2][AC68] a media file that a pin uses as an extra photo cannot be retired, and photos go with a deleted draft pin', async () => {
    const store = randomUUID()
    const pin = (await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])).rows[0]!.id
    const media = await image(store)
    await pool.query('insert into content.place_photos (place_id, store_id, position, media_id) values ($1, $2, 1, $3)', [pin, store, media])

    const refused = await failure(pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [media]))
    expect(refused.code).toBe('23001')

    await pool.query('delete from content.places where id = $1', [pin])
    expect(await count(pool, 'select count(*) from content.place_photos where place_id = $1', [pin])).toBe(0)
    await pool.query(`update content.media set status = 'retired', retired_at = now() where id = $1`, [media])
  })

  it('[E4.2][AC63] the outbound link must be https with no space, at most 2000 characters', async () => {
    const store = randomUUID()
    const pin = (await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])).rows[0]!.id
    const link = (url: string) => pool.query('insert into content.place_links (place_id, store_id, url) values ($1, $2, $3) on conflict (place_id) do update set url = excluded.url', [pin, store, url])

    await link('https://hotel.example/stay')
    expect((await failure(link('http://hotel.example'))).constraint).toBe('place_links_url_check')
    expect((await failure(link('https://hotel.example/a b'))).constraint).toBe('place_links_url_shape_check')
    expect((await failure(link(`https://a.example/${'x'.repeat(2000)}`))).constraint).toBe('place_links_url_shape_check')
  })
})

describe('[E4.2][AC68] the pin routes with the new fields, over the real app and database', () => {
  it('[E4.2][AC68] create with every home field, then read it back through the list and the read route', async () => {
    const staff = await env.storeWithStaff()
    const cover = await image(staff.storeId)
    const extra = await image(staff.storeId)

    const pin = await create(staff, {
      title: { en: 'Tap on Weinmarkt', de: 'Brunnen am Weinmarkt' },
      tip: { en: 'Drinking water' },
      localTip: { en: 'Bring a bottle', de: 'Flasche mitbringen' },
      ...located,
      slug: { en: slugFor(), de: slugFor() },
      serviceType: 'water',
      mustVisit: true,
      foodKind: 'market',
      interests: ['local-activities', 'food-drink'],
      coverMediaId: cover,
      coverAlt: { en: 'The fountain', de: 'Der Brunnen' },
      photos: [{ mediaId: extra, alt: { en: 'Close up' } }],
      outboundUrl: 'https://www.luzern.com/fountain',
    })

    const read = await env.call(`${staff.pins}/${pin.id}`, { headers: staff.owner.headers })
    expect(read.status).toBe(200)
    expect(read.headers.get('ETag')).toBe('"1"')
    expect(await read.json()).toMatchObject({
      id: pin.id,
      storeId: staff.storeId,
      serviceType: 'water',
      mustVisit: true,
      foodKind: 'market',
      interests: ['local-activities', 'food-drink'],
      coverMediaId: cover,
      coverAlt: { en: 'The fountain', de: 'Der Brunnen' },
      photos: [{ mediaId: extra, alt: { en: 'Close up' } }],
      outboundUrl: 'https://www.luzern.com/fountain',
      draft: { title: { en: 'Tap on Weinmarkt', de: 'Brunnen am Weinmarkt' }, localTip: { en: 'Bring a bottle', de: 'Flasche mitbringen' } },
    })

    const list = await env.call(staff.pins, { headers: staff.owner.headers })
    expect(list.status).toBe(200)
    expect(await list.json()).toMatchObject({ items: [{ id: pin.id, status: 'draft', title: { en: 'Tap on Weinmarkt' }, located: true, hasDates: false, nextDate: null, interests: ['local-activities', 'food-drink'], coverMediaId: cover, mainStory: null, hasPendingChanges: false }] })
  })

  it('[E4.2][AC41] five codes are accepted over HTTP, another code answers 400 and writes nothing', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'Market' } })

    const good = await patch(staff, pin.id, 1, { interests: ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities'] })
    expect(good.status).toBe(200)
    const bad = await patch(staff, pin.id, 2, { interests: ['nightlife'] })
    expect(bad.status).toBe(400)
    expect(await count(pool, `select count(*) from content.places where id = $1 and interests = '{history-culture,food-drink,lake-mountains,shopping-keepsakes,local-activities}'`, [pin.id])).toBe(1)
  })

  it('[E4.2][AC63] changing the outbound link changes what the pin shows, once, and removing it clears it', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'Hotel Schweizerhof' }, outboundUrl: 'https://hotel.example/a' })

    const changed = await patch(staff, pin.id, 1, { outboundUrl: 'https://partner.example/b' })
    expect(await changed.json()).toMatchObject({ outboundUrl: 'https://partner.example/b' })
    expect(await count(pool, 'select count(*) from content.place_links where place_id = $1', [pin.id])).toBe(1)
    const read = await env.call(`${staff.pins}/${pin.id}`, { headers: staff.owner.headers })
    expect(await read.json()).toMatchObject({ outboundUrl: 'https://partner.example/b' })

    for (const url of ['http://insecure.example', 'https://a b.example', 'javascript:alert(1)'])
      expect((await patch(staff, pin.id, 2, { outboundUrl: url })).status).toBe(400)

    const removed = await patch(staff, pin.id, 2, { outboundUrl: null })
    expect(await removed.json()).toMatchObject({ outboundUrl: null })
    expect(await count(pool, 'select count(*) from content.place_links where place_id = $1', [pin.id])).toBe(0)
  })

  it('[E4.2][AC68] extra photos keep the order the merchant sets, with alt text, and refuse an image of another store or a PDF', async () => {
    const staff = await env.storeWithStaff()
    const [a, b, c] = [await image(staff.storeId), await image(staff.storeId), await image(staff.storeId)]
    const pin = await create(staff, { title: { en: 'Chapel Bridge' }, photos: [{ mediaId: a, alt: { en: 'A' } }, { mediaId: b, alt: { en: 'B' } }, { mediaId: c, alt: { de: 'C' } }] })
    expect(pin.photos.map(p => p.mediaId)).toEqual([a, b, c])

    const moved = await patch(staff, pin.id, 1, { photos: [{ mediaId: c, alt: { de: 'C' } }, { mediaId: a, alt: { en: 'A' } }, { mediaId: b, alt: { en: 'B' } }] })
    expect(moved.status).toBe(200)
    expect(await moved.json()).toMatchObject({ photos: [{ mediaId: c, alt: { de: 'C' } }, { mediaId: a }, { mediaId: b }] })

    expect((await patch(staff, pin.id, 2, { photos: [{ mediaId: await image(randomUUID()) }] })).status).toBe(422)
    expect((await patch(staff, pin.id, 2, { photos: [{ mediaId: await pdf(staff.storeId) }] })).status).toBe(422)
    expect((await patch(staff, pin.id, 2, { photos: [{ mediaId: a }, { mediaId: a }] })).status).toBe(400)

    const cleared = await patch(staff, pin.id, 2, { photos: [] })
    expect(await cleared.json()).toMatchObject({ photos: [] })
    // The files are still there to use again.
    expect(await count(pool, 'select count(*) from content.media where id = any($1::uuid[])', [[a, b, c]])).toBe(3)
  })

  it('[E4.2][AC68] an unknown service type, food kind or flag type answers 400', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'X' } })

    for (const body of [{ serviceType: 'wifi' }, { foodKind: 'bakery' }, { mustVisit: 'yes' }, { free: true }])
      expect((await patch(staff, pin.id, 1, body)).status).toBe(400)
  })

  it('[E4.2][AC68] the local tip goes live on publish with the title, and a later edit stays a draft', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'Chapel Bridge' }, localTip: { en: 'Go at sunrise' }, ...located, slug: { en: slugFor() } })

    const published = await env.call(`${staff.pins}/${pin.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })
    expect(published.status).toBe(200)
    expect(await published.json()).toMatchObject({ status: 'published', draft: null, published: { localTip: { en: 'Go at sunrise' } } })

    const edited = await patch(staff, pin.id, 2, { localTip: { en: 'Go at sunrise, bring a coat' } })
    expect(await edited.json()).toMatchObject({ published: { localTip: { en: 'Go at sunrise' } }, draft: { title: { en: 'Chapel Bridge' }, localTip: { en: 'Go at sunrise, bring a coat' } } })
    const list = await (await env.call(staff.pins, { headers: staff.owner.headers })).json() as { items: { status: string, hasPendingChanges: boolean }[] }
    expect(list.items[0]).toMatchObject({ status: 'published', hasPendingChanges: true })
  })

  it('[E4.2][AC85] a pin with no story and no category publishes and lists with no main story', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { de: 'Löwendenkmal' }, ...located, slug: { de: slugFor() } })

    const published = await env.call(`${staff.pins}/${pin.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    expect(published.status).toBe(200)
    expect(await published.json()).toMatchObject({ status: 'published', mainStoryGroupId: null, categoryIds: [] })
    expect(await (await env.call(staff.pins, { headers: staff.owner.headers })).json()).toMatchObject({ items: [{ status: 'published', mainStory: null, categoryIds: [] }] })
  })

  it.each([
    ['no location', { title: { en: 'A' } }, 'location'],
    ['no slug', { title: { en: 'A' }, ...located }, 'slug'],
    ['no title', { ...located, slug: { en: 'x' } }, 'title'],
  ])('[E4.2][AC68] publish with %s is refused and names the gap', async (_what, body, gap) => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, body)

    const response = await env.call(`${staff.pins}/${pin.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })

    expect(response.status).toBe(422)
    expect(JSON.stringify(await response.json())).toContain(gap)
  })

  it('[E4.2][AC86] a published pin with only past dates lists as ended, one with a date ahead lists as published with its next date', async () => {
    const staff = await env.storeWithStaff()
    const past = await create(staff, { title: { en: 'Old fair' }, ...located, slug: { en: slugFor() }, dates: [{ firstDay: '2026-01-01', lastDay: '2026-01-03' }] })
    const ahead = await create(staff, { title: { en: 'Blues festival' }, ...located, slug: { en: slugFor() }, dates: [{ firstDay: '2090-11-09', lastDay: '2090-11-14' }] })
    for (const pin of [past, ahead])
      expect((await env.call(`${staff.pins}/${pin.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })).status).toBe(200)

    const list = await (await env.call(staff.pins, { headers: staff.owner.headers })).json() as { items: { id: string, status: string, nextDate: object | null, hasDates: boolean }[] }

    expect(list.items.find(i => i.id === past.id)).toMatchObject({ status: 'ended', hasDates: true, nextDate: null })
    expect(list.items.find(i => i.id === ahead.id)).toMatchObject({ status: 'published', hasDates: true, nextDate: { firstDay: '2090-11-09', lastDay: '2090-11-14' } })
  })

  it('[E4.2][AC86] a date entry from 22:00 to 00:30 answers 400, and the database refuses it too', async () => {
    const staff = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'Club night' } })

    expect((await patch(staff, pin.id, 1, { dates: [{ firstDay: '2026-11-14', lastDay: '2026-11-14', startTime: '22:00', endTime: '00:30' }] })).status).toBe(400)
    expect((await failure(pool.query(`insert into content.place_dates (place_id, store_id, first_day, last_day, start_time, end_time) values ($1, $2, '2026-11-14', '2026-11-14', '22:00', '00:30')`, [pin.id, staff.storeId]))).constraint).toBe('place_dates_end_after_start_check')
  })

  it('[E4.2][AC79] a draft is deleted, a published pin is refused and can be hidden, then shown again', async () => {
    const staff = await env.storeWithStaff()
    const draft = await create(staff, { title: { en: 'Draft' } })
    const live = await create(staff, { title: { en: 'Live' }, ...located, slug: { en: slugFor() } })

    expect((await env.call(`${staff.pins}/${draft.id}`, { method: 'DELETE', headers: { ...staff.owner.headers, 'If-Match': '1' } })).status).toBe(204)
    expect((await env.call(`${staff.pins}/${live.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '1' } })).status).toBe(200)
    const refused = await env.call(`${staff.pins}/${live.id}`, { method: 'DELETE', headers: { ...staff.owner.headers, 'If-Match': '2' } })
    expect(refused.status).toBe(409)
    expect(await count(pool, 'select count(*) from content.places where id = $1', [live.id])).toBe(1)

    const hidden = await env.call(`${staff.pins}/${live.id}/hide`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '2' } })
    expect(await hidden.json()).toMatchObject({ status: 'hidden' })
    const shown = await env.call(`${staff.pins}/${live.id}/publish`, { method: 'POST', headers: { ...staff.owner.headers, 'If-Match': '3' } })
    expect(await shown.json()).toMatchObject({ status: 'published' })
  })

  it('[E4.2][AC68] a member of another store gets 403 on every read, and a pin of another store is 404 for its own members', async () => {
    const staff = await env.storeWithStaff()
    const other = await env.storeWithStaff()
    const pin = await create(staff, { title: { en: 'Mine' } })

    expect((await env.call(staff.pins, { headers: other.owner.headers })).status).toBe(403)
    expect((await env.call(`${staff.pins}/${pin.id}`, { headers: other.owner.headers })).status).toBe(403)
    expect((await env.call(`${staff.pins}/story-options`, { headers: other.owner.headers })).status).toBe(403)
    expect((await env.call(`${other.pins}/${pin.id}`, { headers: other.owner.headers })).status).toBe(404)
    expect(await (await env.call(other.pins, { headers: other.owner.headers })).json()).toEqual({ items: [] })
    expect((await env.call(`${staff.pins}/not-a-uuid`, { headers: staff.owner.headers })).status).toBe(400)
    expect((await env.call(staff.pins, {})).status).toBe(401)
  })

  it('[E4.2][AC68] the main story picker lists the story groups of the store with their live languages, and a pin can name one', async () => {
    const staff = await env.storeWithStaff()
    const other = await env.storeWithStaff()
    const group = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [staff.storeId])).rows[0]!.id
    await pool.query(`insert into content.story_groups (store_id, kind) values ($1, 'story')`, [other.storeId])
    await pool.query(`insert into content.story_versions (group_id, language, store_id, status, slug, published, published_at, draft) values ($1, 'en', $2, 'published', $3, '{"title":"The bridge","body":{"type":"doc","content":[]}}', now(), null)`, [group, staff.storeId, slugFor()])
    await pool.query(`insert into content.story_versions (group_id, language, store_id, status, draft) values ($1, 'de', $2, 'draft', '{"title":"Die Brücke"}')`, [group, staff.storeId])

    const options = await env.call(`${staff.pins}/story-options`, { headers: staff.owner.headers })
    expect(options.status).toBe(200)
    expect(await options.json()).toEqual({ items: [{ groupId: group, kind: 'story', title: { en: 'The bridge', de: 'Die Brücke' }, publishedLanguages: ['en'] }] })

    const pin = await create(staff, { title: { en: 'Chapel Bridge' }, mainStoryGroupId: group })
    expect(await (await env.call(staff.pins, { headers: staff.owner.headers })).json()).toMatchObject({ items: [{ id: pin.id, mainStory: { groupId: group, published: true } }] })

    // A group with only a draft version has nothing live: the list warns about it.
    const unpublished = (await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [staff.storeId])).rows[0]!.id
    await pool.query(`insert into content.story_versions (group_id, language, store_id, status, draft) values ($1, 'en', $2, 'draft', '{"title":"Not live"}')`, [unpublished, staff.storeId])
    const warned = await create(staff, { title: { en: 'Lion Monument' }, mainStoryGroupId: unpublished })
    const list = await (await env.call(staff.pins, { headers: staff.owner.headers })).json() as { items: { id: string, mainStory: object | null }[] }
    expect(list.items.find(item => item.id === warned.id)?.mainStory).toEqual({ groupId: unpublished, published: false })
  })
})
