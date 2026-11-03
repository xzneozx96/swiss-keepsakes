import type { ContentLanguage, Localized, MediaKind, Pin, PinDate, PinListEntry, PinStoryOption, StayTag, StoryDraft, StoryGroup, StoryVersion, TourGuide, TourGuideDoc, TourGuideStop, WeeklySpan } from '@sk/domain/content'

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

// One row of content.media, as the use cases see it.
export interface MediaRecord {
  id: string
  storeId: string
  kind: MediaKind
  storageKey: string
  contentType: string
  byteSize: number
  sha256: string
  width: number | null
  height: number | null
  status: 'processing' | 'ready' | 'retired'
  // What the merchant sees and searches; starts as the uploaded file name.
  name: string
  // The file name of the latest upload.
  fileName: string
  alt: Localized
  durationSeconds: number | null
  // Starts at 1; a replacement adds one and moves storageKey to a new versioned key.
  version: number
  createdAt: Date
}

// What a replacement writes into the row: the new file, its derived facts and the next version.
export interface MediaReplacement {
  storageKey: string
  contentType: string
  byteSize: number
  sha256: string
  width: number | null
  height: number | null
  fileName: string
}

export interface MediaRepository<T> {
  // The rows of this store among the ids. An id of another store has no row.
  find: (tx: T, storeId: string, ids: string[]) => Promise<MediaRow[]>
  // The whole rows of this store among the ids, for a read that shows the files. An id of another store has no row.
  findMany: (tx: T, storeId: string, ids: string[]) => Promise<MediaRecord[]>
  // A new row, status `processing`. A row inserted without a name is named by the database (migration 0011).
  insert: (tx: T, row: { id: string, storeId: string, kind: MediaKind, storageKey: string, contentType: string, byteSize: number, sha256: string, name?: string, fileName?: string }, at: Date) => Promise<MediaRecord>
  // An id of another store has no row. `forUpdate` locks the row until the transaction ends.
  findById: (tx: T, storeId: string, id: string, options?: { forUpdate?: boolean }) => Promise<MediaRecord | undefined>
  // `dims` for an image, none for audio and PDF (the table CHECK refuses a width on anything but an image).
  // undefined when the row is gone (or belongs to another store).
  markReady: (tx: T, row: MediaRecord, dims: { width: number, height: number } | undefined, at: Date) => Promise<MediaRecord | undefined>
  // Sets status `retired` and `retired_at` together (media_retired_check). undefined when the row is gone (or belongs to another store).
  retire: (tx: T, row: MediaRecord, at: Date) => Promise<MediaRecord | undefined>
  // Writes the name and the description that are given. undefined when the row is gone (or belongs to another store).
  describe: (tx: T, row: MediaRecord, changes: { name?: string, alt?: Localized }, at: Date) => Promise<MediaRecord | undefined>
  // The new file replaces the old under the same id, version + 1. The row keeps status `ready`. undefined when the row is gone.
  replace: (tx: T, row: MediaRecord, next: MediaReplacement, at: Date) => Promise<MediaRecord | undefined>
  // The ready (not processing, not retired) files of this store whose bytes have one of these SHA-256 hashes, oldest first.
  findReadyByHash: (tx: T, storeId: string, hashes: string[]) => Promise<MediaRecord[]>
  // True when a tour (PDF or cover), a tour stop, a pin cover or any media_refs row points at the id.
  isReferenced: (tx: T, storeId: string, mediaId: string) => Promise<boolean>
}

// A keepsake that holds a photo, as the catalog module reports it (ADR-013: by plain id, no table of another module is
// read). main.ts builds this port from the catalog module's read.
export interface KeepsakeUse {
  mediaId: string
  productId: string
  name: Localized
  published: boolean
  coverMediaId: string | null
}

export interface KeepsakeUses<T> {
  list: (tx: T, storeId: string) => Promise<KeepsakeUse[]>
}

export interface MediaUsage {
  pages: number
  published: number
  drafts: number
}

export interface MediaListRow extends MediaRecord {
  usage: MediaUsage
}

export type MediaUseFilter = 'unused' | 'drafts' | 'published'

export interface MediaListQuery {
  kind: MediaKind
  q?: string | undefined
  use: MediaUseFilter[]
  status: MediaRecord['status'][]
  page: number
  pageSize: number
}

export interface MediaListPage {
  rows: MediaListRow[]
  total: number
  kinds: Record<MediaKind, number>
  uses: Record<MediaUseFilter, number>
  statuses: Record<MediaRecord['status'], number>
}

// One page that uses a file. A story counts once per language version.
export interface MediaUseRow {
  pageKind: 'story' | 'place' | 'tour' | 'keepsake'
  pageId: string
  language: ContentLanguage | null
  title: Localized
  role: 'cover' | 'text' | 'pdf' | 'stop' | 'photo'
  published: boolean
  // The media row of the page's picture, for a thumbnail.
  thumbnailMediaId: string | null
}

// The library reads: the files of a store with how many pages use each, and the pages that use one file. Keepsake
// photos are not in content's tables, so the caller hands them in.
export interface MediaLibrary<T> {
  list: (tx: T, storeId: string, query: MediaListQuery, keepsakes: KeepsakeUse[]) => Promise<MediaListPage>
  usesOf: (tx: T, storeId: string, mediaId: string, keepsakes: KeepsakeUse[]) => Promise<MediaUseRow[]>
  // The thumbnails of the pages: the storage key and width of each ready image among the ids.
  thumbnails: (tx: T, storeId: string, ids: string[]) => Promise<Map<string, { storageKey: string, width: number | null }>>
}

// What the save and read use cases need of the media table: they only look rows up.
export type MediaLookup<T> = Pick<MediaRepository<T>, 'find'>

// The job queue, as the identity and notifications modules also define it. `send` writes the job through the
// caller's transaction, so a rollback removes it with the business change.
export interface JobQueue<T> {
  send: (tx: T, queue: string, data: object, options?: { startAfter?: Date, id?: string, retryLimit?: number, retryDelay?: number, retryBackoff?: boolean, expireInSeconds?: number, retentionSeconds?: number, deleteAfterSeconds?: number }) => Promise<void>
}

// What a pin save may change. `title` and `tip` together form the draft document; the repository stores it with
// the key `name` for `title`, because places_published_fields_check reads published->'name'.
export interface PinChanges {
  title?: Localized
  tip?: Localized
  localTip?: Localized
  // Written as it comes: the use cases set it from the title (the server makes the slug) and ignore what a client sent.
  slug?: Localized | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  mapsLink?: string | null
  weeklyHours?: WeeklySpan[]
  stayTag?: StayTag
  interests?: string[]
  mustVisit?: boolean
  coverMediaId?: string | null
  coverAlt?: Localized
  // The extra photos in order; the list replaces the stored one. The alt text goes to the draft, keyed by media id.
  photos?: { mediaId: string, alt: Localized }[]
  // The one outbound link; null removes it.
  outboundUrl?: string | null
  mainStoryGroupId?: string | null
  categoryIds?: string[]
  dates?: Omit<PinDate, 'id'>[]
}

// What the merchant list needs of one pin, read with its dates and category ids in one query.
export interface PinListRow {
  id: string
  status: Pin['status']
  draft: Pin['draft']
  published: Pin['published']
  slug: Pin['slug']
  latitude: number | null
  longitude: number | null
  categoryIds: string[]
  dates: PinDate[]
  stayTag: StayTag
  interests: string[]
  coverMediaId: string | null
  // The cover file when it is ready; null when the pin has none or the file is not ready (still processing, or retired).
  cover: MediaRecord | null
  mainStoryGroupId: string | null
  mainStoryPublished: boolean
  rowVersion: number
  updatedAt: Date
}

/** A row of the merchant pin list with its cover file: the entry of the domain plus what the view needs for the photo. */
export type MerchantPinEntry = PinListEntry & { cover: MediaRecord | null }

/** How many things use a pin: stories that link it, editorial reviews about it, tours with a stop on it. */
export interface PinUsage { stories: number, reviews: number, tours: number }

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
  // What names the pin and so holds it against a delete: stories that link it, editorial reviews about it, tour stops on it.
  usage: (tx: T, storeId: string, pinId: string) => Promise<PinUsage>
  // Its dates, categories, photos and link go with it (ON DELETE CASCADE). Any status: migration 0020 lifted the published guard.
  remove: (tx: T, storeId: string, pinId: string) => Promise<boolean>
  // The ids among the given ones that are pins of this store, whatever their status. An id of another store is left out.
  idsInStore: (tx: T, storeId: string, ids: string[]) => Promise<string[]>
  // A read without a lock. An id of another store has no row.
  find: (tx: T, storeId: string, pinId: string) => Promise<Pin | undefined>
  // A platform-wide advisory lock for the transaction. A write that makes a slug takes it before it reads `slugsTaken`,
  // so two writes cannot make the same slug (the unique indexes stay the backstop).
  lockSlugs: (tx: T) => Promise<void>
  // The slugs in this language that pins hold, in every store, except the pin `exceptPinId`.
  slugsTaken: (tx: T, language: ContentLanguage, exceptPinId?: string) => Promise<Set<string>>
  // Every pin of the store, most recently edited first.
  list: (tx: T, storeId: string) => Promise<PinListRow[]>
  // The story groups of the store with their titles, for the main-story picker, most recently created first.
  storyOptions: (tx: T, storeId: string) => Promise<PinStoryOption[]>
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
  // The version without a lock, for a read.
  findVersion: (tx: T, storeId: string, groupId: string, language: ContentLanguage) => Promise<StoryVersion | undefined>
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

export type Bucket = 'uploads' | 'media'

export interface StoredObject {
  key: string
  size: number
  contentType: string | undefined
  lastModified: Date | undefined
}

// Object storage (Neon Object Storage, S3 API). Keys are bucket-relative: the bucket is never part of a key.
export interface ObjectStorage {
  // A URL the browser PUTs the file to. The bucket is always `uploads`. The content type and length are signed into
  // the URL, but whether the storage enforces them is unverified on Neon, so the confirm step re-checks the stored bytes.
  presignPut: (input: { key: string, contentType: string, byteSize: number, expiresInSeconds: number }) => Promise<{ url: string, headers: Record<string, string> }>
  // undefined when the key does not exist.
  head: (bucket: Bucket, key: string) => Promise<StoredObject | undefined>
  // With `maxBytes`, an object larger than that is never read into memory: it throws ObjectTooLargeError.
  get: (bucket: Bucket, key: string, maxBytes?: number) => Promise<Uint8Array | undefined>
  put: (bucket: Bucket, key: string, body: Uint8Array, meta: { contentType: string, cacheControl?: string, contentDisposition?: string }) => Promise<void>
  // A missing key is not an error.
  delete: (bucket: Bucket, key: string) => Promise<void>
  // Follows continuation tokens.
  list: (bucket: Bucket, prefix: string) => Promise<StoredObject[]>
  // `${endpoint}/media/${key}`
  publicUrl: (key: string) => string
}

// `get` found an object larger than the `maxBytes` it was given.
export class ObjectTooLargeError extends Error {
  override name = 'ObjectTooLargeError'
}

// The storage is not configured, or it answered with a server error after the SDK's own retries. Mapped to 503
// `storage-unavailable`.
export class StorageUnavailableError extends Error {
  override name = 'StorageUnavailableError'
}

// Raised once for a media file that will not be processed: its job used all its attempts. Ids only.
// `inUse` is set when a story or tour still uses the file: the row stays processing and the merchant must replace it.
export interface MediaFailure {
  storeId: string
  mediaId: string
  inUse?: true
}

export type MediaAlert = (failure: MediaFailure) => void

// A leftover that needs no retry: ids and an error name only.
export type MediaWarn = (event: { event: string, storeId: string, mediaId: string, error: string }) => void
export type CategoryKind = 'map' | 'blog'

// One row of a category list. `childCount` counts the sub-categories, `useCount` the pins (map) or story groups (blog)
// tagged with it, whatever their status.
export interface CategoryRow {
  id: string
  storeId: string
  name: Localized
  slug: string
  parentId: string | null
  // Map categories only; a blog category is never on the home.
  showOnHome: boolean
  position: number
  childCount: number
  useCount: number
}

export interface CategoryRepository<T> {
  // Parents first, then sub-categories, each by position.
  list: (tx: T, storeId: string, kind: CategoryKind) => Promise<CategoryRow[]>
  // A per store and kind advisory lock for the transaction. Every write takes it first, so two writes to one list queue up.
  lockList: (tx: T, storeId: string, kind: CategoryKind) => Promise<void>
  slugsTaken: (tx: T, storeId: string, kind: CategoryKind) => Promise<Set<string>>
  insert: (tx: T, storeId: string, kind: CategoryKind, input: { name: Localized, slug: string, parentId: string | null, showOnHome: boolean, position: number }, at: Date) => Promise<CategoryRow>
  update: (tx: T, storeId: string, kind: CategoryKind, id: string, changes: { name?: Localized, parentId?: string | null, showOnHome?: boolean, position?: number }, at: Date) => Promise<CategoryRow>
  // Positions 1..n in the order given.
  setPositions: (tx: T, storeId: string, kind: CategoryKind, orderedIds: string[], at: Date) => Promise<void>
  // false when the id has no row. A link that still names the category makes the database refuse (in-use).
  remove: (tx: T, storeId: string, kind: CategoryKind, id: string) => Promise<boolean>
}

// One step of a short link: the answer to a request that follows no redirect and reads no body. Undefined when the
// request failed or ran out of time. A port, so the use case holds the rules and the adapter holds `fetch`.
export interface MapsLinkStep {
  status: number
  location: string | null
}

export interface MapsLinks {
  step: (url: URL, timeoutMs: number) => Promise<MapsLinkStep | undefined>
}

/** An entrance in the federal building register: its address and where it stands. */
export interface RegisteredBuilding {
  street: string
  houseNumber: string
  postcode: string
  city: string
  latitude: number
  longitude: number
}

/** The address of one building as the use case returns it: the parts and the one-line form. The route's `Address` schema has the same shape. */
export interface FoundAddress {
  street: string
  houseNumber: string
  postcode: string
  city: string
  formatted: string
}

// The buildings the register holds around a position, in no particular order, at least those within `radiusMeters`.
// Undefined when the register could not be read or ran out of time. A port, so the use case holds the rules and the
// adapter holds `fetch`.
export interface AddressRegister {
  buildingsNear: (latitude: number, longitude: number, radiusMeters: number, timeoutMs: number) => Promise<RegisteredBuilding[] | undefined>
}
