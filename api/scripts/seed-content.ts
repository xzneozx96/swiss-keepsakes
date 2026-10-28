import type { ContentLanguage } from '@sk/domain/content'
import type { Database, Tx } from '../src/platform/db/client.ts'
import type { SeedStory } from './seed-data/stories.ts'
import type { SeedTour } from './seed-data/tours.ts'
import { sql } from 'drizzle-orm'
import { createStoryRepository } from '../src/modules/content/adapters/story-repository.ts'
import { createTourRepository } from '../src/modules/content/adapters/tour-repository.ts'
import { seedStories } from './seed-data/stories.ts'
import { seedTours } from './seed-data/tours.ts'

// Imports the prototype's stories and tour guides into one store as drafts (T-E2.12). It never publishes, makes no
// media, category or pin rows, and leaves a row that exists alone: no update and no row_version bump. A story is
// skipped when any of its versions (language, slug) exists, a tour when any of its slugs (en, de) exists. Slugs
// are unique across stores, so a slug that another store holds counts as existing too.
const stories = createStoryRepository()
const tours = createTourRepository()
const languages: ContentLanguage[] = ['en', 'de']

async function seedStory(db: Database, storeId: string, story: SeedStory, at: Date): Promise<boolean> {
  const present = languages.filter(l => story.versions[l])
  return db.transaction(async (tx: Tx) => {
    for (const language of present) {
      const found = await tx.execute(sql`select 1 from content.story_versions where language = ${language} and slug = ${story.slug}`)
      if (found.rows.length > 0)
        return false
    }
    const group = await stories.insertGroup(tx, storeId, { kind: 'story', subjectPlaceId: null }, at)
    for (const language of present)
      await stories.insertVersion(tx, storeId, group.id, language, { slug: story.slug, draft: story.versions[language]! }, at)
    return true
  })
}

async function seedTour(db: Database, storeId: string, tour: SeedTour, at: Date): Promise<boolean> {
  return db.transaction(async (tx: Tx) => {
    // Every slug the tour carries, since each language has its own unique index.
    for (const language of languages) {
      const value = tour.slug[language]
      if (!value)
        continue
      const found = await tx.execute(sql`select 1 from content.tours where slug->>${language} = ${value}`)
      if (found.rows.length > 0)
        return false
    }
    await tours.insert(tx, storeId, {
      slug: tour.slug,
      durationMinutes: tour.durationMinutes,
      draft: tour.doc,
      stops: tour.stops.map(s => ({ ...s, mediaId: null, placeId: null })),
    }, at)
    return true
  })
}

export async function seedContent(db: Database, storeId: string): Promise<{ stories: number, tours: number }> {
  const at = new Date()
  const counts = { stories: 0, tours: 0 }
  for (const story of seedStories) {
    if (await seedStory(db, storeId, story, at))
      counts.stories += 1
  }
  for (const tour of seedTours) {
    if (await seedTour(db, storeId, tour, at))
      counts.tours += 1
  }
  return counts
}
