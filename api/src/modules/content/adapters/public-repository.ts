import type { CategoryIcon, ContentLanguage, Localized, PinDate, StayTag, TourGuideDoc } from '@sk/domain/content'
import type { SQL } from 'drizzle-orm'
import type { Tx } from '../../../platform/db/client.ts'
import type { PublicCategoryRow, PublicPinDetailRow, PublicPinRow, PublicReadRepository, PublicStoryDetailRow, PublicStoryRow, PublicTourRow, SearchHit, StoredStoryDoc, StoryPageKey, TourPageKey, TourPageQuery } from '../read-ports.ts'
import { sql } from 'drizzle-orm'
import { after as keysAfter, page } from '../../../platform/db/keyset.ts'
import { searchKey, searchOrder, searchTerm } from '../../../platform/db/search.ts'
import { publishedStoryMediaIds } from './story-media-ids.ts'

// The order of the story list: the date of the version carried, then the group id, both newest first.
const storyKey = [{ column: sql`published_at`, cast: 'timestamptz' as const }, { column: sql`id`, cast: 'uuid' as const }]

// The order of the tour list: the tour id, newest first.
const tourKey = [{ column: sql`id`, cast: 'uuid' as const }]

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

// Published versions of the groups named, with the blog categories and the ready media keys.
async function loadStories(tx: Tx, groupIds: string[]): Promise<PublicStoryRow[]> {
  if (groupIds.length === 0)
    return []
  const versions = await tx.execute<VersionJoinRow & Record<string, unknown>>(sql`
    select g.id, g.store_id, g.stay_tag, g.interests, v.language, v.slug, v.published, v.published_at
      from content.story_versions v
      join content.story_groups g on g.store_id = v.store_id and g.id = v.group_id
     where v.status = 'published' and v.published is not null and g.id = any(${sql.param(groupIds)}::uuid[])
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
    ? { rows: [] as { id: string, store_id: string, storage_key: string, width: number | null }[] }
    : await tx.execute<{ id: string, store_id: string, storage_key: string, width: number | null } & Record<string, unknown>>(sql`
        select id, store_id, storage_key, width from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and store_id = any(${sql.param(storeIds)}::uuid[]) and status = 'ready'`)
  // A story only resolves media of its own store.
  const keys = new Map(media.rows.map(m => [`${m.store_id}/${m.id}`, m.storage_key]))
  const widths = new Map(media.rows.map(m => [`${m.store_id}/${m.id}`, m.width]))

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
      mediaWidths: Object.fromEntries(publishedStoryMediaIds(row.published).flatMap(id => (keys.has(`${row.store_id}/${id}`) ? [[id, widths.get(`${row.store_id}/${id}`) ?? null]] : []))),
    })
  }
  return [...stories.values()]
}

// What the story detail adds to the shared row, each in the editor's order (the link tables hold the position). The pins
// go through content.public_pins, so a hidden, draft or fully past pin is absent; a related story with no published
// version is absent too. One connection runs one query at a time inside a transaction, so these go one after another.
async function loadStoryLinks(tx: Tx, groupId: string): Promise<Pick<PublicStoryDetailRow, 'places' | 'related' | 'keepsakeProductIds'>> {
  const tagged = await tx.execute<{ place_id: string } & Record<string, unknown>>(sql`
    select place_id from content.story_group_places where group_id = ${groupId} order by position`)
  const relations = await tx.execute<{ related_group_id: string } & Record<string, unknown>>(sql`
    select related_group_id from content.story_related where group_id = ${groupId} order by position`)
  const keepsakes = await tx.execute<{ product_id: string } & Record<string, unknown>>(sql`
    select product_id from content.story_keepsake_links where group_id = ${groupId} order by position`)
  const pins = await loadPins(tx, tagged.rows.map(r => r.place_id))
  const stories = await loadStories(tx, relations.rows.map(r => r.related_group_id))
  return {
    places: tagged.rows.flatMap(r => pins.filter(pin => pin.id === r.place_id)),
    related: relations.rows.flatMap(r => stories.filter(story => story.id === r.related_group_id)),
    keepsakeProductIds: keepsakes.rows.map(r => r.product_id),
  }
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
  must_visit: boolean
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
async function loadPins(tx: Tx, pinIds: string[] | null): Promise<PublicPinRow[]> {
  if (pinIds?.length === 0)
    return []
  const pins = await tx.execute<PinJoinRow & Record<string, unknown>>(sql`
    select v.id, v.slug, v.latitude, v.longitude, v.address, p.maps_link, v.weekly_hours, v.stay_tag, v.interests, v.published,
           v.cover_media_id, v.main_story_group_id, p.first_published_at, p.must_visit
      from content.public_pins v
      join content.places p on p.id = v.id and p.status = 'published'${pinIds ? sql` where v.id = any(${sql.param(pinIds)}::uuid[])` : sql``}
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
    mustVisit: row.must_visit,
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
  stop_count: number
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
async function loadTours(tx: Tx, tourIds: string[] | null, withStops: boolean, { limit, after }: TourPageQuery = {}): Promise<{ rows: PublicTourRow[], next: TourPageKey | null, total: number }> {
  const found = await tx.execute<TourJoinRow & Record<string, unknown>>(sql`
    select id, slug, stay_tag, interests, duration_minutes, published, cover_media_id, pdf_media_id,
           (select count(*)::int from content.tour_stops s where s.tour_id = content.tours.id) as stop_count
      from content.tours
     where status = 'published' and published is not null${tourIds ? sql` and id = any(${sql.param(tourIds)}::uuid[])` : sql``}${after ? sql` and ${keysAfter(tourKey, after)}` : sql``}
     order by id desc${limit === undefined ? sql`` : sql` limit ${limit + 1}`}`)
  // The extra row only says there is a next page.
  const { items: shown, next } = page(found.rows, limit, (row): TourPageKey => [row.id])
  const tours = { rows: shown }
  if (tours.rows.length === 0)
    return { rows: [], next, total: 0 }

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
    : (await tx.execute<{ id: string, storage_key: string, width: number | null } & Record<string, unknown>>(sql`
        select id, storage_key, width from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and status = 'ready'`)).rows
  const keys = new Map(media.map(m => [m.id, m.storage_key]))
  const widths = new Map(media.map(m => [m.id, m.width]))
  const keyOf = (id: string | null) => (id ? keys.get(id) ?? null : null)

  const rows = tours.rows.map(row => ({
    id: row.id,
    stopCount: row.stop_count,
    slug: row.slug,
    stayTag: row.stay_tag,
    interests: row.interests,
    durationMinutes: row.duration_minutes,
    title: row.published.title ?? {},
    summary: row.published.summary ?? {},
    meetingPoint: row.published.meetingPoint ?? {},
    sections: Array.isArray(row.published.sections) ? row.published.sections : [],
    coverKey: keyOf(row.cover_media_id),
    coverWidth: (row.cover_media_id && widths.get(row.cover_media_id)) || null,
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

  return { rows, next, total: tourIds ? rows.length : (await tx.execute<{ total: number } & Record<string, unknown>>(sql`select count(*)::int as total from content.tours where status = 'published' and published is not null`)).rows[0]?.total ?? 0 }
}

export function createPublicReadRepository(): PublicReadRepository<Tx> {
  return {
    async searchPublished(tx, { q, interest, kinds, limit, after }) {
      const term = q === null ? null : searchTerm(q)
      const matches = (text: SQL, tsv: SQL) => (term ? sql` and ${term.matches(text, tsv)}` : sql``)
      const score = (text: SQL, tsv: SQL) => (term ? term.score(text, tsv) : sql`0::float8`)
      const tagged = (column: SQL) => (interest === null ? sql`` : sql` and ${interest}::text = any(${column})`)
      // One row per hit: a story has a version per language, so its best version counts. A place goes through the public view.
      const hits = sql`hits as (
        select id, kind, max(score) as score from (
          select g.id, 'story'::text as kind, ${score(sql`v.search_text`, sql`v.search_tsv`)} as score
            from content.story_versions v
            join content.story_groups g on g.store_id = v.store_id and g.id = v.group_id
           where v.status = 'published' and v.published is not null${tagged(sql`g.interests`)}${matches(sql`v.search_text`, sql`v.search_tsv`)}
          union all
          select p.id, 'place'::text, ${score(sql`p.search_text`, sql`p.search_tsv`)}
            from content.public_pins pp
            join content.places p on p.id = pp.id
           where p.status = 'published' and p.slug is not null${tagged(sql`p.interests`)}${matches(sql`p.search_text`, sql`p.search_tsv`)}
          union all
          select t.id, 'tour'::text, ${score(sql`t.search_text`, sql`t.search_tsv`)}
            from content.tours t
           where t.status = 'published' and t.published is not null${tagged(sql`t.interests`)}${matches(sql`t.search_text`, sql`t.search_tsv`)}
        ) s group by id, kind)`
      const counted = await tx.execute<{ kind: SearchHit['kind'], n: number } & Record<string, unknown>>(sql`with ${hits} select kind, count(*)::int as n from hits group by kind`)
      const counts = { story: 0, place: 0, tour: 0 }
      for (const row of counted.rows) {
        if (row.kind === 'story' || row.kind === 'place' || row.kind === 'tour')
          counts[row.kind] = row.n
      }
      if (kinds.length === 0 || limit < 1)
        return { hits: [], counts }
      // `score_key` is the text of the rank; ordering by `score` keeps the number.
      const found = await tx.execute<{ id: string, kind: SearchHit['kind'], score_key: string } & Record<string, unknown>>(sql`
        with ${hits}
        select id, kind, score::text as score_key from hits
         where kind = any(${sql.param(kinds)}::text[])${after ? sql` and ${keysAfter(searchKey, after)}` : sql``}
         order by ${searchOrder} limit ${limit + 1}`)
      return { hits: found.rows.map(row => ({ kind: row.kind, id: row.id, score: row.score_key })), counts }
    },

    listPublishedStoriesByIds: (tx, ids) => loadStories(tx, ids),

    listVisiblePinsByIds: (tx, ids) => loadPins(tx, ids),

    async listPublishedToursByIds(tx, ids) {
      return ids.length === 0 ? [] : (await loadTours(tx, ids, false)).rows
    },

    async pagePublishedStories(tx, { language, category, limit, after }) {
      // The version a card shows: the asked language, else the other. Both the page and the count run over this set.
      const picked = sql`picked as (
        select distinct on (g.id) g.id, v.published_at
          from content.story_versions v
          join content.story_groups g on g.store_id = v.store_id and g.id = v.group_id
         where v.status = 'published' and v.published is not null${category === null
            ? sql``
            : sql` and exists (
               select 1 from content.story_categories sc
                 join content.blog_categories c on c.store_id = sc.store_id and c.id = sc.category_id
                 left join content.blog_categories parent on parent.store_id = c.store_id and parent.id = c.parent_id
                where sc.group_id = g.id and (c.slug = ${category} or parent.slug = ${category}))`}
         order by g.id, (v.language = ${language}) desc, v.language)`
      const keys = await tx.execute<{ id: string, published_key: string } & Record<string, unknown>>(sql`
        with ${picked}
        select id, to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as published_key
          from picked
         ${after ? sql`where ${keysAfter(storyKey, after)}` : sql``}
         order by published_at desc, id desc${limit === undefined ? sql`` : sql` limit ${limit + 1}`}`)
      const counted = await tx.execute<{ total: number } & Record<string, unknown>>(sql`with ${picked} select count(*)::int as total from picked`)
      const { items, next } = page(keys.rows, limit, (row): StoryPageKey => [row.published_key, row.id])
      // loadStories reads in no order: put the groups back in the page's order.
      const stories = new Map((await loadStories(tx, items.map(row => row.id))).map(story => [story.id, story]))
      return { rows: items.flatMap(row => stories.get(row.id) ?? []), next, total: counted.rows[0]?.total ?? 0 }
    },

    async findPublishedStoryBySlug(tx, slug, language) {
      // Slugs are per language, so each language has at most one match; the asked language wins.
      const found = await tx.execute<{ group_id: string }>(sql`
        select group_id from content.story_versions
         where status = 'published' and slug = ${slug}
         order by (language = ${language}) desc limit 1`)
      const groupId = found.rows[0]?.group_id
      const story = groupId ? (await loadStories(tx, [groupId]))[0] : undefined
      return story && { ...story, ...(await loadStoryLinks(tx, story.id)) }
    },

    async listCategories(tx, kind) {
      // Only map categories have an icon and a home switch (the blog table has no such columns).
      // The story count of a blog category comes in the same query: the groups with a published version that have the category or, for a parent, one of its direct sub-categories (the set the stories filter matches).
      const [table, icon, show, count] = kind === 'map'
        ? [sql`content.map_categories`, sql`icon`, sql`show_on_home`, sql`0`]
        : [sql`content.blog_categories`, sql`null::text`, sql`false`, sql`(
            select count(distinct sc.group_id)::int
              from content.story_categories sc
              join content.blog_categories sub on sub.store_id = sc.store_id and sub.id = sc.category_id
             where sub.store_id = c.store_id and (sub.id = c.id or sub.parent_id = c.id)
               and exists (select 1 from content.story_versions v
                            where v.store_id = sc.store_id and v.group_id = sc.group_id and v.status = 'published' and v.published is not null))`]
      const result = await tx.execute<{ id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, icon: CategoryIcon | null, show_on_home: boolean, position: number, story_count: number }>(sql`
        select c.id, c.slug, c.name, c.parent_id, ${icon} as icon, ${show} as show_on_home, c.position, ${count} as story_count from ${table} c
         order by c.parent_id nulls first, c.position, c.id`)
      return result.rows.map(r => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, icon: r.icon, showOnHome: r.show_on_home, position: r.position, storyCount: r.story_count }))
    },

    listVisiblePins: tx => loadPins(tx, null),

    async findVisiblePin(tx, id) {
      const row = (await loadPins(tx, [id]))[0]

      return row && { ...row, ...(await loadPinExtras(tx, id)) }
    },

    pagePublishedTours: (tx, query) => loadTours(tx, null, false, query),

    async findPublishedTourBySlug(tx, slug, language) {
      const found = await tx.execute<{ id: string }>(sql`
        select id from content.tours
         where status = 'published' and published is not null and (slug->>'en' = ${slug} or slug->>'de' = ${slug})
         order by coalesce(slug->>${language} = ${slug}, false) desc limit 1`)
      const id = found.rows[0]?.id
      return id ? (await loadTours(tx, [id], true)).rows[0] : undefined
    },
  }
}
