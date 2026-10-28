import type { ContentLanguage, Localized, PinDate, StayTag } from '@sk/domain/content'
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

// The published story document as stored. Stored JSON is read as written and not re-validated, so every field is
// optional and the body is unknown: the public view copies only what it knows.
export interface StoredStoryDoc {
  title?: string
  excerpt?: string
  authorName?: string
  authorRole?: string
  coverMediaId?: string | null
  body?: unknown
}

export interface PublicStoryVersionRow {
  language: ContentLanguage
  slug: string
  published: StoredStoryDoc
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

// A pin that `content.public_pins` lets through. Dates come from content.place_dates so that the injected clock decides
// which one is next; the view's own next_* columns are not read.
export interface PublicPinRow {
  id: string
  slug: Localized | null
  latitude: number
  longitude: number
  address: string | null
  weeklyHours: { day: number, opens: string, closes: string }[]
  stayTag: StayTag
  interests: string[]
  name: Localized
  tip: Localized
  firstPublishedAt: Date
  // storage_key of the cover when it is a ready media row.
  photoKey: string | null
  dates: PinDate[]
  // The categories on the pin, and the parents of those that are sub-categories.
  categories: PublicCategoryRow[]
  parentCategories: PublicCategoryRow[]
  // Slug of each published version of the main story, by language. Empty: no main story, or none published.
  mainStorySlugs: Partial<Record<ContentLanguage, string>>
}

export interface PublicTourStopRow {
  position: number
  latitude: number
  longitude: number
  title: Localized
  text: Localized
  minutesFromStart: number | null
  key: string | null
  // Only set when that place is itself public.
  placeId: string | null
}

export interface PublicTourRow {
  id: string
  slug: Localized
  stayTag: StayTag
  interests: string[]
  durationMinutes: number | null
  title: Localized
  summary: Localized
  meetingPoint: Localized
  sections: { id: string, heading: Localized, body: Localized }[]
  coverKey: string | null
  pdfKey: string | null
  keepsakeProductIds: string[]
  // Filled for a detail read; the list leaves it empty.
  stops: PublicTourStopRow[]
}

export interface PublicReadRepository<T> {
  // One row per story group that has a published version.
  listPublishedStories: (tx: T) => Promise<PublicStoryRow[]>
  // The group whose published version has this slug in `language`, else in the other language.
  findPublishedStoryBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicStoryRow | undefined>
  // Every category of the kind, in all stores, parents first, then by position.
  listCategories: (tx: T, kind: 'map' | 'blog') => Promise<PublicCategoryRow[]>
  // Pins in `content.public_pins` (published, and dated in the future or undated), newest first.
  listVisiblePins: (tx: T) => Promise<PublicPinRow[]>
  findVisiblePin: (tx: T, id: string) => Promise<PublicPinRow | undefined>
  // Tour guides with status `published`, in creation order newest first (id desc; a tour has no publish timestamp), without stops.
  listPublishedTours: (tx: T) => Promise<PublicTourRow[]>
  // The tour whose published slug is this one in `language`, else in the other language, with its stops.
  findPublishedTourBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicTourRow | undefined>
}

export interface ReadDeps<T> {
  uow: UnitOfWork<T>
  reads: PublicReadRepository<T>
  clock: Clock
}
