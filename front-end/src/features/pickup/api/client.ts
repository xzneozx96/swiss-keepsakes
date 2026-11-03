import type { PickupPlace, PickupPlaceList, PickupPlacePatchBody, PickupPlaceWriteBody } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent (`useIdempotencyKey`), so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/** The row version of the point the merchant opened, sent as `If-Match`. */
interface Versioned { storeId: string, id: string, ifMatch: number }

/**
 * The merchant's pickup points (E6.6). There is no demo implementation: every call goes to the API, and a refusal
 * arrives as an `ApiProblem` (a stale save is `precondition-failed`). The demo store keeps its own pickup places for checkout.
 */
export interface PickupClient {
  /** The active points by position, or the archived ones. */
  list: (input: { storeId: string, archived: boolean }) => Promise<PickupPlaceList>
  create: (input: Keyed<{ storeId: string } & PickupPlaceWriteBody>) => Promise<PickupPlace>
  /** Fields left out stay as they are; `hours`, when given, replaces the whole set. */
  save: (input: Keyed<Versioned & PickupPlacePatchBody>) => Promise<PickupPlace>
  archive: (input: Keyed<Versioned>) => Promise<PickupPlace>
  restore: (input: Keyed<Versioned>) => Promise<PickupPlace>
}
