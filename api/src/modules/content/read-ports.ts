import type { CategoryIcon, ContentLanguage, Localized, PinDate, StayTag } from '@sk/domain/content'
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

// A row of the public category list: map categories carry their icon and home switch, blog categories never do.
export interface PublicCategoryListRow extends PublicCategoryRow {
  icon: CategoryIcon | null
  showOnHome: boolean
  // Blog categories: the published stories with the category, those of its direct sub-categories included for a parent. Map categories: 0.
  storyCount: number
}

// The published story document as stored. Stored JSON is read as written and not re-validated, so every field is
// optional and the body is unknown: the public view copies only what it knows.
export interface StoredStoryDoc {
  title?: string
  excerpt?: string
  authorName?: string
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
  // Pixel width of each of those media rows that has one; the cover's webp copies follow from it.
  mediaWidths?: Record<string, number | null>
}

export interface PublicStoryRow {
  id: string
  stayTag: StayTag
  interests: string[]
  categories: PublicCategoryRow[]
  versions: PublicStoryVersionRow[]
}

// What a story's own read adds to the row the list shares: the pins it tags (only those `content.public_pins` lets
// through, in the editor's order), the stories it relates to (only those with a published version, in the editor's
// order) and the ids of the keepsakes it links (in the editor's order; the catalog says which of them can be shown).
export interface PublicStoryDetailRow extends PublicStoryRow {
  places: PublicPinRow[]
  related: PublicStoryRow[]
  keepsakeProductIds: string[]
}

// A pin that `content.public_pins` lets through. Dates come from content.place_dates so that the injected clock decides
// which one is next; the view's own next_* columns are not read.
export interface PublicPinRow {
  id: string
  slug: Localized | null
  latitude: number
  longitude: number
  address: string | null
  mapsLink: string | null
  weeklyHours: { day: number, opens: string, closes: string }[]
  stayTag: StayTag
  interests: string[]
  name: Localized
  tip: Localized
  firstPublishedAt: Date
  // storage_key of the cover when it is a ready media row.
  photoKey: string | null
  // Pixel width of that cover, which decides the variants that exist.
  photoWidth: number | null
  // The merchant's must-visit flag on the pin.
  mustVisit: boolean
  dates: PinDate[]
  // The categories on the pin, and the parents of those that are sub-categories.
  categories: PublicCategoryRow[]
  parentCategories: PublicCategoryRow[]
  // Slug of each published version of the main story, by language. Empty: no main story, or none published.
  mainStorySlugs: Partial<Record<ContentLanguage, string>>
}

// What a pin's own read adds to the row the list shares: the outbound link, the photos in the merchant's order with the
// text for each, and the published stories that tag the pin. The list never loads them.
export interface PublicPinDetailRow extends PublicPinRow {
  link: string | null
  // The cover first, then the extra photos; only ready media.
  photos: { key: string, width: number | null, alt: Localized }[]
  // The main story and every story whose places include this pin, each with its published versions.
  stories: PublicStoryRow[]
  mainStoryId: string | null
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
  // How many stops the guide has, read in the list query (a list row carries no stops).
  stopCount: number
  slug: Localized
  stayTag: StayTag
  interests: string[]
  durationMinutes: number | null
  title: Localized
  summary: Localized
  meetingPoint: Localized
  sections: { id: string, heading: Localized, body: Localized }[]
  coverKey: string | null
  // Pixel width of the ready cover; null when unknown or without a cover.
  coverWidth: number | null
  pdfKey: string | null
  keepsakeProductIds: string[]
  // Filled for a detail read; the list leaves it empty.
  stops: PublicTourStopRow[]
}

// Where a page of stories starts: the date of the version carried (as text at full precision, UTC) and the group id.
export type StoryPageKey = readonly [publishedAt: string, id: string]

export interface StoryPageQuery {
  language: ContentLanguage
  // A blog category slug; a parent includes its direct sub-categories. Null: no filter. An unknown slug matches nothing.
  category: string | null
  // Without a limit the page is the whole filtered set (ADR-033 section 12, one release).
  limit?: number | undefined
  after?: StoryPageKey | undefined
}

// Where a page of tours starts: the tour id (a `uuidv7`, so newest first; a tour has no publish timestamp).
export type TourPageKey = readonly [id: string]

export interface TourPageQuery {
  // Without a limit the page is the whole list (ADR-033 section 12, one release).
  limit?: number | undefined
  after?: TourPageKey | undefined
}

// A search hit: what a kind's row is called, its id and its rank as text at full precision (a double as text round-trips exactly).
export type SearchHitKind = 'story' | 'place' | 'tour' | 'keepsake'

export interface SearchHit {
  kind: SearchHitKind
  id: string
  score: string
}

// Where a page of search hits starts: the rank, the id and the kind of the last hit seen. Ranked best first, the id then the kind breaking a tie.
export type SearchKey = readonly [score: string, id: string, kind: string]

export interface ContentSearchQuery {
  // The typed text, or null when only an interest is asked for (every hit then ranks 0, so the newest id comes first).
  q: string | null
  interest: string | null
  // The kinds whose hits are read; none reads only the counts. `limit` hits come back, plus one that says another page follows.
  kinds: ('story' | 'place' | 'tour')[]
  limit: number
  after?: SearchKey | undefined
}

export interface PublicReadRepository<T> {
  // Published stories, visible pins and published tours whose title matches, best first. `counts` always covers all three kinds
  // (a filter shows them), whatever `kinds` asks for.
  searchPublished: (tx: T, query: ContentSearchQuery) => Promise<{ hits: SearchHit[], counts: Record<'story' | 'place' | 'tour', number> }>
  // The rows behind the hits of a page, in no set order; an id that is no longer public has no row.
  listPublishedStoriesByIds: (tx: T, ids: string[]) => Promise<PublicStoryRow[]>
  listVisiblePinsByIds: (tx: T, ids: string[]) => Promise<PublicPinRow[]>
  listPublishedToursByIds: (tx: T, ids: string[]) => Promise<PublicTourRow[]>
  // One row per story group that has a published version, newest first by the date of the version carried in `language`
  // (the other language when it has none), the group id breaking a tie. `total` counts the whole filtered set. `next`
  // is the key of the last row when more follow, else null.
  pagePublishedStories: (tx: T, query: StoryPageQuery) => Promise<{ rows: PublicStoryRow[], next: StoryPageKey | null, total: number }>
  // The group whose published version has this slug in `language`, else in the other language.
  findPublishedStoryBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicStoryDetailRow | undefined>
  // Every category of the kind, in all stores, parents first, then by position.
  listCategories: (tx: T, kind: 'map' | 'blog') => Promise<PublicCategoryListRow[]>
  // Pins in `content.public_pins` (published, and dated in the future or undated), newest first.
  listVisiblePins: (tx: T) => Promise<PublicPinRow[]>
  findVisiblePin: (tx: T, id: string) => Promise<PublicPinDetailRow | undefined>
  // Tour guides with status `published`, in creation order newest first (id desc; a tour has no publish timestamp), without stops.
  // `next` is the key of the last row when more follow, else null. `total` counts every published guide.
  pagePublishedTours: (tx: T, query: TourPageQuery) => Promise<{ rows: PublicTourRow[], next: TourPageKey | null, total: number }>
  // The tour whose published slug is this one in `language`, else in the other language, with its stops.
  findPublishedTourBySlug: (tx: T, slug: string, language: ContentLanguage) => Promise<PublicTourRow | undefined>
}

export interface ReadDeps<T> {
  uow: UnitOfWork<T>
  reads: PublicReadRepository<T>
  clock: Clock
  // The public address of a storage key (the original or a variant), as the merchant views build it.
  publicUrl: (key: string) => string
}

// A keepsake as a story shows it: no price. The port is filled in main.ts from the catalog's public read, so content
// never reads a catalog table (ADR-013). It returns only the keepsakes a guest can see, in the order of `ids`.
export interface PublicStoryKeepsakeCard {
  id: string
  slug: string
  name: string
  cover: { url: string, variants: { width: number, url: string }[] } | null
  // The first paragraph of the description as plain text, null when there is none.
  subtitle: string | null
  soldOut: boolean
}

export interface StoryReadDeps<T> extends ReadDeps<T> {
  keepsakeCards: (ids: string[], language: ContentLanguage) => Promise<PublicStoryKeepsakeCard[]>
}
