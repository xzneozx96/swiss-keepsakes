import type { ContentLanguage, Pin, PinDate, PinDraft, PinStoryOption } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { MediaRecord, PinChanges, PinListPage, PinListQuery, PinListRow, PinRepository, PinStoryOptionsQuery } from '../ports.ts'
import { contentLanguages } from '@sk/domain/content'
import { sql } from 'drizzle-orm'
import { offsetOf } from '../../../platform/db/offset.ts'
import { record } from './media-repository.ts'

// The document stores the title under `name`: places_published_fields_check reads published->'name'.
interface PinDocument { name?: PinDraft['title'], tip?: PinDraft['tip'], localTip?: PinDraft['localTip'], coverAlt?: PinDraft['coverAlt'], photoAlt?: PinDraft['photoAlt'] }

interface PinRow {
  id: string
  store_id: string
  status: Pin['status']
  slug: Pin['slug']
  latitude: number | null
  longitude: number | null
  address: string | null
  maps_link: string | null
  weekly_hours: Pin['weeklyHours']
  stay_tag: Pin['stayTag']
  interests: string[]
  must_visit: boolean
  cover_media_id: string | null
  main_story_group_id: string | null
  draft: PinDocument | null
  published: PinDocument | null
  first_published_at: Date | null
  row_version: number
  created_at: Date
  updated_at: Date
}

// A mapped type, not the interface: execute<> wants an index signature.
type DateRow = { [K in keyof PinDate]: PinDate[K] }

const columns = sql`id, store_id, status, slug, latitude, longitude, address, maps_link, weekly_hours, stay_tag, interests,
  must_visit, cover_media_id, main_story_group_id, draft, published,
  first_published_at, row_version, created_at, updated_at`

function toDraft(document: PinDocument | null): PinDraft | null {
  return document ? { title: document.name ?? {}, tip: document.tip ?? {}, localTip: document.localTip ?? {}, coverAlt: document.coverAlt ?? {}, photoAlt: document.photoAlt ?? {} } : null
}

const toDocument = (draft: PinDraft) => ({ name: draft.title, tip: draft.tip, localTip: draft.localTip, coverAlt: draft.coverAlt, photoAlt: draft.photoAlt })

const emptyText: PinDraft = { title: {}, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }

// The alt text of the extra photos, by media id; a photo with no alt text has no entry.
const photoAltOf = (photos: NonNullable<PinChanges['photos']>) => Object.fromEntries(photos.filter(photo => Object.keys(photo.alt).length > 0).map(photo => [photo.mediaId, photo.alt]))

// The text document a save writes: what the changes name, the rest from the stored text. Undefined when the save names no text.
function documentOf(changes: PinChanges, base: PinDraft): ReturnType<typeof toDocument> | undefined {
  if (!changes.title && !changes.tip && !changes.localTip && !changes.coverAlt && !changes.photos)
    return undefined
  return toDocument({
    title: changes.title ?? base.title,
    tip: changes.tip ?? base.tip,
    localTip: changes.localTip ?? base.localTip,
    coverAlt: changes.coverAlt ?? base.coverAlt,
    photoAlt: changes.photos ? photoAltOf(changes.photos) : base.photoAlt,
  })
}

const json = (value: unknown) => (value === null ? null : JSON.stringify(value))

async function load(tx: Tx, storeId: string, pinId: string, lock: boolean): Promise<Pin | undefined> {
  const found = await tx.execute<PinRow & Record<string, unknown>>(sql`
    select ${columns} from content.places where store_id = ${storeId} and id = ${pinId}${lock ? sql` for no key update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  const dates = await tx.execute<DateRow>(sql`
    select id, first_day::text as "firstDay", last_day::text as "lastDay",
           to_char(start_time, 'HH24:MI') as "startTime", to_char(end_time, 'HH24:MI') as "endTime"
      from content.place_dates where store_id = ${storeId} and place_id = ${pinId}
     order by first_day, start_time nulls first, id`)
  const categories = await tx.execute<{ id: string }>(sql`
    select category_id as id from content.place_categories where store_id = ${storeId} and place_id = ${pinId} order by category_id`)
  const photos = await tx.execute<{ mediaId: string }>(sql`
    select media_id as "mediaId" from content.place_photos where store_id = ${storeId} and place_id = ${pinId} order by position`)
  const link = await tx.execute<{ url: string }>(sql`
    select url from content.place_links where store_id = ${storeId} and place_id = ${pinId}`)
  return {
    id: row.id,
    storeId: row.store_id,
    status: row.status,
    slug: row.slug,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    mapsLink: row.maps_link,
    weeklyHours: row.weekly_hours,
    stayTag: row.stay_tag,
    interests: row.interests,
    mustVisit: row.must_visit,
    coverMediaId: row.cover_media_id,
    photos: photos.rows,
    outboundUrl: link.rows[0]?.url ?? null,
    mainStoryGroupId: row.main_story_group_id,
    categoryIds: categories.rows.map(c => c.id),
    dates: dates.rows,
    draft: toDraft(row.draft),
    published: toDraft(row.published),
    firstPublishedAt: row.first_published_at && new Date(row.first_published_at),
    rowVersion: row.row_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

async function replaceLists(tx: Tx, storeId: string, pinId: string, changes: PinChanges): Promise<void> {
  if (changes.categoryIds) {
    await tx.execute(sql`delete from content.place_categories where store_id = ${storeId} and place_id = ${pinId}`)
    if (changes.categoryIds.length > 0) {
      await tx.execute(sql`
        insert into content.place_categories (place_id, category_id, store_id)
        select ${pinId}, c, ${storeId} from unnest(${sql.param(changes.categoryIds)}::uuid[]) as c`)
    }
  }
  if (changes.photos) {
    await tx.execute(sql`delete from content.place_photos where store_id = ${storeId} and place_id = ${pinId}`)
    if (changes.photos.length > 0) {
      const values = changes.photos.map((photo, index) => sql`(${pinId}, ${storeId}, ${index + 1}, ${photo.mediaId})`)
      await tx.execute(sql`
        insert into content.place_photos (place_id, store_id, position, media_id) values ${sql.join(values, sql`, `)}`)
    }
  }
  if (changes.outboundUrl === null) {
    await tx.execute(sql`delete from content.place_links where store_id = ${storeId} and place_id = ${pinId}`)
  }
  else if (changes.outboundUrl !== undefined) {
    await tx.execute(sql`
      insert into content.place_links (place_id, store_id, url) values (${pinId}, ${storeId}, ${changes.outboundUrl})
      on conflict (place_id) do update set url = excluded.url, updated_at = now()`)
  }
  if (changes.dates) {
    await tx.execute(sql`delete from content.place_dates where store_id = ${storeId} and place_id = ${pinId}`)
    if (changes.dates.length > 0) {
      const values = changes.dates.map(d => sql`(${pinId}, ${storeId}, ${d.firstDay}::date, ${d.lastDay}::date, ${d.startTime ?? null}::time, ${d.endTime ?? null}::time)`)
      await tx.execute(sql`
        insert into content.place_dates (place_id, store_id, first_day, last_day, start_time, end_time) values ${sql.join(values, sql`, `)}`)
    }
  }
}

function reload(tx: Tx, pin: Pick<Pin, 'storeId' | 'id'>): Promise<Pin> {
  return load(tx, pin.storeId, pin.id, false).then(pin => pin!)
}

interface ListRow {
  id: string
  status: Pin['status']
  slug: Pin['slug']
  latitude: number | null
  longitude: number | null
  stay_tag: Pin['stayTag']
  interests: string[]
  cover_media_id: string | null
  main_story_group_id: string | null
  main_story_published: boolean
  outbound_url: string | null
  draft: PinDocument | null
  published: PinDocument | null
  row_version: number
  updated_at: Date
  dates: PinDate[]
  category_ids: string[]
  cm_id: string | null
  cm_store_id: string
  cm_kind: MediaRecord['kind']
  cm_storage_key: string
  cm_content_type: string
  cm_byte_size: string | number
  cm_sha256: string
  cm_width: number | null
  cm_height: number | null
  cm_status: MediaRecord['status']
  cm_name: string
  cm_file_name: string
  cm_alt: MediaRecord['alt']
  cm_duration_seconds: number | null
  cm_version: number
  cm_created_at: string | Date
}

// The rows of one page: the dates and category ids are aggregated per pin, so a page is one round trip. The order is the page's.
async function listRows(tx: Tx, storeId: string, ids: string[]): Promise<PinListRow[]> {
  const found = await tx.execute<ListRow & Record<string, unknown>>(sql`
    select p.id, p.status, p.slug, p.latitude, p.longitude, p.stay_tag, p.interests, p.cover_media_id, p.main_story_group_id,
           cm.id as cm_id, cm.store_id as cm_store_id, cm.kind as cm_kind, cm.storage_key as cm_storage_key, cm.content_type as cm_content_type,
           cm.byte_size as cm_byte_size, cm.sha256 as cm_sha256, cm.width as cm_width, cm.height as cm_height, cm.status as cm_status,
           cm.name as cm_name, cm.file_name as cm_file_name, cm.alt as cm_alt, cm.duration_seconds as cm_duration_seconds,
           cm.version as cm_version, cm.created_at as cm_created_at,
           p.draft, p.published, p.row_version, p.updated_at,
           coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'firstDay', d.first_day::text, 'lastDay', d.last_day::text,
                                                          'startTime', to_char(d.start_time, 'HH24:MI'), 'endTime', to_char(d.end_time, 'HH24:MI'))
                                      order by d.first_day, d.start_time nulls first, d.id)
                       from content.place_dates d where d.place_id = p.id), '[]'::jsonb) as dates,
           coalesce((select array_agg(c.category_id::text order by c.category_id) from content.place_categories c where c.place_id = p.id), '{}'::text[]) as category_ids,
           exists (select 1 from content.story_versions v where v.group_id = p.main_story_group_id and v.status = 'published') as main_story_published,
           (select l.url from content.place_links l where l.place_id = p.id and l.store_id = p.store_id limit 1) as outbound_url
      from content.places p
      left join content.media cm on cm.id = p.cover_media_id and cm.store_id = p.store_id and cm.status = 'ready'
     where p.store_id = ${storeId} and p.id = any(${sql.param(ids)}::uuid[])`)
  const rank = new Map(ids.map((id, index) => [id, index]))
  return found.rows.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!).map(row => ({
    id: row.id,
    status: row.status,
    draft: toDraft(row.draft),
    published: toDraft(row.published),
    slug: row.slug,
    latitude: row.latitude,
    longitude: row.longitude,
    categoryIds: row.category_ids,
    dates: row.dates,
    stayTag: row.stay_tag,
    interests: row.interests,
    coverMediaId: row.cover_media_id,
    cover: row.cm_id === null ? null : record({ id: row.cm_id, store_id: row.cm_store_id, kind: row.cm_kind, storage_key: row.cm_storage_key, content_type: row.cm_content_type, byte_size: row.cm_byte_size, sha256: row.cm_sha256, width: row.cm_width, height: row.cm_height, status: row.cm_status, name: row.cm_name, file_name: row.cm_file_name, alt: row.cm_alt, duration_seconds: row.cm_duration_seconds, version: row.cm_version, created_at: row.cm_created_at }),
    mainStoryGroupId: row.main_story_group_id,
    mainStoryPublished: row.main_story_published,
    outboundUrl: row.outbound_url,
    rowVersion: row.row_version,
    updatedAt: new Date(row.updated_at),
  }))
}

const emptyCounts = {
  statuses: { draft: 0, published: 0, hidden: 0, ended: 0 },
  stays: { short_stay: 0, multi_day: 0, both: 0 },
  types: { place: 0, event: 0 },
}

// One numbered page (ADR-033 section 6). The facets count with the search and the other groups, not their own ticks, so each
// group has its own query. `ended` is worked out the way the domain does (`hasEnded`): Zurich local time at `now`, a date ends
// at its last day plus its end time (to the minute), or at midnight without one. The search is position(), not ILIKE, so a % or _
// in it is a plain character (as the media library does).
async function listPage(tx: Tx, storeId: string, query: PinListQuery, now: Date): Promise<PinListPage> {
  const local = sql`(${now.toISOString()}::timestamptz at time zone 'Europe/Zurich')`
  const pins = sql`
    pins as (
      select s.*, case when s.has_dates then 'event' else 'place' end as kind,
             case when s.status = 'published' and s.has_dates and not s.upcoming then 'ended' else s.status end as lstatus
        from (
          select p.id, p.status, p.created_at, p.updated_at, p.stay_tag,
                 coalesce((select array_agg(c.category_id) from content.place_categories c where c.place_id = p.id and c.store_id = p.store_id), '{}'::uuid[]) as cats,
                 exists (select 1 from content.place_dates d where d.place_id = p.id) as has_dates,
                 exists (select 1 from content.place_dates d where d.place_id = p.id
                            and not (d.last_day < ${local}::date
                                     or (d.last_day = ${local}::date and d.end_time is not null and to_char(d.end_time, 'HH24:MI') <= to_char(${local}, 'HH24:MI')))) as upcoming,
                 coalesce(p.draft, p.published)->'name'->>'en' as title_en,
                 coalesce(p.draft, p.published)->'name'->>'de' as title_de,
                 p.slug->>'en' as slug_en,
                 p.slug->>'de' as slug_de
            from content.places p
           where p.store_id = ${storeId}
        ) s
    )`
  const text = (array: string[]) => sql`${sql.param(array)}::text[]`
  const categoryIds = query.category.filter(id => id !== 'none')
  const filters = {
    q: query.q ? sql`(${sql.join(['title_en', 'title_de', 'slug_en', 'slug_de'].map(column => sql`position(lower(${query.q}) in lower(coalesce(${sql.raw(column)}, ''))) > 0`), sql` or `)})` : undefined,
    status: query.status.length > 0 ? sql`lstatus = any(${text(query.status)})` : undefined,
    stay: query.stay.length > 0 ? sql`stay_tag = any(${text(query.stay)})` : undefined,
    type: query.type.length > 0 ? sql`kind = any(${text(query.type)})` : undefined,
    category: query.category.length > 0 ? sql`(cats && ${sql.param(categoryIds)}::uuid[] or (${query.category.includes('none')} and cardinality(cats) = 0))` : undefined,
  }
  // The conditions of every group but `skip`, as one `where`.
  const where = (skip?: keyof typeof filters) => {
    const parts = Object.entries(filters).flatMap(([group, part]) => (part && group !== skip ? [part] : []))
    return parts.length === 0 ? sql`true` : sql.join(parts, sql` and `)
  }
  const order = query.sort === 'edited' ? sql`updated_at desc, id desc` : sql`created_at desc, id desc`
  const facet = async <K extends string>(group: keyof typeof filters, column: string, keys: readonly K[]) => {
    const found = await tx.execute<{ key: K, count: number }>(sql`
      with ${pins} select ${sql.raw(column)}::text as key, count(*)::int as count from pins where ${where(group)} group by 1`)
    return Object.fromEntries(keys.map(key => [key, found.rows.find(row => row.key === key)?.count ?? 0])) as Record<K, number>
  }
  // One after the other: a transaction holds one connection, and node-postgres deprecates overlapping queries on it.
  const ids = await tx.execute<{ id: string }>(sql`
      with ${pins} select id from pins where ${where()} order by ${order} limit ${query.pageSize} offset ${offsetOf(query.page, query.pageSize)}`)
  const total = await tx.execute<{ count: number }>(sql`with ${pins} select count(*)::int as count from pins where ${where()}`)
  const statuses = await facet('status', 'lstatus', Object.keys(emptyCounts.statuses) as (keyof typeof emptyCounts.statuses)[])
  const stays = await facet('stay', 'stay_tag', Object.keys(emptyCounts.stays) as (keyof typeof emptyCounts.stays)[])
  const types = await facet('type', 'kind', Object.keys(emptyCounts.types) as (keyof typeof emptyCounts.types)[])
  // A pin counts under each of its categories and under their parents, once.
  const categoryCounts = await tx.execute<{ id: string, count: number }>(sql`
      with ${pins}
      select k.cid::text as id, count(distinct s.id)::int as count
        from pins s
       cross join lateral (
               select unnest(s.cats) as cid
                union
               select c.parent_id from content.map_categories c where c.store_id = ${storeId} and c.id = any(s.cats) and c.parent_id is not null
             ) k
       where ${where('category')}
       group by k.cid`)
  const none = await tx.execute<{ count: number }>(sql`
    with ${pins} select count(*)::int as count from pins where cardinality(cats) = 0 and ${where('category')}`)
  const rows = ids.rows.length === 0 ? [] : await listRows(tx, storeId, ids.rows.map(row => row.id))
  return {
    rows,
    total: total.rows[0]!.count,
    statuses,
    stays,
    types,
    categories: { none: none.rows[0]!.count, ...Object.fromEntries(categoryCounts.rows.map(row => [row.id, row.count])) },
  }
}

// The picker's matches: live story groups whose title in either language holds `q`, newest first, at most `limit`; the chosen group is
// added when it is not among them, whatever its state. A title is the published one, else the draft's (as the picker has always shown it).
async function storyOptionRows(tx: Tx, storeId: string, { q, groupId, limit }: PinStoryOptionsQuery): Promise<PinStoryOption[]> {
  const found = await tx.execute<{ group_id: string, kind: PinStoryOption['kind'], title: PinStoryOption['title'], statuses: Partial<Record<ContentLanguage, 'draft' | 'published'>> } & Record<string, unknown>>(sql`
    with options as (
      select g.id as group_id, g.kind, g.created_at,
             coalesce(jsonb_object_agg(v.language, coalesce(v.published->>'title', v.draft->>'title'))
                      filter (where coalesce(v.published->>'title', v.draft->>'title') is not null), '{}'::jsonb) as title,
             coalesce(jsonb_object_agg(v.language, v.status) filter (where v.language is not null), '{}'::jsonb) as statuses,
             bool_or(v.status = 'published') as live,
             ${q ? sql`bool_or(position(lower(${q}) in lower(coalesce(v.published->>'title', v.draft->>'title', ''))) > 0)` : sql`true`} as hit
        from content.story_groups g
        join content.story_versions v on v.group_id = g.id and v.store_id = g.store_id
       where g.store_id = ${storeId}
       group by g.id, g.kind, g.created_at
    )
    (select group_id, kind, title, statuses, created_at from options where live and hit order by created_at desc, group_id desc limit ${limit})
    ${groupId ? sql`union select group_id, kind, title, statuses, created_at from options where group_id = ${groupId}` : sql``}
    order by created_at desc, group_id desc`)
  return found.rows.map((row) => {
    const languages = { en: row.statuses.en ?? 'none', de: row.statuses.de ?? 'none' } as const
    return { groupId: row.group_id, kind: row.kind, title: row.title, languages, publishedLanguages: contentLanguages.filter(language => languages[language] === 'published') }
  })
}

export function createPinRepository(): PinRepository<Tx> {
  return {
    async insert(tx, storeId, changes, at) {
      const draft = documentOf(changes, emptyText) ?? null
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into content.places (store_id, slug, latitude, longitude, address, maps_link, weekly_hours, stay_tag, interests,
                                    must_visit, cover_media_id, main_story_group_id, draft, created_at, updated_at)
        values (${storeId}, ${json(changes.slug ?? null)}::jsonb, ${changes.latitude ?? null}, ${changes.longitude ?? null},
                ${changes.address ?? null}, ${changes.mapsLink ?? null}, ${JSON.stringify(changes.weeklyHours ?? [])}::jsonb, ${changes.stayTag ?? 'both'},
                ${sql.param(changes.interests ?? [])}::text[], ${changes.mustVisit ?? false},
                ${changes.coverMediaId ?? null},
                ${changes.mainStoryGroupId ?? null}, ${json(draft)}::jsonb, ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceLists(tx, storeId, id, changes)
      return reload(tx, { storeId, id })
    },

    findForUpdate: (tx, storeId, pinId) => load(tx, storeId, pinId, true),

    async save(tx, pin, changes, at) {
      const draft = documentOf(changes, pin.draft ?? pin.published ?? emptyText)
      const has = <K extends keyof PinChanges>(key: K) => changes[key] !== undefined
      await tx.execute(sql`
        update content.places set
          slug = ${json(has('slug') ? changes.slug ?? null : pin.slug)}::jsonb,
          latitude = ${has('latitude') ? changes.latitude : pin.latitude},
          longitude = ${has('longitude') ? changes.longitude : pin.longitude},
          address = ${has('address') ? changes.address : pin.address},
          maps_link = ${has('mapsLink') ? changes.mapsLink : pin.mapsLink},
          weekly_hours = ${JSON.stringify(changes.weeklyHours ?? pin.weeklyHours)}::jsonb,
          stay_tag = ${changes.stayTag ?? pin.stayTag},
          interests = ${sql.param(changes.interests ?? pin.interests)}::text[],
          must_visit = ${changes.mustVisit ?? pin.mustVisit},
          cover_media_id = ${has('coverMediaId') ? changes.coverMediaId : pin.coverMediaId},
          main_story_group_id = ${has('mainStoryGroupId') ? changes.mainStoryGroupId : pin.mainStoryGroupId},
          draft = ${draft ? JSON.stringify(draft) : pin.draft && JSON.stringify(toDocument(pin.draft))}::jsonb,
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${pin.storeId} and id = ${pin.id}`)
      await replaceLists(tx, pin.storeId, pin.id, changes)
      return reload(tx, pin)
    },

    async publish(tx, pin, at, slug) {
      await tx.execute(sql`
        update content.places set status = 'published', published = coalesce(draft, published), draft = null,
          slug = ${json(slug)}::jsonb, first_published_at = coalesce(first_published_at, ${at}), row_version = row_version + 1, updated_at = ${at}
        where store_id = ${pin.storeId} and id = ${pin.id}`)
      return reload(tx, pin)
    },

    async hide(tx, pin, at) {
      await tx.execute(sql`
        update content.places set status = 'hidden', row_version = row_version + 1, updated_at = ${at}
        where store_id = ${pin.storeId} and id = ${pin.id}`)
      return reload(tx, pin)
    },

    async usage(tx, storeId, pinId) {
      const { rows } = await tx.execute<{ stories: number, reviews: number, tours: number }>(sql`
        select
          (select count(*)::int from content.story_group_places where store_id = ${storeId} and place_id = ${pinId}) as stories,
          (select count(*)::int from content.story_groups where store_id = ${storeId} and subject_place_id = ${pinId}) as reviews,
          (select count(distinct tour_id)::int from content.tour_stops where store_id = ${storeId} and place_id = ${pinId}) as tours`)
      return rows[0]!
    },

    async remove(tx, storeId, pinId) {
      const deleted = await tx.execute(sql`delete from content.places where store_id = ${storeId} and id = ${pinId} returning id`)
      return deleted.rows.length > 0
    },
    find: (tx, storeId, pinId) => load(tx, storeId, pinId, false),

    async lockSlugs(tx) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('content.places.slug', 0))`)
    },

    async slugsTaken(tx, language, exceptPinId) {
      const found = await tx.execute<{ taken: string }>(sql`
        select slug->>${language}::text as taken from content.places
         where slug ? ${language}::text${exceptPinId ? sql` and id <> ${exceptPinId}` : sql``}`)
      return new Set(found.rows.map(row => row.taken))
    },

    list: (tx, storeId, query, now) => listPage(tx, storeId, query, now),

    storyOptions: (tx, storeId, query) => storyOptionRows(tx, storeId, query),

    async idsInStore(tx, storeId, ids) {
      const found = await tx.execute<{ id: string }>(sql`
        select id from content.places where store_id = ${storeId} and id = any(${sql.param(ids)}::uuid[])`)
      return found.rows.map(row => row.id)
    },
  }
}
