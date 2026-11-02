import type { ContentLanguage, Localized, PinDate, StayTag, TourGuideDoc } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { PublicCategoryRow, PublicPinDetailRow, PublicPinRow, PublicReadRepository, PublicStoryRow, PublicTourRow, StoredStoryDoc } from '../read-ports.ts'
import { sql } from 'drizzle-orm'
import { publishedStoryMediaIds } from './story-media-ids.ts'

interface VersionJoinRow {
  id: string
  store_id: string
  stay_tag: StayTag
  interests: string[]
  language: ContentLanguage
  slug: string
  published: StoredStoryDoc
  published_at: Date
}

interface CategoryJoinRow {
  group_id: string
  id: string
  slug: string
  name: PublicCategoryRow['name']
  parent_id: string | null
  position: number
}

// Published versions of the groups (all of them, or the ones named), with the blog categories and the ready media keys.
async function loadStories(tx: Tx, groupIds: string[] | null): Promise<PublicStoryRow[]> {
  if (groupIds?.length === 0)
    return []
  const versions = await tx.execute<VersionJoinRow & Record<string, unknown>>(sql`
    select g.id, g.store_id, g.stay_tag, g.interests, v.language, v.slug, v.published, v.published_at
      from content.story_versions v
      join content.story_groups g on g.store_id = v.store_id and g.id = v.group_id
     where v.status = 'published' and v.published is not null${groupIds ? sql` and g.id = any(${sql.param(groupIds)}::uuid[])` : sql``}
     order by v.published_at desc, g.id desc, v.language`)
  if (versions.rows.length === 0)
    return []

  const foundIds = [...new Set(versions.rows.map(r => r.id))]
  const storeIds = [...new Set(versions.rows.map(r => r.store_id))]
  const mediaIds = [...new Set(versions.rows.flatMap(r => publishedStoryMediaIds(r.published)))]

  const categoryRows = await tx.execute<CategoryJoinRow & Record<string, unknown>>(sql`
    select sc.group_id, c.id, c.slug, c.name, c.parent_id, c.position
      from content.story_categories sc
      join content.blog_categories c on c.store_id = sc.store_id and c.id = sc.category_id
     where sc.group_id = any(${sql.param(foundIds)}::uuid[])
     order by c.parent_id nulls first, c.position, c.id`)
  const media = mediaIds.length === 0
    ? { rows: [] as { id: string, store_id: string, storage_key: string }[] }
    : await tx.execute<{ id: string, store_id: string, storage_key: string } & Record<string, unknown>>(sql`
        select id, store_id, storage_key from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and store_id = any(${sql.param(storeIds)}::uuid[]) and status = 'ready'`)
  // A story only resolves media of its own store.
  const keys = new Map(media.rows.map(m => [`${m.store_id}/${m.id}`, m.storage_key]))

  const stories = new Map<string, PublicStoryRow>()
  for (const row of versions.rows) {
    let story = stories.get(row.id)
    if (!story) {
      story = {
        id: row.id,
        stayTag: row.stay_tag,
        interests: row.interests,
        categories: categoryRows.rows.filter(c => c.group_id === row.id).map(c => ({ id: c.id, slug: c.slug, name: c.name, parentId: c.parent_id, position: c.position })),
        versions: [],
      }
      stories.set(row.id, story)
    }
    story.versions.push({
      language: row.language,
      slug: row.slug,
      published: row.published,
      publishedAt: new Date(row.published_at),
      mediaKeys: Object.fromEntries(publishedStoryMediaIds(row.published).flatMap(id => (keys.has(`${row.store_id}/${id}`) ? [[id, keys.get(`${row.store_id}/${id}`)!]] : []))),
    })
  }
  return [...stories.values()]
}

interface PinJoinRow {
  id: string
  slug: Localized | null
  latitude: number
  longitude: number
  address: string | null
  maps_link: string | null
  weekly_hours: PublicPinRow['weeklyHours']
  stay_tag: StayTag
  interests: string[]
  published: { name?: Localized, tip?: Localized }
  cover_media_id: string | null
  main_story_group_id: string | null
  first_published_at: Date
}

type DateJoinRow = PinDate & { place_id: string }

function asCategory(c: { id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, position: number }): PublicCategoryRow {
  return { id: c.id, slug: c.slug, name: c.name, parentId: c.parent_id, position: c.position }
}

function byPlace<V extends { place_id: string }>(rows: V[]) {
  const grouped = new Map<string, V[]>()
  for (const row of rows)
    grouped.set(row.place_id, [...(grouped.get(row.place_id) ?? []), row])
  return grouped
}

// Pins that content.public_pins lets through, newest first. Dates, categories, main stories and cover keys come in
// four more queries for all pins together, never one per pin.
async function loadPins(tx: Tx, pinId: string | null): Promise<PublicPinRow[]> {
  const pins = await tx.execute<PinJoinRow & Record<string, unknown>>(sql`
    select v.id, v.slug, v.latitude, v.longitude, v.address, p.maps_link, v.weekly_hours, v.stay_tag, v.interests, v.published,
           v.cover_media_id, v.main_story_group_id, p.first_published_at
      from content.public_pins v
      join content.places p on p.id = v.id and p.status = 'published'${pinId ? sql` where v.id = ${pinId}` : sql``}
     order by p.first_published_at desc, v.id desc`)
  if (pins.rows.length === 0)
    return []

  const ids = pins.rows.map(r => r.id)
  const groupIds = [...new Set(pins.rows.flatMap(r => (r.main_story_group_id ? [r.main_story_group_id] : [])))]
  const coverIds = [...new Set(pins.rows.flatMap(r => (r.cover_media_id ? [r.cover_media_id] : [])))]

  const dates = await tx.execute<DateJoinRow & Record<string, unknown>>(sql`
    select id, place_id, first_day::text as "firstDay", last_day::text as "lastDay",
           to_char(start_time, 'HH24:MI') as "startTime", to_char(end_time, 'HH24:MI') as "endTime"
      from content.place_dates where place_id = any(${sql.param(ids)}::uuid[])
     order by first_day, start_time nulls first, id`)
  const tagged = await tx.execute<{ place_id: string, id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, position: number } & Record<string, unknown>>(sql`
    select pc.place_id, c.id, c.slug, c.name, c.parent_id, c.position
      from content.place_categories pc
      join content.map_categories c on c.store_id = pc.store_id and c.id = pc.category_id
     where pc.place_id = any(${sql.param(ids)}::uuid[])
     order by c.parent_id nulls first, c.position, c.id`)
  const parentIds = [...new Set(tagged.rows.flatMap(r => (r.parent_id ? [r.parent_id] : [])))]
  const parents = parentIds.length === 0
    ? []
    : (await tx.execute<{ id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, position: number } & Record<string, unknown>>(sql`
        select id, slug, name, parent_id, position from content.map_categories where id = any(${sql.param(parentIds)}::uuid[])`)).rows
  const stories = groupIds.length === 0
    ? []
    : (await tx.execute<{ group_id: string, language: ContentLanguage, slug: string } & Record<string, unknown>>(sql`
        select group_id, language, slug from content.story_versions
         where status = 'published' and published is not null and group_id = any(${sql.param(groupIds)}::uuid[])`)).rows
  const covers = coverIds.length === 0
    ? []
    : (await tx.execute<{ id: string, storage_key: string, width: number | null } & Record<string, unknown>>(sql`
        select id, storage_key, width from content.media where id = any(${sql.param(coverIds)}::uuid[]) and status = 'ready'`)).rows

  const datesOf = byPlace(dates.rows)
  const taggedOf = byPlace(tagged.rows)
  const coverOf = new Map(covers.map(m => [m.id, m]))
  return pins.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    mapsLink: row.maps_link,
    weeklyHours: row.weekly_hours,
    stayTag: row.stay_tag,
    interests: row.interests,
    name: row.published.name ?? {},
    tip: row.published.tip ?? {},
    firstPublishedAt: new Date(row.first_published_at),
    photoKey: (row.cover_media_id && coverOf.get(row.cover_media_id)?.storage_key) || null,
    photoWidth: (row.cover_media_id && coverOf.get(row.cover_media_id)?.width) || null,
    dates: (datesOf.get(row.id) ?? []).map(({ place_id: _placeId, ...date }) => date),
    categories: (taggedOf.get(row.id) ?? []).map(asCategory),
    parentCategories: parents.filter(p => (taggedOf.get(row.id) ?? []).some(c => c.parent_id === p.id)).map(asCategory),
    mainStorySlugs: Object.fromEntries(stories.filter(v => v.group_id === row.main_story_group_id).map(v => [v.language, v.slug])),
  }))
}

interface PinExtrasRow {
  cover_media_id: string | null
  main_story_group_id: string | null
  published: { coverAlt?: Localized, photoAlt?: Record<string, Localized> }
}

// What a pin's own read adds: its outbound link, the cover and the extra photos in order (ready media only), and the
// stories that tag it. One round of queries for one pin, none of it in the list.
async function loadPinExtras(tx: Tx, pinId: string): Promise<Pick<PublicPinDetailRow, 'link' | 'photos' | 'stories' | 'mainStoryId'>> {
  const own = (await tx.execute<PinExtrasRow & Record<string, unknown>>(sql`
    select cover_media_id, main_story_group_id, published from content.places where id = ${pinId}`)).rows[0]
  // One connection runs one query at a time inside a transaction, so these go one after the other.
  const links = await tx.execute<{ url: string } & Record<string, unknown>>(sql`select url from content.place_links where place_id = ${pinId}`)
  const extra = await tx.execute<{ media_id: string } & Record<string, unknown>>(sql`select media_id from content.place_photos where place_id = ${pinId} order by position`)
  const tagged = await tx.execute<{ group_id: string } & Record<string, unknown>>(sql`select group_id from content.story_group_places where place_id = ${pinId}`)
  const mediaIds = [...new Set([...(own?.cover_media_id ? [own.cover_media_id] : []), ...extra.rows.map(r => r.media_id)])]
  const media = mediaIds.length === 0
    ? []
    : (await tx.execute<{ id: string, storage_key: string, width: number | null } & Record<string, unknown>>(sql`
        select id, storage_key, width from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and status = 'ready'`)).rows
  const files = new Map(media.map(m => [m.id, m]))
  const alt = (mediaId: string): Localized => (mediaId === own?.cover_media_id ? own.published.coverAlt : own?.published.photoAlt?.[mediaId]) ?? {}
  const mainStoryId = own?.main_story_group_id ?? null

  return {
    link: links.rows[0]?.url ?? null,
    photos: mediaIds.flatMap(mediaId => (files.has(mediaId) ? [{ key: files.get(mediaId)!.storage_key, width: files.get(mediaId)!.width, alt: alt(mediaId) }] : [])),
    stories: await loadStories(tx, [...new Set([...(mainStoryId ? [mainStoryId] : []), ...tagged.rows.map(r => r.group_id)])]),
    mainStoryId,
  }
}

interface TourJoinRow {
  id: string
  slug: Localized
  stay_tag: StayTag
  interests: string[]
  duration_minutes: number | null
  published: TourGuideDoc
  cover_media_id: string | null
  pdf_media_id: string | null
}

interface StopJoinRow {
  tour_id: string
  position: number
  latitude: number
  longitude: number
  content: { title?: Localized, text?: Localized }
  minutes_from_start: number | null
  media_id: string | null
  visible_place_id: string | null
}

// Published guides, newest first. Stops are only read for a detail (`withStops`); keepsake links and the ready media
// keys come in one query each for all guides.
async function loadTours(tx: Tx, tourId: string | null, withStops: boolean): Promise<PublicTourRow[]> {
  const tours = await tx.execute<TourJoinRow & Record<string, unknown>>(sql`
    select id, slug, stay_tag, interests, duration_minutes, published, cover_media_id, pdf_media_id
      from content.tours
     where status = 'published' and published is not null${tourId ? sql` and id = ${tourId}` : sql``}
     order by id desc`)
  if (tours.rows.length === 0)
    return []

  const ids = tours.rows.map(t => t.id)
  const stops = withStops
    ? (await tx.execute<StopJoinRow & Record<string, unknown>>(sql`
        select s.tour_id, s.position, s.latitude, s.longitude, s.content, s.minutes_from_start, s.media_id, pp.id as visible_place_id
          from content.tour_stops s
          left join content.public_pins pp on pp.id = s.place_id
         where s.tour_id = any(${sql.param(ids)}::uuid[])
         order by s.tour_id, s.position`)).rows
    : []
  const links = await tx.execute<{ tour_id: string, product_id: string } & Record<string, unknown>>(sql`
    select tour_id, product_id from content.tour_keepsake_links where tour_id = any(${sql.param(ids)}::uuid[]) order by tour_id, position`)
  const mediaIds = [...new Set([
    ...tours.rows.flatMap(t => [t.cover_media_id, t.pdf_media_id]),
    ...stops.map(s => s.media_id),
  ].filter((m): m is string => m !== null))]
  const media = mediaIds.length === 0
    ? []
    : (await tx.execute<{ id: string, storage_key: string } & Record<string, unknown>>(sql`
        select id, storage_key from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and status = 'ready'`)).rows
  const keys = new Map(media.map(m => [m.id, m.storage_key]))
  const keyOf = (id: string | null) => (id ? keys.get(id) ?? null : null)

  return tours.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    stayTag: row.stay_tag,
    interests: row.interests,
    durationMinutes: row.duration_minutes,
    title: row.published.title ?? {},
    summary: row.published.summary ?? {},
    meetingPoint: row.published.meetingPoint ?? {},
    sections: Array.isArray(row.published.sections) ? row.published.sections : [],
    coverKey: keyOf(row.cover_media_id),
    pdfKey: keyOf(row.pdf_media_id),
    keepsakeProductIds: links.rows.filter(l => l.tour_id === row.id).map(l => l.product_id),
    stops: stops.filter(s => s.tour_id === row.id).map(s => ({
      position: s.position,
      latitude: s.latitude,
      longitude: s.longitude,
      title: s.content.title ?? {},
      text: s.content.text ?? {},
      minutesFromStart: s.minutes_from_start,
      key: keyOf(s.media_id),
      placeId: s.visible_place_id,
    })),
  }))
}

export function createPublicReadRepository(): PublicReadRepository<Tx> {
  return {
    listPublishedStories: tx => loadStories(tx, null),

    async findPublishedStoryBySlug(tx, slug, language) {
      // Slugs are per language, so each language has at most one match; the asked language wins.
      const found = await tx.execute<{ group_id: string }>(sql`
        select group_id from content.story_versions
         where status = 'published' and slug = ${slug}
         order by (language = ${language}) desc limit 1`)
      const groupId = found.rows[0]?.group_id
      return groupId ? (await loadStories(tx, [groupId]))[0] : undefined
    },

    async listCategories(tx, kind) {
      const table = kind === 'map' ? sql`content.map_categories` : sql`content.blog_categories`
      const result = await tx.execute<{ id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, position: number }>(sql`
        select id, slug, name, parent_id, position from ${table}
         order by parent_id nulls first, position, id`)
      return result.rows.map(r => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, position: r.position }))
    },

    listVisiblePins: tx => loadPins(tx, null),

    async findVisiblePin(tx, id) {
      const row = (await loadPins(tx, id))[0]

      return row && { ...row, ...(await loadPinExtras(tx, id)) }
    },

    listPublishedTours: tx => loadTours(tx, null, false),

    async findPublishedTourBySlug(tx, slug, language) {
      const found = await tx.execute<{ id: string }>(sql`
        select id from content.tours
         where status = 'published' and published is not null and (slug->>'en' = ${slug} or slug->>'de' = ${slug})
         order by coalesce(slug->>${language} = ${slug}, false) desc limit 1`)
      const id = found.rows[0]?.id
      return id ? (await loadTours(tx, id, true))[0] : undefined
    },
  }
}
