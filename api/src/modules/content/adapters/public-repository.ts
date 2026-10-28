import type { ContentLanguage, StayTag, StoryDraft } from '@sk/domain/content'
import type { Tx } from '../../../platform/db/client.ts'
import type { PublicCategoryRow, PublicReadRepository, PublicStoryRow } from '../read-ports.ts'
import { storyMediaIds } from '@sk/domain/content'
import { sql } from 'drizzle-orm'

interface VersionJoinRow {
  id: string
  stay_tag: StayTag
  interests: string[]
  language: ContentLanguage
  slug: string
  published: StoryDraft
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

// Published versions of the groups (all of them, or one), with the blog categories and the ready media keys.
async function loadStories(tx: Tx, groupId: string | null): Promise<PublicStoryRow[]> {
  const versions = await tx.execute<VersionJoinRow & Record<string, unknown>>(sql`
    select g.id, g.stay_tag, g.interests, v.language, v.slug, v.published, v.published_at
      from content.story_versions v
      join content.story_groups g on g.store_id = v.store_id and g.id = v.group_id
     where v.status = 'published' and v.published is not null${groupId ? sql` and g.id = ${groupId}` : sql``}
     order by v.published_at desc, g.id desc, v.language`)
  if (versions.rows.length === 0)
    return []

  const groupIds = [...new Set(versions.rows.map(r => r.id))]
  const mediaIds = [...new Set(versions.rows.flatMap(r => storyMediaIds(r.published).map(m => m.id)))]

  const categoryRows = await tx.execute<CategoryJoinRow & Record<string, unknown>>(sql`
    select sc.group_id, c.id, c.slug, c.name, c.parent_id, c.position
      from content.story_categories sc
      join content.blog_categories c on c.store_id = sc.store_id and c.id = sc.category_id
     where sc.group_id = any(${sql.param(groupIds)}::uuid[])
     order by c.parent_id nulls first, c.position, c.id`)
  const media = mediaIds.length === 0
    ? { rows: [] as { id: string, storage_key: string }[] }
    : await tx.execute<{ id: string, storage_key: string } & Record<string, unknown>>(sql`
        select id, storage_key from content.media where id = any(${sql.param(mediaIds)}::uuid[]) and status = 'ready'`)
  const keys = new Map(media.rows.map(m => [m.id, m.storage_key]))

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
      mediaKeys: Object.fromEntries(storyMediaIds(row.published).flatMap(({ id }) => (keys.has(id) ? [[id, keys.get(id)!]] : []))),
    })
  }
  return [...stories.values()]
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
      return groupId ? (await loadStories(tx, groupId))[0] : undefined
    },

    async listCategories(tx, kind) {
      const table = kind === 'map' ? sql`content.map_categories` : sql`content.blog_categories`
      const result = await tx.execute<{ id: string, slug: string, name: PublicCategoryRow['name'], parent_id: string | null, position: number }>(sql`
        select id, slug, name, parent_id, position from ${table}
         order by parent_id nulls first, position, id`)
      return result.rows.map(r => ({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, position: r.position }))
    },
  }
}
