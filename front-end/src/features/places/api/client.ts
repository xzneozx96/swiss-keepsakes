import type { Address, MapsLinkPosition, Pin, PinList, PinLookup, PinPublishBody, PinStoryOptionList, PinWriteBody, StoryVersionText } from '@sk/api-contract'

/** What one page of the pins table is asked for (ADR-033). The filter groups are comma separated lists. */
export interface PinListQuery {
  status?: string | undefined
  category?: string | undefined
  stay?: string | undefined
  type?: string | undefined
  q?: string | undefined
  page: number
  pageSize: number
}

/** What the story picker asks: the search, the story already chosen (always answered) and how many matches. */
export interface StoryOptionsQuery {
  q?: string | undefined
  groupId?: string | undefined
  limit?: number | undefined
}

/** A command carries the `Idempotency-Key` of the user's intent (`useIdempotencyKey`), so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's places (pins, E4.2). There is no demo implementation: every call goes to the API, and a refusal
 * arrives as an `ApiProblem`. `ifMatch` is the `rowVersion` of the pin as it was opened.
 */
export interface PlacesClient {
  /** One page of the pins, with the total and the facet counts. */
  list: (input: { storeId: string, query: PinListQuery }) => Promise<PinList>
  get: (input: { storeId: string, id: string }) => Promise<Pin>
  /** The pins named by `ids` (at most 50) and, with `host`, the published pins linking to that host. Not paged. */
  lookup: (input: { storeId: string, ids: string[], host?: string | undefined }) => Promise<PinLookup>
  /** The first matches of the story picker's search, and the chosen story. Not paged. */
  storyOptions: (input: { storeId: string, query: StoryOptionsQuery }) => Promise<PinStoryOptionList>
  /** The text of one language version of a story as the editor last left it (the draft, else the published text). 404 when the story has no version in that language. */
  storyVersion: (input: { storeId: string, groupId: string, language: 'en' | 'de' }) => Promise<StoryVersionText>
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
