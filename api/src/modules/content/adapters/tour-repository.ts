import type { Localized, TourGuide, TourGuideDoc, TourGuideStop } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { TourChanges, TourRepository } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface TourRow {
  id: string
  store_id: string
  status: TourGuide['status']
  slug: Localized | null
  stay_tag: TourGuide['stayTag']
  interests: string[]
  duration_minutes: number | null
  cover_media_id: string | null
  pdf_media_id: string | null
  draft: TourGuideDoc | null
  published: TourGuideDoc | null
  row_version: number
  created_at: Date
  updated_at: Date
}

interface StopRow {
  id: string
  position: number
  latitude: number
  longitude: number
  content: { title?: Localized, text?: Localized }
  minutes_from_start: number | null
  media_id: string | null
  place_id: string | null
}

const columns = sql`id, store_id, status, slug, stay_tag, interests, duration_minutes, cover_media_id, pdf_media_id,
  draft, published, row_version, created_at, updated_at`

const json = (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value))

async function load(tx: Tx, storeId: string, tourId: string, lock: boolean): Promise<TourGuide | undefined> {
  const found = await tx.execute<TourRow & Record<string, unknown>>(sql`
    select ${columns} from content.tours where store_id = ${storeId} and id = ${tourId}${lock ? sql` for update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  const stops = await tx.execute<StopRow & Record<string, unknown>>(sql`
    select id, position, latitude, longitude, content, minutes_from_start, media_id, place_id
      from content.tour_stops where store_id = ${storeId} and tour_id = ${tourId} order by position`)
  const links = await tx.execute<{ id: string }>(sql`
    select product_id as id from content.tour_keepsake_links where store_id = ${storeId} and tour_id = ${tourId} order by position`)
  return {
    id: row.id,
    storeId: row.store_id,
    status: row.status,
    slug: row.slug,
    stayTag: row.stay_tag,
    interests: row.interests,
    durationMinutes: row.duration_minutes,
    coverMediaId: row.cover_media_id,
    pdfMediaId: row.pdf_media_id,
    keepsakeProductIds: links.rows.map(l => l.id),
    stops: stops.rows.map((s): TourGuideStop => ({
      id: s.id,
      position: s.position,
      latitude: s.latitude,
      longitude: s.longitude,
      title: s.content.title ?? {},
      text: s.content.text ?? {},
      minutesFromStart: s.minutes_from_start,
      mediaId: s.media_id,
      placeId: s.place_id,
    })),
    draft: row.draft,
    published: row.published,
    rowVersion: row.row_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// Stops are replaced as a list. The (tour_id, position) unique constraint is deferred, so the delete and the
// insert in one transaction cannot collide, and every position is 1.. in the order given.
async function replaceLists(tx: Tx, storeId: string, tourId: string, changes: TourChanges, at: Date): Promise<void> {
  if (changes.stops) {
    await tx.execute(sql`delete from content.tour_stops where store_id = ${storeId} and tour_id = ${tourId}`)
    if (changes.stops.length > 0) {
      const values = changes.stops.map((s, i) => sql`(${tourId}, ${storeId}, ${i + 1}, ${s.latitude}, ${s.longitude},
        ${JSON.stringify({ title: s.title, text: s.text })}::jsonb, ${s.minutesFromStart}, ${s.mediaId}, ${s.placeId}, ${at}, ${at})`)
      await tx.execute(sql`
        insert into content.tour_stops (tour_id, store_id, position, latitude, longitude, content, minutes_from_start, media_id, place_id, created_at, updated_at)
        values ${sql.join(values, sql`, `)}`)
    }
  }
  if (changes.keepsakeProductIds) {
    await tx.execute(sql`delete from content.tour_keepsake_links where store_id = ${storeId} and tour_id = ${tourId}`)
    if (changes.keepsakeProductIds.length > 0) {
      await tx.execute(sql`
        insert into content.tour_keepsake_links (tour_id, store_id, position, product_id)
        select ${tourId}, ${storeId}, t.ord, t.p
          from unnest(${sql.param(changes.keepsakeProductIds)}::uuid[]) with ordinality as t(p, ord)`)
    }
  }
}

function reload(tx: Tx, tour: Pick<TourGuide, 'storeId' | 'id'>): Promise<TourGuide> {
  return load(tx, tour.storeId, tour.id, false).then(found => found!)
}

const emptyDoc: TourGuideDoc = { title: {}, summary: {}, meetingPoint: {}, sections: [] }

// A save changes the fields it names and keeps the rest of the stored draft (or, with no draft, the published text).
export function mergeDraft(base: TourGuideDoc | null, changes: Partial<TourGuideDoc> | undefined): TourGuideDoc | null {
  if (changes === undefined)
    return base
  const from = base ?? emptyDoc
  return {
    title: changes.title ?? from.title,
    summary: changes.summary ?? from.summary,
    meetingPoint: changes.meetingPoint ?? from.meetingPoint,
    sections: changes.sections ?? from.sections,
  }
}

export function createTourRepository(): TourRepository<Tx> {
  return {
    async insert(tx, storeId, changes, at) {
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into content.tours (store_id, slug, stay_tag, interests, duration_minutes, cover_media_id, pdf_media_id, draft, created_at, updated_at)
        values (${storeId}, ${json(changes.slug)}::jsonb, ${changes.stayTag ?? 'both'}, ${sql.param(changes.interests ?? [])}::text[],
                ${changes.durationMinutes ?? null}, ${changes.coverMediaId ?? null}, ${changes.pdfMediaId ?? null},
                ${json(mergeDraft(null, changes.draft))}::jsonb, ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceLists(tx, storeId, id, changes, at)
      return reload(tx, { storeId, id })
    },

    findForUpdate: (tx, storeId, tourId) => load(tx, storeId, tourId, true),

    async save(tx, tour, changes, at) {
      const has = <K extends keyof TourChanges>(key: K) => changes[key] !== undefined
      await tx.execute(sql`
        update content.tours set
          slug = ${json(has('slug') ? changes.slug : tour.slug)}::jsonb,
          stay_tag = ${changes.stayTag ?? tour.stayTag},
          interests = ${sql.param(changes.interests ?? tour.interests)}::text[],
          duration_minutes = ${has('durationMinutes') ? changes.durationMinutes : tour.durationMinutes},
          cover_media_id = ${has('coverMediaId') ? changes.coverMediaId : tour.coverMediaId},
          pdf_media_id = ${has('pdfMediaId') ? changes.pdfMediaId : tour.pdfMediaId},
          draft = ${json(mergeDraft(tour.draft ?? tour.published, changes.draft))}::jsonb,
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${tour.storeId} and id = ${tour.id}`)
      await replaceLists(tx, tour.storeId, tour.id, changes, at)
      return reload(tx, tour)
    },

    async publish(tx, tour, at) {
      await tx.execute(sql`
        update content.tours set status = 'published', published = coalesce(draft, published), draft = null,
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${tour.storeId} and id = ${tour.id}`)
      return reload(tx, tour)
    },

    async unpublish(tx, tour, at) {
      await tx.execute(sql`
        update content.tours set status = 'draft', row_version = row_version + 1, updated_at = ${at}
        where store_id = ${tour.storeId} and id = ${tour.id}`)
      return reload(tx, tour)
    },

    async remove(tx, storeId, tourId) {
      const deleted = await tx.execute(sql`delete from content.tours where store_id = ${storeId} and id = ${tourId} returning id`)
      return deleted.rows.length > 0
    },
  }
}
