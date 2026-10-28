import type { StoryDraft, StoryGroup, StoryVersion } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { StoryGroupChanges, StoryRepository } from '../ports.ts'
import { storyMediaIds } from '@sk/domain/content'
import { sql } from 'drizzle-orm'

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

    async saveGroup(tx, group, changes, at) {
      await tx.execute(sql`
        update content.story_groups set
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
