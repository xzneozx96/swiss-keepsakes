import type { MediaItem, MediaList, MediaUses } from '@sk/api-contract'
import { randomUUID } from 'node:crypto'
import { emptyStoryBody, isCurrentObject } from '@sk/domain/content'
import sharp from 'sharp'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createFakeStorage } from '../support/fake-storage.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { createContentHttp } from './content-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 })

const { pool, db } = openTestDatabase()
const clock = createManualClock(new Date())
const storage = createFakeStorage(clock)
const jobs: { queue: string, data: object, startAfter?: Date }[] = []
const env = createContentHttp({ pool, db }, clock, {
  storage,
  clock,
  jobs: { send: async (_tx, queue, data, options) => void jobs.push({ queue, data, startAfter: options?.startAfter }) },
})

afterAll(async () => {
  await pool.end()
})

const slug = () => `m-${randomUUID().slice(0, 8)}`

async function media(store: string, kind: 'image' | 'audio' | 'pdf', name: string, extra: { status?: 'ready' | 'processing' | 'retired', alt?: object, createdAt?: string } = {}): Promise<string> {
  const id = randomUUID()
  const ext = { image: 'jpg', audio: 'mp3', pdf: 'pdf' }[kind]
  const type = { image: 'image/jpeg', audio: 'audio/mpeg', pdf: 'application/pdf' }[kind]
  const status = extra.status ?? 'ready'
  await pool.query(
    `insert into content.media (id, store_id, kind, storage_key, content_type, byte_size, sha256, width, height, status, retired_at, name, file_name, alt, created_at)
     values ($1, $2, $3, $4, $5, 10, repeat('a', 64), $6, $7, $8, $9, $10, $10, $11, coalesce($12::timestamptz, now()))`,
    [id, store, kind, `${store}/${id}/original.${ext}`, type, kind === 'image' && status !== 'processing' ? 1280 : null, kind === 'image' && status !== 'processing' ? 960 : null, status, status === 'retired' ? new Date() : null, name, JSON.stringify(extra.alt ?? {}), extra.createdAt ?? null],
  )
  return id
}

async function story(store: string, versions: { language: 'en' | 'de', status: 'draft' | 'published', title: string, cover: string | null, body?: string[] }[]): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(`insert into content.story_groups (store_id, kind) values ($1, 'story') returning id`, [store])
  const group = rows[0]!.id
  for (const version of versions) {
    const doc = JSON.stringify({ title: version.title, excerpt: '', authorName: '', coverMediaId: version.cover, body: { type: 'doc', content: (version.body ?? []).map(mediaId => ({ type: 'image', attrs: { mediaId } })) } })
    await pool.query(
      `insert into content.story_versions (store_id, group_id, language, status, slug, published, published_at, draft) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [store, group, version.language, version.status, slug(), version.status === 'published' ? doc : null, version.status === 'published' ? new Date().toISOString() : null, version.status === 'draft' ? doc : null],
    )
    for (const id of new Set([version.cover, ...(version.body ?? [])].filter((id): id is string => id !== null)))
      await pool.query(`insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot) values ($1, $2, 'story_version', $3, $4, $5)`, [store, id, group, version.language, version.status])
  }
  return group
}

async function pin(store: string, status: 'draft' | 'published', name: string, cover: string | null): Promise<string> {
  const doc = JSON.stringify({ name: { en: name }, tip: { en: 'Tip' } })
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.places (store_id, status, slug, latitude, longitude, published, draft, first_published_at, cover_media_id)
     values ($1, $2, $3, 47.05, 8.3, $4, $5, $6, $7) returning id`,
    [store, status, JSON.stringify({ en: slug() }), status === 'published' ? doc : null, status === 'draft' ? doc : null, status === 'draft' ? null : new Date().toISOString(), cover],
  )
  return rows[0]!.id
}

async function tour(store: string, status: 'draft' | 'published', title: string, files: { pdf: string, cover?: string | null, stop?: string | null }) {
  const doc = JSON.stringify({ title: { en: title }, summary: { en: 'Summary' }, meetingPoint: { en: 'Station' }, sections: [] })
  const tourSlug = slug()
  const { rows } = await pool.query<{ id: string }>(
    `insert into content.tours (store_id, status, slug, pdf_media_id, cover_media_id, published, draft, duration_minutes) values ($1, $2, $3, $4, $5, $6, $7, 90) returning id`,
    [store, status, JSON.stringify({ en: tourSlug }), files.pdf, files.cover ?? null, status === 'published' ? doc : null, status === 'draft' ? doc : null],
  )
  if (files.stop)
    await pool.query(`insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, media_id) values ($1, $2, 1, 47, 8, '{"title":{"en":"Stop"}}', $3)`, [rows[0]!.id, store, files.stop])
  return { id: rows[0]!.id, slug: tourSlug }
}

async function keepsake(store: string, name: string, photos: { live?: string[], draft?: string[], status?: 'draft' | 'published' }): Promise<string> {
  const status = photos.status ?? ((photos.live?.length ?? 0) > 0 ? 'published' : 'draft')
  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog.products (store_id, status, slug, published, draft) values ($1, $2, $3, $4, $5) returning id`,
    [store, status, status === 'published' ? JSON.stringify({ en: slug() }) : null, status === 'published' ? JSON.stringify({ name: { en: name }, text: {} }) : null, photos.draft ? JSON.stringify({ name: { en: name }, text: {}, media: photos.draft }) : null],
  )
  for (const [index, id] of (photos.live ?? []).entries())
    await pool.query(`insert into catalog.product_media (product_id, store_id, position, media_id) values ($1, $2, $3, $4)`, [rows[0]!.id, store, index + 1, id])
  return rows[0]!.id
}

type Staff = Awaited<ReturnType<typeof env.storeWithStaff>>
async function call<T>(staff: Staff, path: string, init: { method?: string, body?: object } = {}) {
  const response = await env.call(`/api/store/${staff.storeId}/media${path}`, { method: init.method, body: init.body, headers: staff.owner.headers })

  return { status: response.status, body: await response.json() as T }
}
const list = (staff: Staff, query: string) => call<MediaList>(staff, `?${query}`)

async function png(colour: string) {
  return new Uint8Array(await sharp({ create: { width: 64, height: 48, channels: 3, background: colour } }).png().toBuffer())
}
function grant(staff: Staff, bytes: Uint8Array, type = 'image/png', ext = 'png') {
  const key = `${staff.storeId}/${randomUUID()}.${ext}`
  storage.seed('uploads', key, bytes, { contentType: type })
  return key
}

// One store with a photo that every kind of page uses, so a count that forgets a kind of page is wrong.
async function wall() {
  const staff = await env.storeWithStaff()
  const s = staff.storeId
  const sunrise = await media(s, 'image', 'Kapellbruecke-Sunrise.JPG', { alt: { en: 'Lantern festival' }, createdAt: '2026-10-01T10:00:00Z' })
  const lonely = await media(s, 'image', 'Pilatus-clouds.jpg', { createdAt: '2026-10-02T10:00:00Z' })
  const draftOnlyKeepsake = await media(s, 'image', 'Fondue-set.jpg', { createdAt: '2026-10-03T10:00:00Z' })
  const liveKeepsake = await media(s, 'image', 'Cowbell.jpg', { createdAt: '2026-10-04T10:00:00Z' })
  const retired = await media(s, 'image', 'Old-banner.jpg', { status: 'retired', createdAt: '2026-10-05T10:00:00Z' })
  const processing = await media(s, 'image', 'Just-uploaded.jpg', { status: 'processing', createdAt: '2026-10-06T10:00:00Z' })
  const pdf = await media(s, 'pdf', 'Old-town-walk.pdf')
  const audio = await media(s, 'audio', 'Alphorn.mp3')
  const storyId = await story(s, [
    { language: 'en', status: 'published', title: 'Lucerne in a day', cover: sunrise },
    { language: 'de', status: 'draft', title: 'Luzern an einem Tag', cover: sunrise, body: [audio] },
  ])
  const placeId = await pin(s, 'draft', 'Chapel Bridge', sunrise)
  const published = await tour(s, 'published', 'Old town walk', { pdf, cover: sunrise })
  const keepsakeDraft = await keepsake(s, 'Fondue set', { draft: [draftOnlyKeepsake, sunrise] })
  const keepsakeLive = await keepsake(s, 'Cowbell', { live: [liveKeepsake, sunrise] })
  return { staff, s, sunrise, lonely, draftOnlyKeepsake, liveKeepsake, retired, processing, pdf, audio, storyId, placeId, published, keepsakeDraft, keepsakeLive }
}

describe('[E4.11][AC51] the media library list over HTTP', () => {
  it('[E4.11][AC51] counts every kind of page, keepsakes included, and splits published from draft-only', async () => {
    const w = await wall()
    const { status, body } = await list(w.staff, 'kind=image&pageSize=24')
    expect(status).toBe(200)
    const byName = Object.fromEntries(body.items.map(item => [item.name, item]))
    // story EN published, story DE draft, place draft, tour published, keepsake draft, keepsake published
    expect(byName['Kapellbruecke-Sunrise.JPG']!.usage).toEqual({ pages: 6, published: 3, drafts: 3 })
    expect(byName['Pilatus-clouds.jpg']!.usage).toEqual({ pages: 0, published: 0, drafts: 0 })
    expect(byName['Fondue-set.jpg']!.usage).toEqual({ pages: 1, published: 0, drafts: 1 })
    expect(byName['Cowbell.jpg']!.usage).toEqual({ pages: 1, published: 1, drafts: 0 })
    expect(body.kinds).toEqual({ image: 6, audio: 1, pdf: 1 })
    expect(body.statuses).toEqual({ processing: 1, ready: 4, retired: 1 })
    expect(body.uses).toEqual({ unused: 3, drafts: 1, published: 2 })
    // Newest upload first.
    expect(body.items.map(item => item.name)).toEqual(['Just-uploaded.jpg', 'Old-banner.jpg', 'Cowbell.jpg', 'Fondue-set.jpg', 'Pilatus-clouds.jpg', 'Kapellbruecke-Sunrise.JPG'])
  })

  it('[E4.11][AC51] the kind tabs hold audio and PDFs, and a file of the body counts for its story version', async () => {
    const w = await wall()
    const audio = await list(w.staff, 'kind=audio')
    expect(audio.body.items.map(item => [item.name, item.usage])).toEqual([['Alphorn.mp3', { pages: 1, published: 0, drafts: 1 }]])
    const pdf = await list(w.staff, 'kind=pdf')
    expect(pdf.body.items.map(item => [item.name, item.usage])).toEqual([['Old-town-walk.pdf', { pages: 1, published: 1, drafts: 0 }]])
  })

  it('[E4.11][AC51] the Use filter, the Status filter and their counts', async () => {
    const w = await wall()
    const names = async (query: string) => (await list(w.staff, `kind=image&pageSize=24&${query}`)).body.items.map(item => item.name).sort()
    expect(await names('use=unused')).toEqual(['Just-uploaded.jpg', 'Old-banner.jpg', 'Pilatus-clouds.jpg'])
    expect(await names('use=drafts')).toEqual(['Fondue-set.jpg'])
    expect(await names('use=published')).toEqual(['Cowbell.jpg', 'Kapellbruecke-Sunrise.JPG'])
    expect(await names('use=unused,drafts&status=ready')).toEqual(['Fondue-set.jpg', 'Pilatus-clouds.jpg'])
    expect(await names('status=retired')).toEqual(['Old-banner.jpg'])
    const counted = await list(w.staff, 'kind=image&status=ready')
    expect(counted.body.uses).toEqual({ unused: 1, drafts: 1, published: 2 })
    expect(counted.body.total).toBe(4)
  })

  it('[E4.11][AC51] search matches the name only, in any case, and treats % and _ as plain characters', async () => {
    const w = await wall()
    const found = async (q: string) => (await list(w.staff, `kind=image&q=${encodeURIComponent(q)}`)).body.items.map(item => item.name)
    expect(await found('sunrise')).toEqual(['Kapellbruecke-Sunrise.JPG'])
    expect(await found('SUNRISE')).toEqual(['Kapellbruecke-Sunrise.JPG'])
    expect(await found('lantern')).toEqual([])
    expect(await found('original.jpg')).toEqual([])
    expect(await found('%')).toEqual([])
    expect(await found('_')).toEqual([])
    expect(await found('e-set')).toEqual(['Fondue-set.jpg'])
  })

  it('[E4.11][AC51] pages of two, the total and a page past the end', async () => {
    const w = await wall()
    const first = await list(w.staff, 'kind=image&pageSize=4&page=1')
    const second = await list(w.staff, 'kind=image&pageSize=4&page=2')
    const beyond = await list(w.staff, 'kind=image&pageSize=4&page=3')
    expect([first.body.items.length, second.body.items.length, beyond.body.items.length]).toEqual([4, 2, 0])
    expect([first.body.total, second.body.total, beyond.body.total]).toEqual([6, 6, 6])
    expect(new Set([...first.body.items, ...second.body.items].map(item => item.id)).size).toBe(6)
  })

  it('[E4.11][AC51] another store sees nothing of this one, and a guest is refused', async () => {
    const w = await wall()
    const other = await env.storeWithStaff()
    expect((await list(other, 'kind=image')).body).toMatchObject({ total: 0, kinds: { image: 0, audio: 0, pdf: 0 } })
    const response = await env.call(`/api/store/${w.s}/media?kind=image`, { headers: other.owner.headers })
    expect(response.status).toBe(403)
    expect((await env.call(`/api/store/${w.s}/media?kind=image`)).status).toBe(401)
  })
})

describe('[E4.11][AC51] where a file is used', () => {
  it('[E4.11][AC51] names stories, places, tours and keepsakes, published first, with the role on each page', async () => {
    const w = await wall()
    const { status, body } = await call<MediaUses>(w.staff, `/${w.sunrise}/uses`)
    expect(status).toBe(200)
    const brief = (rows: MediaUses['published']) => rows.map(row => [row.pageKind, row.language, row.title.en ?? row.title.de, row.role]).sort()
    expect(brief(body.published)).toEqual([
      ['keepsake', null, 'Cowbell', 'photo'],
      ['story', 'en', 'Lucerne in a day', 'cover'],
      ['tour', null, 'Old town walk', 'cover'],
    ])
    expect(brief(body.drafts)).toEqual([
      ['keepsake', null, 'Fondue set', 'photo'],
      ['place', null, 'Chapel Bridge', 'cover'],
      ['story', 'de', 'Luzern an einem Tag', 'cover'],
    ])
    expect(body.published.concat(body.drafts).map(row => row.pageId)).toEqual(expect.arrayContaining([w.storyId, w.placeId, w.published.id, w.keepsakeDraft, w.keepsakeLive]))
  })

  it('[E4.11][AC51] a file in a story body is "text", in a tour stop "stop", and a draft and a published ref on one version is one page', async () => {
    const w = await wall()
    const stop = await media(w.s, 'image', 'Stop-photo.jpg')
    await tour(w.s, 'draft', 'Lake walk', { pdf: await media(w.s, 'pdf', 'Lake.pdf'), stop })
    const inBody = await media(w.s, 'image', 'Body-photo.jpg')
    const group = await story(w.s, [{ language: 'en', status: 'published', title: 'Both slots', cover: null, body: [inBody] }])
    await pool.query(`insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot) values ($1, $2, 'story_version', $3, 'en', 'draft')`, [w.s, inBody, group])
    const body = await call<MediaUses>(w.staff, `/${inBody}/uses`)
    expect(body.body.published).toHaveLength(1)
    expect(body.body.drafts).toHaveLength(0)
    expect(body.body.published[0]).toMatchObject({ pageKind: 'story', role: 'text', language: 'en' })
    expect((await call<MediaUses>(w.staff, `/${stop}/uses`)).body.drafts[0]).toMatchObject({ pageKind: 'tour', role: 'stop', title: { en: 'Lake walk' } })
  })

  it('[E4.11][AC51] a keepsake that is not for sale is a draft-only use even for a live photo, and a file of another store is 404', async () => {
    const w = await wall()
    const photo = await media(w.s, 'image', 'Unlisted.jpg')
    await keepsake(w.s, 'Hidden keepsake', { live: [photo], status: 'draft' })
    expect((await call<MediaUses>(w.staff, `/${photo}/uses`)).body).toMatchObject({ published: [], drafts: [{ pageKind: 'keepsake' }] })
    const other = await env.storeWithStaff()
    expect((await call(other, `/${photo}/uses`)).status).toBe(404)
  })

  it('[E4.11][AC51] an unused file has no pages', async () => {
    const w = await wall()
    expect((await call<MediaUses>(w.staff, `/${w.lonely}/uses`)).body).toEqual({ published: [], drafts: [] })
  })
})

describe('[E4.11][AC51] retiring a file over HTTP', () => {
  it.each([
    ['a published story and a draft story', 'sunrise', 6],
    ['only a keepsake draft photo', 'draftOnlyKeepsake', 1],
    ['only a published keepsake photo', 'liveKeepsake', 1],
  ] as const)('[E4.11][AC51] is refused for a file that %s use(s): 409 media-in-use and the file stays ready', async (_name, which, pages) => {
    const w = await wall()
    const id = w[which]
    const result = await call<{ type: string, pages: number }>(w.staff, `/${id}/retire`, { method: 'POST' })
    expect(result.status).toBe(409)
    expect(result.body).toMatchObject({ type: 'media-in-use', pages })
    const { rows } = await pool.query<{ status: string }>('select status from content.media where id = $1', [id])
    expect(rows[0]!.status).toBe('ready')
  })

  it('[E4.11][AC51] is refused for a file only a place, a tour PDF or a story body audio uses', async () => {
    const w = await wall()
    for (const id of [w.pdf, w.audio]) {
      const result = await call<{ type: string }>(w.staff, `/${id}/retire`, { method: 'POST' })
      expect(result.status).toBe(409)
      expect(result.body.type).toBe('media-in-use')
    }
    const cover = await media(w.s, 'image', 'Place-cover.jpg')
    await pin(w.s, 'draft', 'Rose Garden', cover)
    expect((await call(w.staff, `/${cover}/retire`, { method: 'POST' })).status).toBe(409)
  })

  it('[E4.11][AC51] retires an unused ready file, queues its cleanup after the grace period, and refuses it again', async () => {
    const w = await wall()
    jobs.length = 0
    const result = await call<MediaItem>(w.staff, `/${w.lonely}/retire`, { method: 'POST' })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ id: w.lonely, status: 'retired', publicUrl: null })
    const { rows } = await pool.query<{ status: string, retired_at: Date | null }>('select status, retired_at from content.media where id = $1', [w.lonely])
    expect(rows[0]!.status).toBe('retired')
    expect(rows[0]!.retired_at).not.toBeNull()
    expect(jobs.filter(job => job.queue === 'media-retire' && (job.data as { mediaId: string }).mediaId === w.lonely)).toHaveLength(1)
    expect(jobs.at(-1)!.startAfter!.getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000)
    const again = await call<{ type: string }>(w.staff, `/${w.lonely}/retire`, { method: 'POST' })
    expect([again.status, again.body.type]).toEqual([409, 'media-already-retired'])
  })

  it('[E4.11][AC51] a file that is still processing is not retired', async () => {
    const w = await wall()
    const result = await call<{ type: string }>(w.staff, `/${w.processing}/retire`, { method: 'POST' })
    expect([result.status, result.body.type]).toEqual([409, 'media-not-ready'])
  })

  it('[E4.11][AC51] a retire that loses the race to a draft is refused: the file was unused when the sheet opened', async () => {
    const w = await wall()
    expect((await list(w.staff, 'kind=image&use=unused&status=ready')).body.items.map(item => item.id)).toContain(w.lonely)
    // A moment later a German draft takes the file.
    await story(w.s, [{ language: 'de', status: 'draft', title: 'Pilatus im Nebel', cover: w.lonely }])
    const result = await call<{ type: string, pages: number }>(w.staff, `/${w.lonely}/retire`, { method: 'POST' })
    expect(result.status).toBe(409)
    expect(result.body).toMatchObject({ type: 'media-in-use', pages: 1 })
  })

  it('[E4.11][AC51] a retired file cannot be chosen by a new draft', async () => {
    const w = await wall()
    await call(w.staff, `/${w.lonely}/retire`, { method: 'POST' })
    const made = await env.call(w.staff.groups, { method: 'POST', headers: w.staff.owner.headers, body: {} })
    const group = await made.json() as { id: string }
    const draft = { title: 'x', excerpt: '', authorName: '', authorRole: '', coverMediaId: w.lonely, body: emptyStoryBody }
    const saved = await env.call(`${w.staff.groups}/${group.id}/versions`, { method: 'POST', headers: w.staff.owner.headers, body: { language: 'en', slug: slug(), draft } })
    expect(saved.status).toBe(422)
    expect(await saved.json()).toMatchObject({ type: 'media-retired' })
  })
})

describe('[E4.11][AC51] naming a file over HTTP', () => {
  it('[E4.11][AC51] a rename is found by the new name and not the old one, and a blank name is refused', async () => {
    const w = await wall()
    const renamed = await call<MediaItem>(w.staff, `/${w.lonely}`, { method: 'PATCH', body: { name: '  Pilatus at dawn ', alt: { en: 'Clouds over Pilatus', de: 'Wolken über dem Pilatus' } } })
    expect(renamed.status).toBe(200)
    expect(renamed.body).toMatchObject({ name: 'Pilatus at dawn', fileName: 'Pilatus-clouds.jpg', alt: { en: 'Clouds over Pilatus', de: 'Wolken über dem Pilatus' }, version: 1 })
    const found = async (q: string) => (await list(w.staff, `kind=image&q=${encodeURIComponent(q)}`)).body.items.map(item => item.id)
    expect(await found('dawn')).toEqual([w.lonely])
    expect(await found('clouds')).toEqual([])
    expect(await found('over pilatus')).toEqual([])
    for (const name of ['', '   '])
      expect((await call(w.staff, `/${w.lonely}`, { method: 'PATCH', body: { name } })).status).toBe(400)
    const { rows } = await pool.query<{ name: string }>('select name from content.media where id = $1', [w.lonely])
    expect(rows[0]!.name).toBe('Pilatus at dawn')
  })

  it('[E4.11][AC51] the database refuses a blank name the API would have let through', async () => {
    const w = await wall()
    await expect(pool.query(`update content.media set name = ' ' where id = $1`, [w.lonely])).rejects.toMatchObject({ constraint: 'media_name_check' })
  })

  it('[E4.11][AC51] a retired file is read-only', async () => {
    const w = await wall()
    const result = await call<{ type: string }>(w.staff, `/${w.retired}`, { method: 'PATCH', body: { name: 'x' } })
    expect([result.status, result.body.type]).toEqual([409, 'media-already-retired'])
  })

  it('[E4.11][AC51] a confirmed upload takes its file name as its name', async () => {
    const w = await wall()
    const key = grant(w.staff, await png('red'))
    const result = await call<{ id: string, status: string }>(w.staff, '/confirm', { method: 'POST', body: { uploadKey: key, fileName: 'Kapellbruecke Night.PNG' } })
    expect(result.status).toBe(201)
    expect(result.body.status).toBe('processing')
    const found = (await list(w.staff, 'kind=image&q=night')).body.items
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ id: result.body.id, name: 'Kapellbruecke Night.PNG', fileName: 'Kapellbruecke Night.PNG', version: 1, status: 'processing' })
  })
})

describe('[E4.11][AC51] replacing a file over HTTP', () => {
  it('[E4.11][AC51] AC51: the row keeps its id and moves to a new versioned key, and a story, a place and a tour show the new file', async () => {
    const staff = await env.storeWithStaff()
    const s = staff.storeId
    const photo = await media(s, 'image', 'Sunrise.jpg')
    const oldKey = `${s}/${photo}/original.jpg`
    const pdf = await media(s, 'pdf', 'Walk.pdf')
    const storyGroup = await story(s, [{ language: 'en', status: 'published', title: 'Lucerne in a day', cover: photo }])
    const { rows: [version] } = await pool.query<{ slug: string }>('select slug from content.story_versions where group_id = $1', [storyGroup])
    const place = await pin(s, 'published', 'Chapel Bridge', photo)
    const walk = await tour(s, 'published', 'Old town walk', { pdf, cover: photo })
    const public_ = async () => {
      const read = async (path: string) => (await (await env.call(path)).json()) as Record<string, unknown>
      return {
        story: (await read(`/api/public/stories/${version!.slug}?lang=en`)).coverKey,
        place: (await read(`/api/public/places/${place}?lang=en`)).photoKey,
        tour: (await read(`/api/public/tours/${walk.slug}?lang=en`)).coverKey,
      }
    }
    // The first read fills the public caches; the clock moves past them before the second.
    expect(await public_()).toEqual({ story: oldKey, place: oldKey, tour: oldKey })
    storage.seed('media', oldKey, await png('red'))

    const key = grant(staff, await png('blue'))
    const result = await call<MediaItem>(staff, `/${photo}/replace`, { method: 'POST', body: { uploadKey: key, fileName: 'sunrise-v2.png' } })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ id: photo, version: 2, name: 'Sunrise.jpg', fileName: 'sunrise-v2.png', status: 'ready', contentType: 'image/png', width: 64, height: 48 })
    expect(result.body.publicUrl).toMatch(new RegExp(`/media/${s}/${photo}/v2-[0-9a-f]{8}-[0-9a-f]{8}/original\\.png$`))
    const { rows } = await pool.query<{ storage_key: string, version: number }>('select storage_key, version from content.media where id = $1', [photo])
    const newKey = rows[0]!.storage_key
    expect(newKey).toMatch(new RegExp(`^${s}/${photo}/v2-[0-9a-f]{8}-[0-9a-f]{8}/original\\.png$`))
    expect(newKey).not.toBe(oldKey)
    expect(storage.objects('media').has(newKey)).toBe(true)
    // The old object is still there until the purge job runs, and was never overwritten.
    expect(storage.objects('media').get(oldKey)!.contentType).toBeUndefined()
    clock.advance(61_000)
    expect(await public_()).toEqual({ story: newKey, place: newKey, tour: newKey })
  })

  it('[E4.11][AC51] AC51: replacing a tour PDF keeps the tour on one PDF row', async () => {
    const staff = await env.storeWithStaff()
    const pdf = await media(staff.storeId, 'pdf', 'Walk.pdf')
    const walk = await tour(staff.storeId, 'published', 'Old town walk', { pdf })
    const bytes = new TextEncoder().encode('%PDF-1.7 new guide')
    const result = await call<MediaItem>(staff, `/${pdf}/replace`, { method: 'POST', body: { uploadKey: grant(staff, bytes, 'application/pdf', 'pdf') } })
    expect(result.body).toMatchObject({ id: pdf, kind: 'pdf', version: 2 })
    const { rows } = await pool.query<{ pdf_media_id: string }>('select pdf_media_id from content.tours where id = $1', [walk.id])
    expect(rows[0]!.pdf_media_id).toBe(pdf)
    // A photo cannot take a PDF's place.
    const refused = await call<{ type: string }>(staff, `/${pdf}/replace`, { method: 'POST', body: { uploadKey: grant(staff, await png('red')) } })
    expect([refused.status, refused.body.type]).toEqual([422, 'media-kind-mismatch'])
  })

  it('[E4.11][AC51] replacements with the same bytes that race on the real row lock leave the live file and its sizes in storage', async () => {
    const staff = await env.storeWithStaff()
    const photo = await media(staff.storeId, 'image', 'Sunrise.jpg')
    const bytes = await png('blue')
    const answers = await Promise.all([1, 2, 3, 4].map(() => call<{ type?: string }>(staff, `/${photo}/replace`, { method: 'POST', body: { uploadKey: grant(staff, bytes) } })))

    // A request that lost the lock is refused as stale (412); the others moved the row to the next version.
    expect(answers.every(answer => answer.status === 200 || answer.status === 412)).toBe(true)
    const won = answers.filter(answer => answer.status === 200).length
    expect(won).toBeGreaterThanOrEqual(1)
    const { rows } = await pool.query<{ storage_key: string, version: number }>('select storage_key, version from content.media where id = $1', [photo])
    expect(rows[0]!.version).toBe(1 + won)
    const live = rows[0]!.storage_key
    const folder = [...storage.objects('media').keys()].filter(key => isCurrentObject(live, key))
    expect(folder).toContain(live)
    expect(folder.length).toBeGreaterThan(1)
  })

  it('[E4.11][AC51] queues the purge of the old version after the grace period and refuses a retired or processing file', async () => {
    const w = await wall()
    jobs.length = 0
    expect((await call(w.staff, `/${w.lonely}/replace`, { method: 'POST', body: { uploadKey: grant(w.staff, await png('green')) } })).status).toBe(200)
    expect(jobs.filter(job => job.queue === 'media-purge')).toHaveLength(1)
    const retired = await call<{ type: string }>(w.staff, `/${w.retired}/replace`, { method: 'POST', body: { uploadKey: grant(w.staff, await png('green')) } })
    expect([retired.status, retired.body.type]).toEqual([409, 'media-already-retired'])
    const processing = await call<{ type: string }>(w.staff, `/${w.processing}/replace`, { method: 'POST', body: { uploadKey: grant(w.staff, await png('green')) } })
    expect([processing.status, processing.body.type]).toEqual([409, 'media-not-ready'])
  })

  it('[E4.11][AC51] a file that is not the type it says is refused and the row is unchanged', async () => {
    const w = await wall()
    const result = await call<{ type: string }>(w.staff, `/${w.lonely}/replace`, { method: 'POST', body: { uploadKey: grant(w.staff, new TextEncoder().encode('not a picture')) } })
    expect([result.status, result.body.type]).toEqual([422, 'media-content-mismatch'])
    const { rows } = await pool.query<{ version: number }>('select version from content.media where id = $1', [w.lonely])
    expect(rows[0]!.version).toBe(1)
  })
})
