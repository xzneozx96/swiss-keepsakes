import type { ContentLanguage } from '@sk/domain/content'

// The shape of a prototype story (front-end/src/features/content/seed.ts), one entry per shared slug.
// The source data keeps the old intro and sections; seed-content.ts maps it to a body document (E2.13). The
// reading time is no longer stored, so readMinutes here is ignored.
export interface SeedStoryDoc {
  title: string
  excerpt: string
  intro: string
  authorName: string
  readMinutes: number | null
  coverMediaId: string | null
  sections: {
    id: string
    heading: string
    blocks: (
      | { type: 'paragraph', text: string }
      | { type: 'image', mediaId: string, caption: string }
      | { type: 'video', youtubeId: string, title: string, caption: string }
      | { type: 'audio', mediaId: string, title: string, caption: string }
    )[]
  }[]
}
export interface SeedStory { slug: string, versions: Partial<Record<ContentLanguage, SeedStoryDoc>> }

// The 12 prototype stories were removed on 2026-11-03 (owner): the stories of the seeded places replace them
// (place-stories.ts), and `db:seed` must not bring the old drafts back. The type stays for the import path of seed-content.ts.
export const seedStories: SeedStory[] = []
