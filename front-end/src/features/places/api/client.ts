import type { Address, MapsLinkPosition, Pin, PinList, PinPublishBody, PinStoryOptionList, PinWriteBody } from '@sk/api-contract'

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
  create: (input: Keyed<{ storeId: string } & PinWriteBody>) => Promise<Pin>
  save: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & PinWriteBody>) => Promise<Pin>
  publish: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & PinPublishBody>) => Promise<Pin>
  hide: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Pin>
  remove: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<void>
  /** The position a Google Maps short link points to; the server follows it. A refusal is `maps-link-unreadable`. */
  resolveMapsLink: (input: { storeId: string, url: string }) => Promise<MapsLinkPosition>
  /** The address of the building nearest to a position, from the Swiss building register. 404 `address-not-found` when none stands near, 503 `address-lookup-unavailable` when the register does not answer. */
  addressAt: (input: { storeId: string, latitude: number, longitude: number }) => Promise<Address>
}
