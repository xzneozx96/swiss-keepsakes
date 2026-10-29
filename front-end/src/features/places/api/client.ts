import type { ConfirmUpload, Media, Pin, PinList, PinPublishBody, PinStoryOptionList, PinWriteBody, UploadGrant, UploadRequest } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent (`useIdempotencyKey`), so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's places (pins, E4.2). There is no demo implementation: every call goes to the API, and a refusal
 * arrives as an `ApiProblem`. `ifMatch` is the `rowVersion` of the pin as it was opened.
 */
export interface PlacesClient {
  list: (input: { storeId: string }) => Promise<PinList>
  get: (input: { storeId: string, id: string }) => Promise<Pin>
  storyOptions: (input: { storeId: string }) => Promise<PinStoryOptionList>
  /** The state of an uploaded file, for the photo field. */
  media: (input: { storeId: string, id: string }) => Promise<Media>
  create: (input: Keyed<{ storeId: string } & PinWriteBody>) => Promise<Pin>
  save: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & PinWriteBody>) => Promise<Pin>
  publish: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & PinPublishBody>) => Promise<Pin>
  hide: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Pin>
  remove: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<void>
  /** The grant to PUT a photo with. */
  requestUpload: (input: Keyed<{ storeId: string } & UploadRequest>) => Promise<UploadGrant>
  confirmUpload: (input: Keyed<{ storeId: string } & ConfirmUpload>) => Promise<Media>
}
