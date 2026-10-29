import type { Pin, PinDate, PinDraft, PinStoryOption } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { PinChanges, PinListRow, PinRepository } from '../ports.ts'
import { sql } from 'drizzle-orm'

// The document stores the title under `name`: places_published_fields_check reads published->'name'.
interface PinDocument { name?: PinDraft['title'], tip?: PinDraft['tip'], localTip?: PinDraft['localTip'] }

interface PinRow {
  id: string
  store_id: string
  status: Pin['status']
  slug: Pin['slug']
  latitude: number | null
  longitude: number | null
  address: string | null
  weekly_hours: Pin['weeklyHours']
  stay_tag: Pin['stayTag']
  interests: string[]
  service_type: Pin['serviceType']
  must_visit: boolean
  food_kind: Pin['foodKind']
  cover_media_id: string | null
  cover_alt: Pin['coverAlt']
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

const columns = sql`id, store_id, status, slug, latitude, longitude, address, weekly_hours, stay_tag, interests,
  service_type, must_visit, food_kind, cover_media_id, cover_alt, main_story_group_id, draft, published,
  first_published_at, row_version, created_at, updated_at`

function toDraft(document: PinDocument | null): PinDraft | null {
  return document ? { title: document.name ?? {}, tip: document.tip ?? {}, localTip: document.localTip ?? {} } : null
}

const toDocument = (draft: PinDraft) => ({ name: draft.title, tip: draft.tip, localTip: draft.localTip })

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
  const photos = await tx.execute<{ mediaId: string, alt: Pin['coverAlt'] }>(sql`
    select media_id as "mediaId", alt from content.place_photos where store_id = ${storeId} and place_id = ${pinId} order by position`)
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
    weeklyHours: row.weekly_hours,
    stayTag: row.stay_tag,
    interests: row.interests,
    serviceType: row.service_type,
    mustVisit: row.must_visit,
    foodKind: row.food_kind,
    coverMediaId: row.cover_media_id,
    coverAlt: row.cover_alt,
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
      const values = changes.photos.map((photo, index) => sql`(${pinId}, ${storeId}, ${index + 1}, ${photo.mediaId}, ${JSON.stringify(photo.alt)}::jsonb)`)
      await tx.execute(sql`
        insert into content.place_photos (place_id, store_id, position, media_id, alt) values ${sql.join(values, sql`, `)}`)
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
  draft: PinDocument | null
  published: PinDocument | null
  row_version: number
  updated_at: Date
  dates: PinDate[]
  category_ids: string[]
}

// One query for the whole list: the dates and category ids are aggregated per pin, so a store with hundreds of pins is one round trip.
async function listRows(tx: Tx, storeId: string): Promise<PinListRow[]> {
  const found = await tx.execute<ListRow & Record<string, unknown>>(sql`
    select p.id, p.status, p.slug, p.latitude, p.longitude, p.stay_tag, p.interests, p.cover_media_id, p.main_story_group_id,
           p.draft, p.published, p.row_version, p.updated_at,
           coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'firstDay', d.first_day::text, 'lastDay', d.last_day::text,
                                                          'startTime', to_char(d.start_time, 'HH24:MI'), 'endTime', to_char(d.end_time, 'HH24:MI'))
                                      order by d.first_day, d.start_time nulls first, d.id)
                       from content.place_dates d where d.place_id = p.id), '[]'::jsonb) as dates,
           coalesce((select array_agg(c.category_id::text order by c.category_id) from content.place_categories c where c.place_id = p.id), '{}'::text[]) as category_ids,
           exists (select 1 from content.story_versions v where v.group_id = p.main_story_group_id and v.status = 'published') as main_story_published
      from content.places p
     where p.store_id = ${storeId}
     order by p.updated_at desc, p.id`)
  return found.rows.map(row => ({
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
    mainStoryGroupId: row.main_story_group_id,
    mainStoryPublished: row.main_story_published,
    rowVersion: row.row_version,
    updatedAt: new Date(row.updated_at),
  }))
}

async function storyOptionRows(tx: Tx, storeId: string): Promise<PinStoryOption[]> {
  const found = await tx.execute<{ group_id: string, kind: PinStoryOption['kind'], title: PinStoryOption['title'], published_languages: PinStoryOption['publishedLanguages'] } & Record<string, unknown>>(sql`
    select g.id as group_id, g.kind,
           coalesce(jsonb_object_agg(v.language, coalesce(v.published->>'title', v.draft->>'title'))
                    filter (where coalesce(v.published->>'title', v.draft->>'title') is not null), '{}'::jsonb) as title,
           coalesce(array_agg(v.language order by v.language) filter (where v.status = 'published'), '{}'::text[]) as published_languages
      from content.story_groups g
      left join content.story_versions v on v.group_id = g.id and v.store_id = g.store_id
     where g.store_id = ${storeId}
     group by g.id, g.kind, g.created_at
     order by g.created_at desc, g.id`)
  return found.rows.map(row => ({ groupId: row.group_id, kind: row.kind, title: row.title, publishedLanguages: row.published_languages }))
}

export function createPinRepository(): PinRepository<Tx> {
  return {
    async insert(tx, storeId, changes, at) {
      const draft = changes.title || changes.tip || changes.localTip ? { name: changes.title ?? {}, tip: changes.tip ?? {}, localTip: changes.localTip ?? {} } : null
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into content.places (store_id, slug, latitude, longitude, address, weekly_hours, stay_tag, interests,
                                    service_type, must_visit, food_kind, cover_media_id, cover_alt, main_story_group_id, draft, created_at, updated_at)
        values (${storeId}, ${json(changes.slug ?? null)}::jsonb, ${changes.latitude ?? null}, ${changes.longitude ?? null},
                ${changes.address ?? null}, ${JSON.stringify(changes.weeklyHours ?? [])}::jsonb, ${changes.stayTag ?? 'both'},
                ${sql.param(changes.interests ?? [])}::text[], ${changes.serviceType ?? null}, ${changes.mustVisit ?? false},
                ${changes.foodKind ?? null}, ${changes.coverMediaId ?? null}, ${JSON.stringify(changes.coverAlt ?? {})}::jsonb,
                ${changes.mainStoryGroupId ?? null}, ${json(draft)}::jsonb, ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceLists(tx, storeId, id, changes)
      return reload(tx, { storeId, id })
    },

    findForUpdate: (tx, storeId, pinId) => load(tx, storeId, pinId, true),

    async save(tx, pin, changes, at) {
      const base = pin.draft ?? pin.published ?? { title: {}, tip: {}, localTip: {} }
      const draft = changes.title || changes.tip || changes.localTip
        ? { name: changes.title ?? base.title, tip: changes.tip ?? base.tip, localTip: changes.localTip ?? base.localTip }
        : undefined
      const has = <K extends keyof PinChanges>(key: K) => changes[key] !== undefined
      await tx.execute(sql`
        update content.places set
          slug = ${json(has('slug') ? changes.slug ?? null : pin.slug)}::jsonb,
          latitude = ${has('latitude') ? changes.latitude : pin.latitude},
          longitude = ${has('longitude') ? changes.longitude : pin.longitude},
          address = ${has('address') ? changes.address : pin.address},
          weekly_hours = ${JSON.stringify(changes.weeklyHours ?? pin.weeklyHours)}::jsonb,
          stay_tag = ${changes.stayTag ?? pin.stayTag},
          interests = ${sql.param(changes.interests ?? pin.interests)}::text[],
          service_type = ${has('serviceType') ? changes.serviceType : pin.serviceType},
          must_visit = ${changes.mustVisit ?? pin.mustVisit},
          food_kind = ${has('foodKind') ? changes.foodKind : pin.foodKind},
          cover_media_id = ${has('coverMediaId') ? changes.coverMediaId : pin.coverMediaId},
          cover_alt = ${JSON.stringify(changes.coverAlt ?? pin.coverAlt)}::jsonb,
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

    async remove(tx, storeId, pinId) {
      const deleted = await tx.execute(sql`delete from content.places where store_id = ${storeId} and id = ${pinId} returning id`)
      return deleted.rows.length > 0
    },
    find: (tx, storeId, pinId) => load(tx, storeId, pinId, false),

    list: (tx, storeId) => listRows(tx, storeId),

    storyOptions: (tx, storeId) => storyOptionRows(tx, storeId),

    async idsInStore(tx, storeId, ids) {
      const found = await tx.execute<{ id: string }>(sql`
        select id from content.places where store_id = ${storeId} and id = any(${sql.param(ids)}::uuid[])`)
      return found.rows.map(row => row.id)
    },
  }
}
