import type { ContentLanguage, StayTag, StoryDraft } from '@sk/domain/content'
import type { Clock, UnitOfWork } from './ports.ts'

// What the public reads need. Rows are plain data; the use cases choose the language and shape the response.
// A story row holds only versions with status `published`, read from the published columns, never from `draft`.

export interface PublicCategoryRow {
  id: string
  slug: string
  // The database asks for at least one of the two languages, so a name may have only one.
  name: { en?: string, de?: string }
  parentId: string | null
  position: number
}

export interface PublicStoryVersionRow {
  language: ContentLanguage
  slug: string
  published: StoryDraft
  publishedAt: Date
  // storage_key of every ready media row the published text refers to, by media id.
  mediaKeys: Record<string, string>
}

export interface PublicStoryRow {
  id: string
  stayTag: StayTag
  interests: string[]
  categories: PublicCategoryRow[]
  versions: PublicStoryVersionRow[]
}

export interface PublicReadRepository<T> {
  // One row per story group that has a published version.
  listPublishedStories: (tx: T) => Promise<PublicStoryRow[]>
  // The group whose published version has this slug in `language`, else in the other language.
  findPublishedStoryBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicStoryRow | undefined>
  // Every category of the kind, in all stores, parents first, then by position.
  listCategories: (tx: T, kind: 'map' | 'blog') => Promise<PublicCategoryRow[]>
}

export interface ReadDeps<T> {
  uow: UnitOfWork<T>
  reads: PublicReadRepository<T>
  clock: Clock
}
