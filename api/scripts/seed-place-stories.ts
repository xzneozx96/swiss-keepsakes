import type { ContentLanguage, Localized, StoryBody, StoryBodyNode, StoryDraft } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Buffer } from 'node:buffer'
import type { Pool } from 'pg'
import type { PlaceStory, PlaceStoryBlock } from './seed-data/place-stories.ts'
import type { StoryPhoto } from './seed-data/story-photos.ts'
import type { MediaUploader } from './seed-media-upload.ts'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { createMediaRepository } from '../src/modules/content/adapters/media-repository.ts'
import { createPinRepository } from '../src/modules/content/adapters/pin-repository.ts'
import { createStoryRepository } from '../src/modules/content/adapters/story-repository.ts'
import { makeCreateStoryGroup, makeCreateStoryVersion, makePublishPin, makePublishStoryVersion, makeSavePin, makeSaveStoryGroup, makeSaveStoryVersion } from '../src/modules/content/index.ts'
import { createAuditLog } from '../src/platform/audit.ts'
import { systemClock } from '../src/platform/clock.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'
import { placeCovers, placeStories } from './seed-data/place-stories.ts'
import { storyPhotos } from './seed-data/story-photos.ts'
import { createMediaStorage, createMediaUploader, objectStorageSettings, SeedError } from './seed-media-upload.ts'

// The stories step of the curated loader (owner decisions of 2026-11-03, standing order 19). It brings the stories and editorial
// reviews of `seed-data/place-stories.ts` into the store, in English and German, through the content use cases, so the publish
// checks, the audit rows and the database rules hold. A story that does not exist yet is created and published. A story that
// exists is brought to the data: title, short summary, cover, body (text and photo blocks) and check date are saved as the draft
// and published again, and only when they differ, so a second run changes nothing. Photos of `seed-data/story-photos.ts` go through
// the media path once (a file whose bytes are in the library is reused), and a place named in `placeCovers` that has no cover gets
// one. Links are not rewritten: a story becomes the main story of a place that has none, and a main story a person chose is kept.

const languages: ContentLanguage[] = ['en', 'de']
const author = 'Swiss Native'
const photoDir = join(dirname(fileURLToPath(import.meta.url)), 'seed-data', 'story-photos')

export interface PlaceFacts {
  id: string
  status: string
  mainStoryGroupId: string | null
  coverMediaId: string | null
  coverReady: boolean
  // A person's unpublished changes are waiting on the pin: publishing its cover would publish them too.
  hasDraft?: boolean
}

export interface StorySnapshot {
  // Every story version slug of the database; slugs are unique across stores.
  slugs: ReadonlySet<string>
  // Places of the store by English slug.
  places: ReadonlyMap<string, PlaceFacts>
  // Blog category ids of the store by slug.
  blogCategoryIds: ReadonlyMap<string, string>
  // The stored versions of the stories of this seed, by slug (either language).
  versions: readonly StoredVersion[]
  // The library item of each photo key whose bytes the store holds already.
  photoMedia: ReadonlyMap<string, string>
}

export interface StoredVersion {
  groupId: string
  language: ContentLanguage
  slug: string
  status: 'draft' | 'published'
  rowVersion: number
  doc: StoryDraft
  // A published version with a draft beside it: a person is editing it.
  pendingDraft?: boolean
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
  refs: PhotoRefs
  // Photos the store does not hold yet.
  uploads: StoryPhoto[]
  // A stored version that is not the data yet (or is not published): saved as the draft, then published.
  refreshes: { key: string, version: StoredVersion, draft: StoryDraft, publish: boolean }[]
  // Places with no cover that get the photo as their cover.
  placeCovers: { placeId: string, slug: string, photo: StoryPhoto }[]
  // Places that would get a cover but hold unpublished changes of a person: left alone.
  coversSkipped: string[]
  // Stories that exist already whose place has no main story yet: the link is set, and only that.
  links: { key: string, groupId: string, placeId: string }[]
  creates: PlannedStory[]
  skipped: { key: string, reason: string }[]
  // Each fault names a story, a place or a category. Any fault stops the step before it writes.
  faults: string[]
}

// What the body and the cover need of a photo: its library id (a placeholder while it is still to be uploaded) and its texts.
export type PhotoRefs = ReadonlyMap<string, { mediaId: string, photo: StoryPhoto }>

export function photoRefs(photoMedia: ReadonlyMap<string, string>, photos: readonly StoryPhoto[] = storyPhotos): PhotoRefs {
  return new Map(photos.map(photo => [photo.key, { mediaId: photoMedia.get(photo.key) ?? `pending:${photo.key}`, photo }]))
}

export function photoBytes(photo: StoryPhoto): Buffer {
  return readFileSync(join(photoDir, photo.file))
}

function text(value: string, marks?: { type: string, attrs?: Record<string, unknown> }[]): StoryBodyNode {
  return { type: 'text', text: value, ...(marks ? { marks } : {}) }
}

function nodeOf(block: PlaceStoryBlock, language: ContentLanguage, refs: PhotoRefs): StoryBodyNode {
  if (typeof block === 'string')
    return { type: 'paragraph', content: [text(block)] }
  if ('h' in block)
    return { type: 'heading', attrs: { level: 2 }, content: [text(block.h)] }
  if ('photo' in block) {
    const ref = refs.get(block.photo)
    if (!ref)
      throw new SeedError(`A story names the photo ${block.photo}, which is not in the photo list`)
    return { type: 'image', attrs: { mediaId: ref.mediaId, alt: ref.photo.alt[language], caption: ref.photo.caption[language] } }
  }
  return { type: 'bulletList', content: block.ul.map(item => ({ type: 'listItem', content: [{ type: 'paragraph', content: [text(item)] }] })) }
}

export function placeStoryBody(story: PlaceStory, language: ContentLanguage, refs: PhotoRefs): StoryBody {
  return { type: 'doc', content: story.versions[language].blocks.map(block => nodeOf(block, language, refs)) }
}

export function placeStoryDraft(story: PlaceStory, language: ContentLanguage, coverMediaId: string | null, refs: PhotoRefs): StoryDraft {
  const { title, excerpt } = story.versions[language]
  return {
    title,
    excerpt,
    authorName: author,
    coverMediaId,
    ...(story.checkedOn ? { checkedOn: story.checkedOn } : {}),
    body: placeStoryBody(story, language, refs),
  }
}

// The photo keys a story uses: the cover first, then each photo block.
export function storyPhotoKeys(story: PlaceStory): string[] {
  const keys = story.cover ? [story.cover] : []
  for (const language of languages) {
    for (const block of story.versions[language].blocks) {
      if (typeof block !== 'string' && 'photo' in block)
        keys.push(block.photo)
    }
  }
  return [...new Set(keys)]
}

function sameDraft(stored: StoryDraft, target: StoryDraft): boolean {
  return stored.title === target.title
    && stored.excerpt === target.excerpt
    && stored.coverMediaId === target.coverMediaId
    && (target.checkedOn === undefined || stored.checkedOn === target.checkedOn)
    && isDeepStrictEqual(stored.body, target.body)
}

export function planPlaceStories(stories: readonly PlaceStory[], snapshot: StorySnapshot, photos: readonly StoryPhoto[] = storyPhotos, covers: typeof placeCovers = placeCovers): StoryPlan {
  const plan: StoryPlan = { refs: new Map(), uploads: [], refreshes: [], placeCovers: [], coversSkipped: [], links: [], creates: [], skipped: [], faults: [] }
  const refs = photoRefs(snapshot.photoMedia, photos)
  plan.refs = refs
  const wanted = new Set([...stories.flatMap(storyPhotoKeys), ...covers.map(entry => entry.photo)])
  for (const key of wanted) {
    const ref = refs.get(key)
    if (!ref)
      plan.faults.push(`The photo ${key} is used by a story or a place cover and is not in the photo list.`)
    else if (!snapshot.photoMedia.has(key))
      plan.uploads.push(ref.photo)
  }
  for (const entry of covers) {
    const place = snapshot.places.get(entry.place)
    const ref = refs.get(entry.photo)
    if (!place) {
      plan.faults.push(`The cover of the place ${entry.place} names a place the store does not have.`)
    }
    else if (ref && place.coverMediaId === null && place.status !== 'draft') {
      if (place.hasDraft)
        plan.coversSkipped.push(entry.place)
      else
        plan.placeCovers.push({ placeId: place.id, slug: entry.place, photo: ref.photo })
    }
  }

  // The cover of a story: its own photo, else the cover of the place it names.
  const coverOf = (story: PlaceStory): string | null => {
    if (story.cover)
      return refs.get(story.cover)?.mediaId ?? null
    const place = snapshot.places.get(story.coverFrom)
    return place?.coverReady ? place.coverMediaId : null
  }

  for (const story of stories) {
    const exists = languages.some(l => snapshot.slugs.has(story.slug[l]))
    if (exists) {
      plan.skipped.push({ key: story.key, reason: 'a version with this slug exists' })
      const cover = coverOf(story)
      for (const language of languages) {
        const stored = snapshot.versions.find(v => v.slug === story.slug[language] && v.language === language)
        if (!stored)
          continue
        // A story with no cover cannot be published: a stored draft is brought to the text and stays a draft.
        if (cover === null && stored.status === 'published') {
          plan.faults.push(`Story ${story.key} (${language}) is published and has no cover: no cover photo, and the place ${story.coverFrom} has none.`)
          continue
        }
        if (stored.pendingDraft) {
          plan.faults.push(`Story ${story.key} (${language}) is published and a person has an unpublished draft of it. Publish or discard the draft first.`)
          continue
        }
        const draft = placeStoryDraft(story, language, cover, refs)
        if (cover === null ? !sameDraft(stored.doc, draft) : stored.status !== 'published' || !sameDraft(stored.doc, draft))
          plan.refreshes.push({ key: story.key, version: stored, draft, publish: cover !== null })
      }
      const groupId = snapshot.versions.find(v => v.slug === story.slug.en)?.groupId
      for (const slug of story.mainStoryFor) {
        const place = snapshot.places.get(slug)
        if (groupId && place && place.mainStoryGroupId === null && place.status !== 'draft')
          plan.links.push({ key: story.key, groupId, placeId: place.id })
      }
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
    if (!story.cover && !snapshot.places.get(story.coverFrom))
      faults.push(`Story ${story.key} takes its cover from the place ${story.coverFrom}, which the store does not have.`)
    if (faults.length > 0) {
      plan.faults.push(...faults)
      continue
    }
    const coverMediaId = coverOf(story)
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
        return place && place.mainStoryGroupId === null && place.status !== 'draft' ? [place.id] : []
      }),
    })
  }
  return plan
}

export async function readStorySnapshot(pool: Pool, storeId: string, stories: readonly PlaceStory[] = placeStories, photos: readonly StoryPhoto[] = storyPhotos, covers: typeof placeCovers = placeCovers): Promise<StorySnapshot> {
  const used = new Set(stories.flatMap(storyPhotoKeys))
  const hashes = new Map(photos.filter(photo => used.has(photo.key) || covers.some(entry => entry.photo === photo.key)).map(photo => [photo.key, createHash('sha256').update(photoBytes(photo)).digest('hex')]))
  const [slugs, places, categories, versions, media] = await Promise.all([
    pool.query<{ slug: string }>(`select slug from content.story_versions where slug is not null`),
    pool.query<{ id: string, status: string, slug: string, main_story_group_id: string | null, cover_media_id: string | null, ready: boolean, has_draft: boolean }>(
      `select p.id, p.status, p.slug->>'en' as slug, p.main_story_group_id, p.cover_media_id, p.draft is not null as has_draft,
              coalesce((select m.status = 'ready' from content.media m where m.id = p.cover_media_id), false) as ready
         from content.places p where p.store_id = $1 and p.slug->>'en' is not null`,
      [storeId],
    ),
    pool.query<{ id: string, slug: string }>(`select id, slug from content.blog_categories where store_id = $1`, [storeId]),
    pool.query<{ group_id: string, language: ContentLanguage, slug: string, status: 'draft' | 'published', row_version: number, doc: StoryDraft, pending: boolean }>(
      `select group_id, language, slug, status, row_version, coalesce(draft, published) as doc, (status = 'published' and draft is not null) as pending
         from content.story_versions where store_id = $1 and slug = any($2::text[])`,
      [storeId, stories.flatMap(story => [story.slug.en, story.slug.de])],
    ),
    pool.query<{ id: string, sha256: string }>(
      `select distinct on (sha256) id, sha256 from content.media where store_id = $1 and status = 'ready' and sha256 = any($2::text[]) order by sha256, created_at, id`,
      [storeId, [...hashes.values()]],
    ),
  ])
  const idBySha = new Map(media.rows.map(row => [row.sha256, row.id]))
  return {
    slugs: new Set(slugs.rows.map(row => row.slug)),
    places: new Map(places.rows.map(row => [row.slug, { id: row.id, status: row.status, mainStoryGroupId: row.main_story_group_id, coverMediaId: row.cover_media_id, coverReady: row.ready, hasDraft: row.has_draft }])),
    blogCategoryIds: new Map(categories.rows.map(row => [row.slug, row.id])),
    versions: versions.rows.map(row => ({ groupId: row.group_id, language: row.language, slug: row.slug, status: row.status, rowVersion: row.row_version, doc: row.doc, pendingDraft: row.pending })),
    photoMedia: new Map([...hashes].flatMap(([key, sha]) => (idBySha.has(sha) ? [[key, idBySha.get(sha)!] as const] : []))),
  }
}

export function describePlan(plan: StoryPlan, dry: boolean): string {
  const verb = dry ? 'Would' : 'Will'
  const lines = [
    `${verb} upload ${plan.uploads.length} photos: ${plan.uploads.map(photo => photo.key).join(', ') || '-'}`,
    `${verb} set the cover of ${plan.placeCovers.length} places: ${plan.placeCovers.map(entry => entry.slug).join(', ') || '-'}${plan.coversSkipped.length ? ` (skipping ${plan.coversSkipped.join(', ')}: unpublished changes of a person)` : ''}`,
    `${verb} rewrite ${plan.refreshes.length} story versions (published again unless they have no cover): ${plan.refreshes.map(r => `${r.key}/${r.version.language}`).join(', ') || '-'}`,
    `${verb} set the main story of ${plan.links.length} places for existing stories`,
    `${verb} create ${plan.creates.length} stories and reviews, skipping ${plan.skipped.length}${plan.skipped.length ? ` (${plan.skipped.map(s => s.key).join(', ')})` : ''}:`,
    ...plan.creates.map(item => `  ${item.story.kind} ${item.story.slug.en} / ${item.story.slug.de}: ${item.publish ? 'published' : `draft (${item.draftReason})`}, places ${item.story.places.join(', ')}, main story of ${item.mainStoryPlaceIds.length} places`),
  ]
  return `${lines.join('\n')}\n`
}

export interface StepCounts { created: number, published: number, related: number, mainStories: number, refreshed: number, placeCovers: number }

// Applies a plan with no fault. Each use case runs in its own transaction.
export async function applyPlaceStories(pool: Pool, storeId: string, plan: StoryPlan, log: (line: string) => void = () => {}, stories: readonly PlaceStory[] = placeStories): Promise<StepCounts> {
  const db = createDatabase(pool)
  const deps = { uow: createUnitOfWork(db), stories: createStoryRepository(), media: createMediaRepository(), pins: createPinRepository(), audit: createAuditLog(systemClock), clock: systemClock }
  const actor: Actor = { kind: 'staff', userId: 'seed-curated', guestId: 'seed-curated', stores: new Map([[storeId, 'owner' as const]]) }
  const createGroup = makeCreateStoryGroup(deps)
  const createVersion = makeCreateStoryVersion(deps)
  const publish = makePublishStoryVersion(deps)
  const saveGroup = makeSaveStoryGroup(deps)
  const savePin = makeSavePin(deps)
  const publishPin = makePublishPin(deps)
  const saveVersion = makeSaveStoryVersion(deps)
  const counts: StepCounts = { created: 0, published: 0, related: 0, mainStories: 0, refreshed: 0, placeCovers: 0 }
  const pinRow = async (placeId: string) => (await pool.query<{ row_version: number, main_story_group_id: string | null, status: string }>(`select row_version, main_story_group_id, status from content.places where store_id = $1 and id = $2`, [storeId, placeId])).rows[0]

  // Place covers first: a story that reads the place cover finds it.
  for (const entry of plan.placeCovers) {
    const row = await pinRow(entry.placeId)
    const mediaId = (await pool.query<{ id: string }>(`select id from content.media where store_id = $1 and status = 'ready' and sha256 = $2 order by created_at limit 1`, [storeId, createHash('sha256').update(photoBytes(entry.photo)).digest('hex')])).rows[0]?.id
    if (!row || !mediaId)
      throw new SeedError(`The cover of ${entry.slug} cannot be set: the place or the photo is missing`)
    const saved = await savePin(actor, storeId, entry.placeId, row.row_version, { coverMediaId: mediaId, coverAlt: entry.photo.alt as Localized }, null)
    if (!saved.ok)
      throw new SeedError(`The cover of ${entry.slug} was refused: ${saved.reason}`)
    const live = await publishPin(actor, storeId, entry.placeId, saved.value.rowVersion, null)
    if (!live.ok)
      throw new SeedError(`The cover of ${entry.slug} was not published: ${live.reason}`)
    log(`Set the cover of ${entry.slug}`)
    counts.placeCovers += 1
  }

  // Stored versions: the draft is replaced as a whole, and the version goes live again.
  for (const { key, version, draft, publish: goLive } of plan.refreshes) {
    const saved = await saveVersion(actor, storeId, version.groupId, version.language, version.rowVersion, { draft: { ...version.doc, ...draft } }, null)
    if (!saved.ok)
      throw new SeedError(`The text of ${key} (${version.language}) was refused: ${saved.reason}`)
    if (!goLive) {
      log(`Rewrote ${key} (${version.language}); it has no cover and stays a draft`)
      counts.refreshed += 1
      continue
    }
    const live = await publish(actor, storeId, version.groupId, version.language, saved.value.rowVersion, null)
    if (!live.ok)
      throw new SeedError(`The text of ${key} (${version.language}) was not published: ${live.reason}${'gaps' in live ? ` ${live.gaps.join(',')}` : ''}`)
    log(`Rewrote and published ${key} (${version.language})`)
    counts.refreshed += 1
  }

  const groupIds = new Map<string, string>()
  for (const item of plan.creates) {
    const { story } = item
    const group = await createGroup(actor, storeId, { kind: story.kind, subjectPlaceId: item.subjectPlaceId, stayTag: story.stayTag, interests: story.interests, categoryIds: item.categoryIds, placeIds: item.placeIds }, null)
    if (!group.ok)
      throw new SeedError(`Story ${story.key} was refused: ${group.reason}`)
    groupIds.set(story.key, group.value.id)
    for (const language of languages) {
      const version = await createVersion(actor, storeId, group.value.id, language, { slug: story.slug[language], draft: placeStoryDraft(story, language, item.coverMediaId, plan.refs) }, null)
      if (!version.ok)
        throw new SeedError(`Story ${story.key} (${language}) was refused: ${version.reason}`)
      if (!item.publish)
        continue
      const live = await publish(actor, storeId, group.value.id, language, version.value.rowVersion, null)
      if (!live.ok)
        throw new SeedError(`Story ${story.key} (${language}) was not published: ${live.reason}${'gaps' in live ? ` ${live.gaps.join(',')}` : ''}`)
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
      throw new SeedError(`The related stories of ${item.story.key} were refused: ${saved.reason}`)
    counts.related += related.length
  }

  // Main stories: only a place with none, read again now, so a story a person chose is kept.
  const links = [
    ...plan.creates.flatMap(item => item.mainStoryPlaceIds.map(placeId => ({ key: item.story.key, groupId: groupIds.get(item.story.key)!, placeId }))),
    ...plan.links,
  ]
  for (const link of links) {
    const row = await pinRow(link.placeId)
    if (!row || row.main_story_group_id !== null)
      continue
    const saved = await savePin(actor, storeId, link.placeId, row.row_version, { mainStoryGroupId: link.groupId }, null)
    if (!saved.ok)
      throw new SeedError(`The main story of a place for ${link.key} was refused: ${saved.reason}${'gaps' in saved ? ` ${saved.gaps.join(',')}` : ''}`)
    counts.mainStories += 1
  }
  return counts
}

export interface StepDeps {
  // Puts a file in the library and returns its id. The default is the real media path, which needs the AWS_* settings.
  uploader?: MediaUploader
  // The places that get a cover photo. The default is the list of the data file; a test passes its own slugs.
  covers?: typeof placeCovers
}

// The step as the loader runs it. Returns the exit code: 0, or 1 on a fault (nothing is written then).
export async function placeStoriesStep(pool: Pool, storeId: string, options: { dry: boolean }, stories: readonly PlaceStory[] = placeStories, deps: StepDeps = {}, photos: readonly StoryPhoto[] = storyPhotos): Promise<number> {
  const covers = deps.covers ?? placeCovers
  let plan = planPlaceStories(stories, await readStorySnapshot(pool, storeId, stories, photos, covers), photos, covers)
  process.stdout.write(describePlan(plan, options.dry))
  if (plan.faults.length > 0) {
    process.stderr.write(`${plan.faults.join('\n')}\nNo story was written.\n`)
    return 1
  }
  if (options.dry)
    return 0
  const uploaded = plan.uploads.length
  if (uploaded > 0) {
    let uploader = deps.uploader
    if (!uploader) {
      if (!objectStorageSettings()) {
        process.stderr.write('AWS_* object storage settings are not set. Nothing was written.\n')
        return 2
      }
      const actor: Actor = { kind: 'staff', userId: 'seed-curated', guestId: 'seed-curated', stores: new Map([[storeId, 'owner' as const]]) }
      uploader = createMediaUploader(pool, storeId, actor, createMediaStorage())
    }
    for (const photo of plan.uploads) {
      await uploader(`${photo.key}.jpg`, photoBytes(photo), photo.alt as Localized)
      process.stdout.write(`Uploaded ${photo.key}\n`)
    }
    // The ids exist now: plan again, so the bodies carry them.
    plan = planPlaceStories(stories, await readStorySnapshot(pool, storeId, stories, photos, covers), photos, covers)
    if (plan.faults.length > 0 || plan.uploads.length > 0) {
      process.stderr.write(`${plan.faults.join('\n')}\nThe photos are not all in the library. No story was written.\n`)
      return 1
    }
  }
  const counts = await applyPlaceStories(pool, storeId, plan, line => process.stdout.write(`${line}\n`), stories)
  const changed = uploaded + counts.refreshed + counts.created + counts.mainStories + counts.placeCovers
  process.stdout.write(`Stories: ${counts.refreshed} versions rewritten, ${counts.placeCovers} place covers set, ${counts.created} created (${counts.published} versions published), ${counts.related} related links, ${counts.mainStories} main stories set.${changed === 0 ? ' Nothing was changed.' : ''}\n`)
  return 0
}
