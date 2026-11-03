import type { ContentLanguage, StoryBody, StoryBodyNode, StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Pool } from 'pg'
import type { PlaceStory, PlaceStoryBlock } from './seed-data/place-stories.ts'
import process from 'node:process'
import { createMediaRepository } from '../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../src/modules/content/adapters/pin-repository.ts'
import { createStoryRepository } from '../src/modules/content/adapters/story-repository.ts'
import { makeCreateStoryGroup, makeCreateStoryVersion, makeDeleteStoryGroup, makePublishStoryVersion, makeSavePin, makeSaveStoryGroup } from '../src/modules/content/index.ts'
import { createAuditLog } from '../src/platform/audit.ts'
import { systemClock } from '../src/platform/clock.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'
import { legacyStoryGroups, placeStories } from './seed-data/place-stories.ts'

// The stories step of the curated loader (owner decisions of 2026-11-03, standing order 19). It adds one story for each
// sight and photo spot and one editorial review for a food-and-drink place, in English and German, through the content
// use cases, so the publish checks, the audit rows and the database rules hold. A story whose slug exists in either
// language is skipped, so a second run changes nothing. The cover is the cover of the place (media the seed already
// holds); a story with no ready cover stays a draft. Two things are not add-only, both from the owner's decision:
// `--replace-legacy-stories` deletes the 13 old stories once (the Delete story use case, by the ids listed in the data
// file), and a story becomes the main story of a place that has none.

const languages: ContentLanguage[] = ['en', 'de']
const author = 'Swiss Native'

export interface PlaceFacts {
  id: string
  status: string
  mainStoryGroupId: string | null
  coverMediaId: string | null
  coverReady: boolean
}

export interface StorySnapshot {
  // Every story version slug of the database; slugs are unique across stores.
  slugs: ReadonlySet<string>
  // Places of the store by English slug.
  places: ReadonlyMap<string, PlaceFacts>
  // Blog category ids of the store by slug.
  blogCategoryIds: ReadonlyMap<string, string>
  // The story groups of the store with the slugs of their versions.
  groups: readonly { id: string, slugs: string[] }[]
}

export interface PlannedStory {
  story: PlaceStory
  placeIds: string[]
  subjectPlaceId: string | null
  categoryIds: string[]
  coverMediaId: string | null
  publish: boolean
  // Why it stays a draft.
  draftReason: string | null
  mainStoryPlaceIds: string[]
}

export interface StoryPlan {
  deletes: { id: string, slugs: string[] }[]
  creates: PlannedStory[]
  skipped: { key: string, reason: string }[]
  // Each fault names a story, a place or a category. Any fault stops the step before it writes.
  faults: string[]
}

// What gets removed: a group of the store that the legacy list names by id and whose versions all have legacy slugs.
export function planLegacyDeletes(groups: StorySnapshot['groups'], legacy = legacyStoryGroups): StoryPlan['deletes'] {
  return groups.flatMap((group) => {
    const known = legacy.find(entry => entry.id === group.id)
    return known && group.slugs.every(slug => known.slugs.includes(slug)) ? [group] : []
  })
}

export function planPlaceStories(stories: readonly PlaceStory[], snapshot: StorySnapshot, replaceLegacy: boolean, legacy = legacyStoryGroups): StoryPlan {
  const plan: StoryPlan = { deletes: replaceLegacy ? planLegacyDeletes(snapshot.groups, legacy) : [], creates: [], skipped: [], faults: [] }
  const removed = new Set(plan.deletes.flatMap(group => group.slugs))
  const deletedIds = new Set(plan.deletes.map(group => group.id))
  for (const story of stories) {
    if (languages.some(l => snapshot.slugs.has(story.slug[l]) && !removed.has(story.slug[l]))) {
      plan.skipped.push({ key: story.key, reason: 'a version with this slug exists' })
      continue
    }
    const faults: string[] = []
    const places = story.places.map((slug) => {
      const place = snapshot.places.get(slug)
      if (!place)
        faults.push(`Story ${story.key} names the place ${slug}, which the store does not have.`)
      return place
    })
    const categoryIds = story.blogCategories.flatMap((slug) => {
      const id = snapshot.blogCategoryIds.get(slug)
      if (!id)
        faults.push(`Story ${story.key} names the blog category ${slug}, which the store does not have.`)
      return id ? [id] : []
    })
    const cover = snapshot.places.get(story.coverFrom)
    if (!cover)
      faults.push(`Story ${story.key} takes its cover from the place ${story.coverFrom}, which the store does not have.`)
    if (faults.length > 0) {
      plan.faults.push(...faults)
      continue
    }
    const coverMediaId = cover!.coverReady ? cover!.coverMediaId : null
    const placeIds = places.map(place => place!.id)
    plan.creates.push({
      story,
      placeIds,
      subjectPlaceId: story.kind === 'editorial_review' ? placeIds[0]! : null,
      categoryIds,
      coverMediaId,
      publish: coverMediaId !== null,
      draftReason: coverMediaId === null ? `the place ${story.coverFrom} has no ready cover` : null,
      mainStoryPlaceIds: story.mainStoryFor.flatMap((slug) => {
        const place = snapshot.places.get(slug)
        return place && (place.mainStoryGroupId === null || deletedIds.has(place.mainStoryGroupId)) && place.status !== 'draft' ? [place.id] : []
      }),
    })
  }
  return plan
}

function text(value: string, marks?: { type: string, attrs?: Record<string, unknown> }[]): StoryBodyNode {
  return { type: 'text', text: value, ...(marks ? { marks } : {}) }
}

function nodeOf(block: PlaceStoryBlock): StoryBodyNode {
  if (typeof block === 'string')
    return { type: 'paragraph', content: [text(block)] }
  if ('h' in block)
    return { type: 'heading', attrs: { level: 2 }, content: [text(block.h)] }
  return { type: 'bulletList', content: block.ul.map(item => ({ type: 'listItem', content: [{ type: 'paragraph', content: [text(item)] }] })) }
}

// The body: the blocks, then a closing line that names the sources as links.
export function placeStoryBody(story: PlaceStory, language: ContentLanguage): StoryBody {
  const sources: StoryBodyNode[] = story.sources.flatMap((source, index) => [
    ...(index > 0 ? [text('; ')] : []),
    text(source.name, [{ type: 'link', attrs: { href: source.url } }]),
  ])
  const line: StoryBodyNode = { type: 'paragraph', content: [text(language === 'en' ? 'Sources: ' : 'Quellen: ', [{ type: 'italic' }]), ...sources] }
  return { type: 'doc', content: [...story.versions[language].blocks.map(nodeOf), line] }
}

export function placeStoryDraft(story: PlaceStory, language: ContentLanguage, coverMediaId: string | null): StoryDraft {
  const { title, excerpt } = story.versions[language]
  return {
    title,
    excerpt,
    authorName: author,
    coverMediaId,
    ...(story.checkedOn ? { checkedOn: story.checkedOn } : {}),
    body: placeStoryBody(story, language),
  }
}

export async function readStorySnapshot(pool: Pool, storeId: string): Promise<StorySnapshot> {
  const [slugs, places, categories, groups] = await Promise.all([
    pool.query<{ slug: string }>(`select slug from content.story_versions where slug is not null`),
    pool.query<{ id: string, status: string, slug: string, main_story_group_id: string | null, cover_media_id: string | null, ready: boolean }>(
      `select p.id, p.status, p.slug->>'en' as slug, p.main_story_group_id, p.cover_media_id,
              coalesce((select m.status = 'ready' from content.media m where m.id = p.cover_media_id), false) as ready
         from content.places p where p.store_id = $1 and p.slug->>'en' is not null`,
      [storeId],
    ),
    pool.query<{ id: string, slug: string }>(`select id, slug from content.blog_categories where store_id = $1`, [storeId]),
    pool.query<{ id: string, slugs: string[] }>(
      `select g.id, coalesce(array_agg(v.slug) filter (where v.slug is not null), '{}') as slugs
         from content.story_groups g left join content.story_versions v on v.group_id = g.id where g.store_id = $1 group by g.id`,
      [storeId],
    ),
  ])
  return {
    slugs: new Set(slugs.rows.map(row => row.slug)),
    places: new Map(places.rows.map(row => [row.slug, { id: row.id, status: row.status, mainStoryGroupId: row.main_story_group_id, coverMediaId: row.cover_media_id, coverReady: row.ready }])),
    blogCategoryIds: new Map(categories.rows.map(row => [row.slug, row.id])),
    groups: groups.rows,
  }
}

export function describePlan(plan: StoryPlan, dry: boolean): string {
  const verb = dry ? 'Would' : 'Will'
  const lines = [
    `${verb} delete ${plan.deletes.length} legacy stories: ${plan.deletes.map(group => group.slugs.join('/')).join(', ') || '-'}`,
    `${verb} create ${plan.creates.length} stories and reviews, skipping ${plan.skipped.length}${plan.skipped.length ? ` (${plan.skipped.map(s => s.key).join(', ')})` : ''}:`,
    ...plan.creates.map(item => `  ${item.story.kind} ${item.story.slug.en} / ${item.story.slug.de}: ${item.publish ? 'published' : `draft (${item.draftReason})`}, places ${item.story.places.join(', ')}, main story of ${item.mainStoryPlaceIds.length} places`),
  ]
  return `${lines.join('\n')}\n`
}

// Applies a plan with no fault. Each use case runs in its own transaction.
export async function applyPlaceStories(pool: Pool, storeId: string, plan: StoryPlan, log: (line: string) => void = () => {}, stories: readonly PlaceStory[] = placeStories): Promise<{ deleted: number, created: number, published: number, related: number, mainStories: number }> {
  const db = createDatabase(pool)
  const deps = { uow: createUnitOfWork(db), stories: createStoryRepository(), media: createMediaRepository(), pins: createPinRepository(), audit: createAuditLog(systemClock), clock: systemClock }
  const actor: Actor = { kind: 'staff', userId: 'seed-curated', guestId: 'seed-curated', stores: new Map([[storeId, 'owner' as const]]) }
  const deleteGroup = makeDeleteStoryGroup(deps)
  const createGroup = makeCreateStoryGroup(deps)
  const createVersion = makeCreateStoryVersion(deps)
  const publish = makePublishStoryVersion(deps)
  const saveGroup = makeSaveStoryGroup(deps)
  const savePin = makeSavePin(deps)
  const counts = { deleted: 0, created: 0, published: 0, related: 0, mainStories: 0 }

  // Deletes first: the new slugs must not meet an old version of the same slug.
  for (const group of plan.deletes) {
    const result = await deleteGroup(actor, storeId, group.id, null)
    if (!result.ok)
      throw new Error(`Deleting the story ${group.slugs.join('/')} was refused: ${result.reason}`)
    log(`Deleted ${group.slugs.join('/')}: ${result.value.pinsUnlinked} pins and ${result.value.storiesUnlinked} stories unlinked`)
    counts.deleted += 1
  }

  const groupIds = new Map<string, string>()
  for (const item of plan.creates) {
    const { story } = item
    const group = await createGroup(actor, storeId, { kind: story.kind, subjectPlaceId: item.subjectPlaceId, stayTag: story.stayTag, interests: story.interests, categoryIds: item.categoryIds, placeIds: item.placeIds }, null)
    if (!group.ok)
      throw new Error(`Story ${story.key} was refused: ${group.reason}`)
    groupIds.set(story.key, group.value.id)
    for (const language of languages) {
      const version = await createVersion(actor, storeId, group.value.id, language, { slug: story.slug[language], draft: placeStoryDraft(story, language, item.coverMediaId) }, null)
      if (!version.ok)
        throw new Error(`Story ${story.key} (${language}) was refused: ${version.reason}`)
      if (!item.publish)
        continue
      const live = await publish(actor, storeId, group.value.id, language, version.value.rowVersion, null)
      if (!live.ok)
        throw new Error(`Story ${story.key} (${language}) was not published: ${live.reason}${'gaps' in live ? ` ${live.gaps.join(',')}` : ''}`)
      counts.published += 1
    }
    counts.created += 1
  }

  // "More to discover": by English slug, so a related story that already existed is found too. Only the stories of this run get links.
  const relatedKeys = [...new Set(plan.creates.flatMap(item => item.story.related))]
  const slugOf = new Map(stories.map(story => [story.key, story.slug.en]))
  const found = relatedKeys.length === 0
    ? { rows: [] }
    : await pool.query<{ slug: string, group_id: string }>(`select slug, group_id from content.story_versions where store_id = $1 and language = 'en' and slug = any($2::text[])`, [storeId, relatedKeys.map(key => slugOf.get(key) ?? key)])
  const idBySlug = new Map(found.rows.map(row => [row.slug, row.group_id]))
  for (const item of plan.creates) {
    const related = item.story.related.flatMap((key) => {
      const id = groupIds.get(key) ?? idBySlug.get(slugOf.get(key) ?? key)
      return id ? [id] : []
    })
    if (related.length === 0)
      continue
    const current = await pool.query<{ row_version: number }>(`select row_version from content.story_groups where store_id = $1 and id = $2`, [storeId, groupIds.get(item.story.key)])
    const saved = await saveGroup(actor, storeId, groupIds.get(item.story.key)!, current.rows[0]!.row_version, { relatedGroupIds: related }, null)
    if (!saved.ok)
      throw new Error(`The related stories of ${item.story.key} were refused: ${saved.reason}`)
    counts.related += related.length
  }

  // Main stories: only a place with none, read again now, so a story a person chose is kept.
  for (const item of plan.creates) {
    for (const placeId of item.mainStoryPlaceIds) {
      const row = (await pool.query<{ row_version: number, main_story_group_id: string | null }>(`select row_version, main_story_group_id from content.places where store_id = $1 and id = $2`, [storeId, placeId])).rows[0]
      if (!row || row.main_story_group_id !== null)
        continue
      const saved = await savePin(actor, storeId, placeId, row.row_version, { mainStoryGroupId: groupIds.get(item.story.key)! }, null)
      if (!saved.ok)
        throw new Error(`The main story of a place for ${item.story.key} was refused: ${saved.reason}${'gaps' in saved ? ` ${saved.gaps.join(',')}` : ''}`)
      counts.mainStories += 1
    }
  }
  return counts
}

// The step as the loader runs it. Returns the exit code: 0, or 1 on a fault (nothing is written then).
export async function placeStoriesStep(pool: Pool, storeId: string, options: { dry: boolean, replaceLegacy: boolean }, stories: readonly PlaceStory[] = placeStories): Promise<number> {
  const plan = planPlaceStories(stories, await readStorySnapshot(pool, storeId), options.replaceLegacy)
  process.stdout.write(describePlan(plan, options.dry))
  if (plan.faults.length > 0) {
    process.stderr.write(`${plan.faults.join('\n')}\nNo story was written.\n`)
    return 1
  }
  if (options.dry)
    return 0
  const counts = await applyPlaceStories(pool, storeId, plan, line => process.stdout.write(`${line}\n`), stories)
  process.stdout.write(`Stories: ${counts.deleted} deleted, ${counts.created} created (${counts.published} versions published), ${counts.related} related links, ${counts.mainStories} main stories set.${counts.deleted + counts.created + counts.mainStories === 0 ? ' Nothing was changed.' : ''}\n`)
  return 0
}
