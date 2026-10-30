import type { ConfirmUpload, Media, MediaItem, MediaList, MediaPatchBody, MediaUses, UploadGrant, UploadRequest } from '@sk/api-contract'
import type { MediaKind } from '@sk/domain/content'

/** What one page of the library is asked for. `use` and `status` are comma separated lists. */
export interface MediaListQuery {
  kind: MediaKind
  q?: string | undefined
  use?: string | undefined
  status?: string | undefined
  page: number
  pageSize: number
}

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The media library of the store (E4.11). There is no demo implementation: every call goes to the API, and a
 * refusal arrives as an `ApiProblem`. A file is uploaded in three steps (a grant, the PUT to storage, the
 * confirm), which `upload` and `replace` run as one command; each step has its own Idempotency-Key.
 */
export interface MediaClient {
  /** One page of one kind, with the counts for the tabs and the filters. */
  list: (input: { storeId: string, query: MediaListQuery }) => Promise<MediaList>
  /** The state of one file, for a field that shows a photo by its id (processing, ready). */
  get: (input: { storeId: string, id: string }) => Promise<Media>
  /** The pages that use one file. */
  uses: (input: { storeId: string, id: string }) => Promise<MediaUses>
  /** A new file. It comes back `processing`; the list reads again until it is ready. */
  upload: (input: { storeId: string, file: File, contentType: string }) => Promise<Media>
  /** The new file takes the place of the old under the same id: next version, new key. */
  replace: (input: { storeId: string, id: string, file: File, contentType: string }) => Promise<MediaItem>
  /** The grant to PUT a file with, for a field that uploads and keeps the id itself (the photo block). */
  requestUpload: (input: Keyed<{ storeId: string } & UploadRequest>) => Promise<UploadGrant>
  /** Turns an uploaded file into a media record. It comes back `processing`. */
  confirmUpload: (input: Keyed<{ storeId: string } & ConfirmUpload>) => Promise<Media>
  /** The name and the description. */
  describe: (input: { storeId: string, id: string, idempotencyKey: string } & MediaPatchBody) => Promise<MediaItem>
  /** Refused while any page uses the file. */
  retire: (input: { storeId: string, id: string, idempotencyKey: string }) => Promise<MediaItem>
}
