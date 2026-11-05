import type { StoryDraft, StoryGroup, StoryVersion } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { StoryGroupChanges, StoryListRow, StoryRepository } from '../ports.ts'
import { storyMediaIds } from '@sk/domain/content'
import { sql } from 'drizzle-orm'
import { offsetOf } from '../../../platform/db/offset.ts'

interface GroupRow {
  id: string
  store_id: string
  kind: StoryGroup['kind']
  subject_place_id: string | null
  stay_tag: StoryGroup['stayTag']
  interests: string[]
  row_version: number
  created_at: Date
  updated_at: Date
}

interface VersionRow {
  group_id: string
  store_id: string
  language: StoryVersion['language']
  status: StoryVersion['status']
  slug: string | null
  draft: StoryDraft | null
  published: StoryDraft | null
  published_at: Date | null
  row_version: number
  created_at: Date
  updated_at: Date
}

const groupColumns = sql`id, store_id, kind, subject_place_id, stay_tag, interests, row_version, created_at, updated_at`
const versionColumns = sql`group_id, store_id, language, status, slug, draft, published, published_at, row_version, created_at, updated_at`

const json = (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value))

async function ids(tx: Tx, query: ReturnType<typeof sql>): Promise<string[]> {
  const result = await tx.execute<{ id: string }>(query)
  return result.rows.map(r => r.id)
}

async function loadGroup(tx: Tx, storeId: string, groupId: string, lock: boolean): Promise<StoryGroup | undefined> {
  const found = await tx.execute<GroupRow & Record<string, unknown>>(sql`
    select ${groupColumns} from content.story_groups where store_id = ${storeId} and id = ${groupId}${lock ? sql` for no key update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  return {
    id: row.id,
    storeId: row.store_id,
    kind: row.kind,
    subjectPlaceId: row.subject_place_id,
    stayTag: row.stay_tag,
    interests: row.interests,
    categoryIds: await ids(tx, sql`select category_id as id from content.story_categories where store_id = ${storeId} and group_id = ${groupId} order by category_id`),
    placeIds: await ids(tx, sql`select place_id as id from content.story_group_places where store_id = ${storeId} and group_id = ${groupId} order by position`),
    keepsakeProductIds: await ids(tx, sql`select product_id as id from content.story_keepsake_links where store_id = ${storeId} and group_id = ${groupId} order by position`),
    relatedGroupIds: await ids(tx, sql`select related_group_id as id from content.story_related where store_id = ${storeId} and group_id = ${groupId} order by position`),
    rowVersion: row.row_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// Each list is replaced as a list. The ordered ones take their position from the order given, starting at 1.
async function replaceLists(tx: Tx, storeId: string, groupId: string, changes: StoryGroupChanges): Promise<void> {
  if (changes.categoryIds) {
    await tx.execute(sql`delete from content.story_categories where store_id = ${storeId} and group_id = ${groupId}`)
    if (changes.categoryIds.length > 0) {
      await tx.execute(sql`
        insert into content.story_categories (group_id, category_id, store_id)
        select ${groupId}, c, ${storeId} from unnest(${sql.param(changes.categoryIds)}::uuid[]) as c`)
    }
  }
  if (changes.placeIds) {
    await tx.execute(sql`delete from content.story_group_places where store_id = ${storeId} and group_id = ${groupId}`)
    if (changes.placeIds.length > 0) {
      await tx.execute(sql`
        insert into content.story_group_places (group_id, place_id, store_id, position)
        select ${groupId}, t.id, ${storeId}, t.position::int from unnest(${sql.param(changes.placeIds)}::uuid[]) with ordinality as t(id, position)`)
    }
  }
  if (changes.keepsakeProductIds) {
    await tx.execute(sql`delete from content.story_keepsake_links where store_id = ${storeId} and group_id = ${groupId}`)
    if (changes.keepsakeProductIds.length > 0) {
      await tx.execute(sql`
        insert into content.story_keepsake_links (group_id, store_id, position, product_id)
        select ${groupId}, ${storeId}, t.position::int, t.id from unnest(${sql.param(changes.keepsakeProductIds)}::uuid[]) with ordinality as t(id, position)`)
    }
  }
  if (changes.relatedGroupIds) {
    await tx.execute(sql`delete from content.story_related where store_id = ${storeId} and group_id = ${groupId}`)
    if (changes.relatedGroupIds.length > 0) {
      await tx.execute(sql`
        insert into content.story_related (group_id, store_id, position, related_group_id)
        select ${groupId}, ${storeId}, t.position::int, t.id from unnest(${sql.param(changes.relatedGroupIds)}::uuid[]) with ordinality as t(id, position)`)
    }
  }
}

async function loadVersion(tx: Tx, storeId: string, groupId: string, language: string, lock: boolean): Promise<StoryVersion | undefined> {
  const found = await tx.execute<VersionRow & Record<string, unknown>>(sql`
    select ${versionColumns} from content.story_versions
     where store_id = ${storeId} and group_id = ${groupId} and language = ${language}${lock ? sql` for no key update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  return {
    groupId: row.group_id,
    storeId: row.store_id,
    language: row.language,
    status: row.status,
    slug: row.slug,
    draft: row.draft,
    published: row.published,
    publishedAt: row.published_at && new Date(row.published_at),
    rowVersion: row.row_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// The media a document points at, kept in media_refs so the database refuses to retire a file that is still used.
async function replaceRefs(tx: Tx, version: Pick<StoryVersion, 'storeId' | 'groupId' | 'language'>, slot: 'draft' | 'published', doc: StoryDraft | null): Promise<void> {
  await tx.execute(sql`
    delete from content.media_refs
     where store_id = ${version.storeId} and owner_kind = 'story_version' and owner_id = ${version.groupId}
       and owner_language = ${version.language} and slot = ${slot}`)
  const used = doc ? storyMediaIds(doc) : []
  if (used.length > 0) {
    await tx.execute(sql`
      insert into content.media_refs (store_id, media_id, owner_kind, owner_id, owner_language, slot)
      select ${version.storeId}, m, 'story_version', ${version.groupId}, ${version.language}, ${slot}
        from unnest(${sql.param([...new Set(used.map(u => u.id.toLowerCase()))])}::uuid[]) as m`)
  }
}

function reloadVersion(tx: Tx, v: Pick<StoryVersion, 'storeId' | 'groupId' | 'language'>): Promise<StoryVersion> {
  return loadVersion(tx, v.storeId, v.groupId, v.language, false).then(version => version!)
}

interface ListRow {
  group_id: string
  kind: StoryGroup['kind']
  language: StoryVersion['language']
  status: StoryVersion['status']
  title: string | null
  cover_media_id: string | null
  ever_published: boolean
  edits_not_live: boolean
  row_version: number
  updated_at: Date
}

// The groups with these ids, in the order of `ids`, each with its versions; a group with no version is left out. One query, and not
// the documents: a body can be 200 KB. The title and cover come from the draft when there is one, else from the published text.
// A `case`, not `coalesce`, so a draft that cleared its cover does not show the live one.
async function groupRows(tx: Tx, storeId: string, ids: string[]): Promise<StoryListRow[]> {
  if (ids.length === 0)
    return []
  const found = await tx.execute<ListRow & Record<string, unknown>>(sql`
    select g.id as group_id, g.kind, v.language, v.status,
           case when v.draft is not null then v.draft->>'title' else v.published->>'title' end as title,
           case when v.draft is not null then v.draft->>'coverMediaId' else v.published->>'coverMediaId' end as cover_media_id,
           v.published is not null as ever_published,
           (v.status = 'published' and v.draft is not null) as edits_not_live,
           v.row_version, v.updated_at
      from content.story_groups g
      join content.story_versions v on v.group_id = g.id and v.store_id = g.store_id
     where g.store_id = ${storeId} and g.id = any(${sql.param(ids)}::uuid[])
     order by g.id, v.language`)
  const rows = new Map<string, StoryListRow>()
  for (const row of found.rows) {
    const entry = rows.get(row.group_id) ?? { groupId: row.group_id, kind: row.kind, versions: [] }
    entry.versions.push({ language: row.language, status: row.status, title: row.title ?? '', coverMediaId: row.cover_media_id, everPublished: row.ever_published, editsNotLive: row.edits_not_live, rowVersion: row.row_version, updatedAt: new Date(row.updated_at) })
    rows.set(row.group_id, entry)
  }
  return ids.flatMap(id => rows.get(id) ?? [])
}

export function createStoryRepository(): StoryRepository<Tx> {
  return {
    async insertGroup(tx, storeId, input, at) {
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into content.story_groups (store_id, kind, subject_place_id, stay_tag, interests, created_at, updated_at)
        values (${storeId}, ${input.kind}, ${input.subjectPlaceId}, ${input.stayTag ?? 'both'}, ${sql.param(input.interests ?? [])}::text[], ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceLists(tx, storeId, id, input)
      return (await loadGroup(tx, storeId, id, false))!
    },

    findGroupForUpdate: (tx, storeId, groupId) => loadGroup(tx, storeId, groupId, true),

    findGroup: (tx, storeId, groupId) => loadGroup(tx, storeId, groupId, false),

    async linkCounts(tx, storeId, groupId) {
      const { rows } = await tx.execute<{ pins: number, stories: number }>(sql`
        select
          (select count(*)::int from content.places where store_id = ${storeId} and main_story_group_id = ${groupId}) as pins,
          (select count(distinct group_id)::int from content.story_related where store_id = ${storeId} and related_group_id = ${groupId}) as stories`)
      return rows[0]!
    },

    async deleteGroup(tx, storeId, groupId, at) {
      // The rows this delete updates are locked first, in the order a save takes them (its own row, then the key check on the group
      // it names), and by id among themselves. A story save locks its story and then inserts a link to this group, which waits on the
      // FOR UPDATE below; locking the story second would wait for that save, a deadlock.
      await tx.execute(sql`
        select id from content.places where store_id = ${storeId} and main_story_group_id = ${groupId} order by id for no key update`)
      await tx.execute(sql`
        select id from content.story_groups
         where store_id = ${storeId} and id in (select group_id from content.story_related where store_id = ${storeId} and related_group_id = ${groupId})
         order by id for no key update`)
      // FOR UPDATE, not the FOR NO KEY UPDATE of a save: the key check of a pin or story save that names this group takes KEY SHARE,
      // which only FOR UPDATE conflicts with. That save then waits for this commit instead of slipping in between the steps below.
      const locked = await tx.execute(sql`select id from content.story_groups where store_id = ${storeId} and id = ${groupId} for update`)
      if (locked.rows.length === 0)
        return undefined
      const cleared = await tx.execute(sql`
        update content.places set main_story_group_id = null, row_version = row_version + 1, updated_at = ${at}
         where store_id = ${storeId} and main_story_group_id = ${groupId} returning id`)
      const bumped = await tx.execute(sql`
        update content.story_groups set row_version = row_version + 1, updated_at = ${at}
         where store_id = ${storeId} and id in (select group_id from content.story_related where store_id = ${storeId} and related_group_id = ${groupId})
        returning id`)
      await tx.execute(sql`delete from content.story_related where store_id = ${storeId} and related_group_id = ${groupId}`)
      await tx.execute(sql`delete from content.media_refs where store_id = ${storeId} and owner_kind = 'story_version' and owner_id = ${groupId}`)
      const versions = await tx.execute<{ language: StoryVersion['language'], status: StoryVersion['status'] } & Record<string, unknown>>(sql`
        delete from content.story_versions where store_id = ${storeId} and group_id = ${groupId} returning language, status`)
      await tx.execute(sql`delete from content.story_groups where store_id = ${storeId} and id = ${groupId}`)
      return {
        pinsUnlinked: cleared.rows.length,
        storiesUnlinked: bumped.rows.length,
        versions: versions.rows.map(({ language, status }) => ({ language, status })),
      }
    },

    // One page of groups (ADR-033 section 6): the groups are filtered, counted and paged first, then their versions are read.
    async listGroups(tx, storeId, query) {
      // The groups that have a version (the inner join), one row each, with what the tabs, the search and the sort need. The
      // search is position(), not ILIKE, so a % or _ in it is a plain character (as the media library does).
      const title = sql`(case when v.draft is not null then v.draft->>'title' else v.published->>'title' end)`
      const hit = query.q ? sql`position(lower(${query.q}) in lower(coalesce(${title}, ''))) > 0` : sql`true`
      const groups = sql`
        select g.id, g.created_at, max(v.updated_at) as updated_at, bool_or(v.status = 'published') as live, bool_or(${hit}) as hit
          from content.story_groups g
          join content.story_versions v on v.group_id = g.id and v.store_id = g.store_id
         where g.store_id = ${storeId}
         group by g.id, g.created_at`
      const counted = await tx.execute<{ all: number, published: number, drafts: number }>(sql`
        select (count(*) filter (where hit))::int as "all",
               (count(*) filter (where hit and live))::int as published,
               (count(*) filter (where hit and not live))::int as drafts
          from (${groups}) s`)
      const tabs = counted.rows[0]!
      const total = tabs[query.status === 'all' ? 'all' : query.status]
      const tab = query.status === 'all' ? sql`true` : query.status === 'published' ? sql`live` : sql`not live`
      const order = query.sort === 'created' ? sql`created_at desc, id desc` : sql`updated_at desc, id desc`
      const ids = await tx.execute<{ id: string }>(sql`
        select id from (${groups}) s where hit and ${tab} order by ${order} limit ${query.pageSize} offset ${offsetOf(query.page, query.pageSize)}`)
      return { rows: await groupRows(tx, storeId, ids.rows.map(row => row.id)), total, tabs }
    },

    listGroupsByIds: (tx, storeId, ids) => groupRows(tx, storeId, ids),

    async saveGroup(tx, group, changes, at) {
      await tx.execute(sql`
        update content.story_groups set
          kind = ${changes.kind ?? group.kind},
          subject_place_id = ${changes.kind === undefined ? group.subjectPlaceId : (changes.subjectPlaceId ?? null)},
          stay_tag = ${changes.stayTag ?? group.stayTag},
          interests = ${sql.param(changes.interests ?? group.interests)}::text[],
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${group.storeId} and id = ${group.id}`)
      await replaceLists(tx, group.storeId, group.id, changes)
      return (await loadGroup(tx, group.storeId, group.id, false))!
    },

    async insertVersion(tx, storeId, groupId, language, changes, at) {
      const inserted = await tx.execute(sql`
        insert into content.story_versions (group_id, language, store_id, slug, draft, created_at, updated_at)
        values (${groupId}, ${language}, ${storeId}, ${changes.slug ?? null}, ${json(changes.draft)}::jsonb, ${at}, ${at})
        on conflict (group_id, language) do nothing
        returning group_id`)
      if (inserted.rows.length === 0)
        return undefined
      await replaceRefs(tx, { storeId, groupId, language }, 'draft', changes.draft ?? null)
      return reloadVersion(tx, { storeId, groupId, language })
    },

    findVersionForUpdate: (tx, storeId, groupId, language) => loadVersion(tx, storeId, groupId, language, true),

    findVersion: (tx, storeId, groupId, language) => loadVersion(tx, storeId, groupId, language, false),

    async saveVersion(tx, version, changes, at) {
      await tx.execute(sql`
        update content.story_versions set
          slug = ${changes.slug !== undefined ? changes.slug : version.slug},
          draft = ${json(changes.draft ?? version.draft)}::jsonb,
          row_version = row_version + 1, updated_at = ${at}
        where store_id = ${version.storeId} and group_id = ${version.groupId} and language = ${version.language}`)
      if (changes.draft)
        await replaceRefs(tx, version, 'draft', changes.draft)
      return reloadVersion(tx, version)
    },

    async publishVersion(tx, version, at) {
      await tx.execute(sql`
        update content.story_versions set status = 'published', published = coalesce(draft, published), draft = null,
          published_at = coalesce(published_at, ${at}), row_version = row_version + 1, updated_at = ${at}
        where store_id = ${version.storeId} and group_id = ${version.groupId} and language = ${version.language}`)
      await replaceRefs(tx, version, 'published', version.draft ?? version.published)
      await replaceRefs(tx, version, 'draft', null)
      return reloadVersion(tx, version)
    },

    async unpublishVersion(tx, version, at) {
      await tx.execute(sql`
        update content.story_versions set status = 'draft', row_version = row_version + 1, updated_at = ${at}
        where store_id = ${version.storeId} and group_id = ${version.groupId} and language = ${version.language}`)
      return reloadVersion(tx, version)
    },

    async moveVersion(tx, version, targetGroupId, at) {
      await tx.execute(sql`
        update content.story_versions set group_id = ${targetGroupId}, row_version = row_version + 1, updated_at = ${at}
        where store_id = ${version.storeId} and group_id = ${version.groupId} and language = ${version.language}`)
      await tx.execute(sql`
        update content.media_refs set owner_id = ${targetGroupId}
        where store_id = ${version.storeId} and owner_kind = 'story_version' and owner_id = ${version.groupId} and owner_language = ${version.language}`)
      return reloadVersion(tx, { ...version, groupId: targetGroupId })
    },

    async removeVersion(tx, storeId, groupId, language) {
      const deleted = await tx.execute(sql`
        delete from content.story_versions where store_id = ${storeId} and group_id = ${groupId} and language = ${language} returning group_id`)
      if (deleted.rows.length === 0)
        return false
      await tx.execute(sql`
        delete from content.media_refs
         where store_id = ${storeId} and owner_kind = 'story_version' and owner_id = ${groupId} and owner_language = ${language}`)
      return true
    },
  }
}
