import type { SQL } from 'drizzle-orm'
import type { Tx } from '../../../platform/db/client.ts'
import type { KeepsakeUse, MediaLibrary, MediaListQuery, MediaUseRow } from '../ports.ts'
import type { Columns } from './media-repository.ts'
import { sql } from 'drizzle-orm'
import { record } from './media-repository.ts'

const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

// A stored document is not trusted: a cover id that is no uuid is no thumbnail.
const safeUuid = (expression: SQL) => sql`(case when ${expression} ~ ${uuidPattern} then (${expression})::uuid end)`

// Every use of a file by a page of this store, one row per file, page and way of use. A page is a pin, a tour, a
// keepsake or one language version of a story. Stories, places and tours come from this module's tables (the typed
// cover and PDF columns, place_photos for the extra photos of a pin, and media_refs, which holds the story body and
// any later photo); keepsakes come from the catalog module, handed in as a list (ADR-013). `published` means the page shows the file in its published version:
// a story version through a published media_refs row, a pin or tour that is published, a keepsake that is for sale
// and holds the file among its live photos.
function usesCte(storeId: string, keepsakes: KeepsakeUse[], mediaId?: string): SQL {
  const only = (column: string) => (mediaId === undefined ? sql`` : sql`and ${sql.raw(column)} = ${mediaId}`)
  return sql`
    uses as (
      select r.media_id, 'story'::text as page_kind, r.owner_id as page_id, r.owner_language as language,
             bool_or(r.slot = 'published') as published,
             case when bool_or(coalesce(v.draft->>'coverMediaId', v.published->>'coverMediaId') = r.media_id::text) then 'cover' else 'text' end as role,
             jsonb_build_object(r.owner_language, coalesce(v.draft->>'title', v.published->>'title', '')) as title,
             ${safeUuid(sql`coalesce(v.draft->>'coverMediaId', v.published->>'coverMediaId')`)} as thumb
        from content.media_refs r
        join content.story_versions v on v.group_id = r.owner_id and v.language = r.owner_language
       where r.store_id = ${storeId} and r.owner_kind = 'story_version' ${only('r.media_id')}
       group by r.media_id, r.owner_id, r.owner_language, v.draft, v.published
      union all
      select p.cover_media_id, 'place', p.id, null, p.status = 'published', 'cover',
             coalesce(p.draft->'name', p.published->'name', '{}'::jsonb), p.cover_media_id
        from content.places p
       where p.store_id = ${storeId} and p.cover_media_id is not null ${only('p.cover_media_id')}
      union all
      select r.media_id, 'place', r.owner_id, null, p.status = 'published' and bool_or(r.slot = 'published'), 'photo',
             coalesce(p.draft->'name', p.published->'name', '{}'::jsonb), p.cover_media_id
        from content.media_refs r
        join content.places p on p.id = r.owner_id
       where r.store_id = ${storeId} and r.owner_kind = 'place' ${only('r.media_id')}
       group by r.media_id, r.owner_id, p.status, p.draft, p.published, p.cover_media_id
      union all
      select f.media_id, 'place', f.place_id, null, p.status = 'published', 'photo',
             coalesce(p.draft->'name', p.published->'name', '{}'::jsonb), p.cover_media_id
        from content.place_photos f
        join content.places p on p.id = f.place_id
       where f.store_id = ${storeId} ${only('f.media_id')}
      union all
      select t.cover_media_id, 'tour', t.id, null, t.status = 'published', 'cover',
             coalesce(t.draft->'title', t.published->'title', '{}'::jsonb), t.cover_media_id
        from content.tours t
       where t.store_id = ${storeId} and t.cover_media_id is not null ${only('t.cover_media_id')}
      union all
      select t.pdf_media_id, 'tour', t.id, null, t.status = 'published', 'pdf',
             coalesce(t.draft->'title', t.published->'title', '{}'::jsonb), t.cover_media_id
        from content.tours t
       where t.store_id = ${storeId} and t.pdf_media_id is not null ${only('t.pdf_media_id')}
      union all
      select s.media_id, 'tour', t.id, null, t.status = 'published', 'stop',
             coalesce(t.draft->'title', t.published->'title', '{}'::jsonb), t.cover_media_id
        from content.tour_stops s
        join content.tours t on t.id = s.tour_id
       where s.store_id = ${storeId} and s.media_id is not null ${only('s.media_id')}
      union all
      select r.media_id, 'tour', r.owner_id, null, t.status = 'published' and bool_or(r.slot = 'published'), 'photo',
             coalesce(t.draft->'title', t.published->'title', '{}'::jsonb), t.cover_media_id
        from content.media_refs r
        join content.tours t on t.id = r.owner_id
       where r.store_id = ${storeId} and r.owner_kind = 'tour' ${only('r.media_id')}
       group by r.media_id, r.owner_id, t.status, t.draft, t.published, t.cover_media_id
      union all
      select (k->>'mediaId')::uuid, 'keepsake', (k->>'productId')::uuid, null, (k->>'published')::boolean, 'photo',
             coalesce(k->'name', '{}'::jsonb), case when k->>'coverMediaId' ~ ${uuidPattern} then (k->>'coverMediaId')::uuid end
        from jsonb_array_elements(${JSON.stringify(keepsakes)}::jsonb) as k
       where true ${mediaId === undefined ? sql`` : sql`and (k->>'mediaId')::uuid = ${mediaId}`}
    ),
    pages as (
      select media_id, page_kind, page_id, language, bool_or(published) as published,
             (array_agg(role order by case role when 'cover' then 1 when 'pdf' then 2 when 'stop' then 3 when 'text' then 4 else 5 end))[1] as role,
             (array_agg(title))[1] as title, (array_agg(thumb))[1] as thumb
        from uses
       group by media_id, page_kind, page_id, language
    )`
}

const emptyKinds = { image: 0, audio: 0, pdf: 0 }

function useCondition(use: MediaListQuery['use']): SQL | undefined {
  if (use.length === 0)
    return undefined
  const parts = use.map(filter => filter === 'unused'
    ? sql`pages = 0`
    : filter === 'drafts' ? sql`(pages > 0 and published_pages = 0)` : sql`published_pages > 0`)
  return sql`(${sql.join(parts, sql` or `)})`
}

function searchCondition(q: string | undefined): SQL | undefined {
  // position() instead of ILIKE, so a % or _ in the search is a plain character.
  return q ? sql`position(lower(${q}) in lower(name)) > 0` : undefined
}

function statusCondition(status: MediaListQuery['status']): SQL | undefined {
  return status.length === 0 ? undefined : sql`status = any(${sql.param(status)}::text[])`
}

function where(...conditions: (SQL | undefined)[]): SQL {
  const present = conditions.filter((condition): condition is SQL => condition !== undefined)
  return present.length === 0 ? sql`true` : sql.join(present, sql` and `)
}

export function createMediaLibrary(): MediaLibrary<Tx> {
  const library = (storeId: string, kind: string, keepsakes: KeepsakeUse[]) => sql`
    ${usesCte(storeId, keepsakes)},
    usage_counts as (
      select media_id, count(*)::int as pages, (count(*) filter (where published))::int as published_pages from pages group by media_id
    ),
    lib as (
      select m.*, coalesce(u.pages, 0) as pages, coalesce(u.published_pages, 0) as published_pages
        from content.media m left join usage_counts u on u.media_id = m.id
       where m.store_id = ${storeId} and m.kind = ${kind}
    )`
  return {
    async list(tx, storeId, query, keepsakes) {
      const base = library(storeId, query.kind, keepsakes)
      const search = searchCondition(query.q)
      const use = useCondition(query.use)
      const status = statusCondition(query.status)
      const offset = (query.page - 1) * query.pageSize
      const items = await tx.execute<Columns & { pages: number, published_pages: number, total: string | number }>(sql`
        with ${base}
        select lib.*, count(*) over () as total from lib
         where ${where(search, use, status)}
         order by created_at desc, name asc, id desc
         limit ${query.pageSize} offset ${offset}`)
      const uses = await tx.execute<{ unused: number, drafts: number, published: number }>(sql`
        with ${base}
        select (count(*) filter (where pages = 0))::int as unused,
               (count(*) filter (where pages > 0 and published_pages = 0))::int as drafts,
               (count(*) filter (where published_pages > 0))::int as published
          from lib where ${where(search, status)}`)
      const statuses = await tx.execute<{ processing: number, ready: number, retired: number }>(sql`
        with ${base}
        select (count(*) filter (where status = 'processing'))::int as processing,
               (count(*) filter (where status = 'ready'))::int as ready,
               (count(*) filter (where status = 'retired'))::int as retired
          from lib where ${where(search, use)}`)
      const kinds = await tx.execute<{ kind: keyof typeof emptyKinds, count: number }>(sql`
        select kind, count(*)::int as count from content.media where store_id = ${storeId} group by kind`)
      let total = 0
      const rows = items.rows.map((row) => {
        total = Number(row.total)
        return { ...record(row), usage: { pages: row.pages, published: row.published_pages, drafts: row.pages - row.published_pages } }
      })
      // Past the last page there is no row to carry the total, so it is counted from the use and status counts.
      if (rows.length === 0 && query.page > 1) {
        const everything = await tx.execute<{ count: number }>(sql`
          with ${base} select count(*)::int as count from lib where ${where(search, use, status)}`)
        total = everything.rows[0]!.count
      }
      return {
        rows,
        total,
        kinds: kinds.rows.reduce((all, row) => ({ ...all, [row.kind]: row.count }), { ...emptyKinds }),
        uses: uses.rows[0]!,
        statuses: statuses.rows[0]!,
      }
    },
    async usesOf(tx, storeId, mediaId, keepsakes) {
      const result = await tx.execute<{ page_kind: MediaUseRow['pageKind'], page_id: string, language: MediaUseRow['language'], published: boolean, role: MediaUseRow['role'], title: MediaUseRow['title'], thumb: string | null }>(sql`
        with ${usesCte(storeId, keepsakes, mediaId)}
        select page_kind, page_id, language, published, role, title, thumb from pages
         order by page_kind, language nulls first, page_id`)
      return result.rows.map(row => ({
        pageKind: row.page_kind,
        pageId: row.page_id,
        language: row.language,
        title: row.title,
        role: row.role,
        published: row.published,
        thumbnailMediaId: row.thumb,
      }))
    },
    async thumbnails(tx, storeId, ids) {
      if (ids.length === 0)
        return new Map()
      const result = await tx.execute<{ id: string, storage_key: string, width: number | null }>(sql`
        select id, storage_key, width from content.media
         where store_id = ${storeId} and id = any(${sql.param(ids)}::uuid[]) and status = 'ready' and kind = 'image'`)
      return new Map(result.rows.map(row => [row.id, { storageKey: row.storage_key, width: row.width }]))
    },
  }
}
