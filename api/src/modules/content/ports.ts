import type { ContentLanguage, Localized, Pin, PinDate, StayTag, StoryDraft, StoryGroup, StoryVersion, TourGuide, TourGuideDoc, TourGuideStop, WeeklySpan } from '@sk/domain/content'

// What the content use cases need. Same shapes as the identity module's ports, copied so modules do not import
// each other (backend/architecture.md). The platform's unit of work fits the generic shape structurally.

export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

export interface Clock {
  now: () => Date
}

export interface AuditEntry {
  storeId: string | null
  actor: string
  entity: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  requestId: string | null
}

export interface AuditLog<T> {
  record: (tx: T, entry: AuditEntry) => Promise<void>
}

export interface MediaRow {
  id: string
  kind: 'image' | 'audio' | 'pdf'
  status: 'processing' | 'ready' | 'retired'
}

export interface MediaRepository<T> {
  // The rows of this store among the ids. An id of another store has no row.
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaRow[]>
}

// What a pin save may change. `title` and `tip` together form the draft document; the repository stores it with
// the key `name` for `title`, because places_published_fields_check reads published->'name'.
export interface PinChanges {
  title?: Localized
  tip?: Localized
  slug?: Localized | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  weeklyHours?: WeeklySpan[]
  stayTag?: StayTag
  interests?: string[]
  coverMediaId?: string | null
  mainStoryGroupId?: string | null
  categoryIds?: string[]
  dates?: Omit<PinDate, 'id'>[]
}

export interface PinRepository<T> {
  insert: (tx: T, storeId: string, changes: PinChanges, at: Date) => Promise<Pin>
  // Locks the row; dates and category ids come with it. An id of another store has no row.
  findForUpdate: (tx: T, storeId: string, pinId: string) => Promise<Pin | undefined>
  // Writes the typed columns and the draft document, replaces the category and date lists when given, bumps row_version.
  save: (tx: T, pin: Pin, changes: PinChanges, at: Date) => Promise<Pin>
  // draft becomes published and is cleared, and the slug is replaced in the same statement so it keeps covering the
  // published languages (places_published_fields_check); first_published_at is kept once set.
  publish: (tx: T, pin: Pin, at: Date, slug: Localized) => Promise<Pin>
  hide: (tx: T, pin: Pin, at: Date) => Promise<Pin>
  remove: (tx: T, storeId: string, pinId: string) => Promise<boolean>
  // The ids among the given ones that are pins of this store, whatever their status. An id of another store is left out.
  idsInStore: (tx: T, storeId: string, ids: string[]) => Promise<string[]>
}

// What a story group save may change. A list replaces the whole list, in the order given.
export interface StoryGroupChanges {
  stayTag?: StayTag
  interests?: string[]
  categoryIds?: string[]
  placeIds?: string[]
  keepsakeProductIds?: string[]
  relatedGroupIds?: string[]
}

// What a story version save may change. A save replaces the whole draft document.
export interface StoryVersionChanges {
  slug?: string | null
  draft?: StoryDraft
}

export interface StoryRepository<T> {
  insertGroup: (tx: T, storeId: string, input: { kind: StoryGroup['kind'], subjectPlaceId: string | null } & StoryGroupChanges, at: Date) => Promise<StoryGroup>
  // Locks the row; the lists come with it. An id of another store has no row.
  findGroupForUpdate: (tx: T, storeId: string, groupId: string) => Promise<StoryGroup | undefined>
  // Writes the typed columns, replaces the lists that are given (positions from 1), bumps row_version.
  saveGroup: (tx: T, group: StoryGroup, changes: StoryGroupChanges, at: Date) => Promise<StoryGroup>
  // undefined when the group already has a version in that language.
  insertVersion: (tx: T, storeId: string, groupId: string, language: ContentLanguage, changes: StoryVersionChanges, at: Date) => Promise<StoryVersion | undefined>
  findVersionForUpdate: (tx: T, storeId: string, groupId: string, language: ContentLanguage) => Promise<StoryVersion | undefined>
  // Writes slug and draft, replaces the draft media_refs of the version, bumps row_version.
  saveVersion: (tx: T, version: StoryVersion, changes: StoryVersionChanges, at: Date) => Promise<StoryVersion>
  // draft becomes published and is cleared; published_at is kept once set; media_refs move from the draft slot to the published slot.
  publishVersion: (tx: T, version: StoryVersion, at: Date) => Promise<StoryVersion>
  // status goes back to draft; the published text stays.
  unpublishVersion: (tx: T, version: StoryVersion, at: Date) => Promise<StoryVersion>
  moveVersion: (tx: T, version: StoryVersion, targetGroupId: string, at: Date) => Promise<StoryVersion>
  removeVersion: (tx: T, storeId: string, groupId: string, language: ContentLanguage) => Promise<boolean>
}

// What a tour guide save may change. A tour guide has no price and no departure. `stops` and `keepsakeProductIds`
// replace the whole list, in the order given; `draft` merges per field into the stored draft.
export interface TourChanges {
  slug?: Localized | null
  stayTag?: StayTag
  interests?: string[]
  durationMinutes?: number | null
  coverMediaId?: string | null
  pdfMediaId?: string | null
  keepsakeProductIds?: string[]
  stops?: Omit<TourGuideStop, 'id' | 'position'>[]
  // Each field present replaces that field of the draft; a field left out keeps its stored text.
  draft?: Partial<TourGuideDoc>
}

export interface TourRepository<T> {
  insert: (tx: T, storeId: string, changes: TourChanges, at: Date) => Promise<TourGuide>
  // Locks the row; stops (by position) and keepsake ids come with it. An id of another store has no row.
  findForUpdate: (tx: T, storeId: string, tourId: string) => Promise<TourGuide | undefined>
  // Writes the typed columns and the draft, replaces the stops (positions from 1) and keepsake links when given, bumps row_version.
  save: (tx: T, tour: TourGuide, changes: TourChanges, at: Date) => Promise<TourGuide>
  // draft becomes published and is cleared; the slug is written in the same update.
  publish: (tx: T, tour: TourGuide, at: Date, slug: Localized) => Promise<TourGuide>
  // status goes back to draft; the published text stays.
  unpublish: (tx: T, tour: TourGuide, at: Date) => Promise<TourGuide>
  remove: (tx: T, storeId: string, tourId: string) => Promise<boolean>
}
