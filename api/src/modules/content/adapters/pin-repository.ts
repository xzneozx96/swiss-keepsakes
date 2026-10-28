import type { Pin, PinDate, PinDraft } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { PinChanges, PinRepository } from '../ports.ts'
import { sql } from 'drizzle-orm'

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
  cover_media_id: string | null
  main_story_group_id: string | null
  draft: { name?: PinDraft['title'], tip?: PinDraft['tip'] } | null
  published: { name?: PinDraft['title'], tip?: PinDraft['tip'] } | null
  first_published_at: Date | null
  row_version: number
  created_at: Date
  updated_at: Date
}

// A mapped type, not the interface: execute<> wants an index signature.
type DateRow = { [K in keyof PinDate]: PinDate[K] }

const columns = sql`id, store_id, status, slug, latitude, longitude, address, weekly_hours, stay_tag, interests,
  cover_media_id, main_story_group_id, draft, published, first_published_at, row_version, created_at, updated_at`

// The document stores the title under `name`: places_published_fields_check reads published->'name'.
function toDraft(document: PinRow['draft']): PinDraft | null {
  return document ? { title: document.name ?? {}, tip: document.tip ?? {} } : null
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
    coverMediaId: row.cover_media_id,
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

export function createPinRepository(): PinRepository<Tx> {
  return {
    async insert(tx, storeId, changes, at) {
      const draft = changes.title || changes.tip ? { name: changes.title ?? {}, tip: changes.tip ?? {} } : null
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into content.places (store_id, slug, latitude, longitude, address, weekly_hours, stay_tag, interests,
                                    cover_media_id, main_story_group_id, draft, created_at, updated_at)
        values (${storeId}, ${json(changes.slug ?? null)}::jsonb, ${changes.latitude ?? null}, ${changes.longitude ?? null},
                ${changes.address ?? null}, ${JSON.stringify(changes.weeklyHours ?? [])}::jsonb, ${changes.stayTag ?? 'both'},
                ${sql.param(changes.interests ?? [])}::text[], ${changes.coverMediaId ?? null}, ${changes.mainStoryGroupId ?? null},
                ${json(draft)}::jsonb, ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceLists(tx, storeId, id, changes)
      return reload(tx, { storeId, id })
    },

    findForUpdate: (tx, storeId, pinId) => load(tx, storeId, pinId, true),

    async save(tx, pin, changes, at) {
      const base = pin.draft ?? pin.published ?? { title: {}, tip: {} }
      const draft = changes.title || changes.tip ? { name: changes.title ?? base.title, tip: changes.tip ?? base.tip } : undefined
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
          cover_media_id = ${has('coverMediaId') ? changes.coverMediaId : pin.coverMediaId},
          main_story_group_id = ${has('mainStoryGroupId') ? changes.mainStoryGroupId : pin.mainStoryGroupId},
          draft = ${draft ? JSON.stringify(draft) : pin.draft && JSON.stringify({ name: pin.draft.title, tip: pin.draft.tip })}::jsonb,
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${pin.storeId} and id = ${pin.id}`)
      await replaceLists(tx, pin.storeId, pin.id, changes)
      return reload(tx, pin)
    },

    async publish(tx, pin, at) {
      await tx.execute(sql`
        update content.places set status = 'published', published = coalesce(draft, published), draft = null,
          first_published_at = coalesce(first_published_at, ${at}), row_version = row_version + 1, updated_at = ${at}
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
  }
}
