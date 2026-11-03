import type { Actor } from '@sk/domain/identity'
import type { MapsPositions, PickupMap, PickupPlace, PickupPlaceEdit, PickupSpan } from '../ports.ts'
import type { PickupDeps } from './deps.ts'
import type { Result } from './failure.ts'
import type { PickupTextInput } from './pickup-rules.ts'
import { mayEditCatalog, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'
import { checkHours, checkPickupText, PICKUP_MAX_PLACES } from './pickup-rules.ts'

// The merchant's pickup points (E6.6). Every use case needs edit-catalog in the store. A point is archived, never deleted
// (ADR-013: handovers and orders name it by plain id). The rules of the text and the hours are in pickup-rules.ts.

const audited = (place: PickupPlace) => ({ name: place.name, address: place.address, mapsLink: place.mapsLink, latitude: place.latitude, longitude: place.longitude, instructions: place.instructions, position: place.position, archived: place.archived, hours: place.hours, rowVersion: place.rowVersion })

// The link as stored and the pin read from it, or undefined when the link holds none.
async function readMap(maps: MapsPositions, mapsLink: string): Promise<PickupMap | undefined> {
  const link = mapsLink.trim()
  const position = await maps.positionOf(link)
  return position && { mapsLink: link, ...position }
}

export function makeListPickupPlaces<T>({ uow, pickups }: PickupDeps<T>) {
  return async (actor: Actor, storeId: string, archived: boolean): Promise<Result<PickupPlace[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async tx => ok(await pickups.list(tx, storeId, archived)))
  }
}

export function makeGetPickupPlace<T>({ uow, pickups }: PickupDeps<T>) {
  return async (actor: Actor, storeId: string, placeId: string): Promise<Result<PickupPlace>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const place = await pickups.find(tx, storeId, placeId)
      return place ? ok(place) : fail({ reason: 'not-found' })
    })
  }
}

export function makeCreatePickupPlace<T>({ uow, pickups, maps, audit, clock }: PickupDeps<T>) {
  return async (actor: Actor, storeId: string, input: PickupTextInput & { mapsLink: string, hours: PickupSpan[] }, requestId: string | null): Promise<Result<PickupPlace>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    const text = checkPickupText(input)
    const hoursErrors = checkHours(input.hours)
    if ('errors' in text || hoursErrors.length > 0)
      return fail({ reason: 'invalid', errors: [...('errors' in text ? text.errors : []), ...hoursErrors] })
    // Before the transaction: following a short link is a network call, and no transaction waits on it.
    const map = await readMap(maps, input.mapsLink)
    if (!map)
      return fail({ reason: 'maps-link-unreadable' })
    return uow.run(async (tx) => {
      await pickups.lockList(tx, storeId)
      // Only active points count (gate G-S8-PICKUP-LIMIT), so a reorder of the active ones never goes over the limit the order body allows.
      if (await pickups.countActive(tx, storeId) >= PICKUP_MAX_PLACES)
        return fail({ reason: 'too-many' })
      const place = await pickups.insert(tx, storeId, { ...text.value, ...map, hours: input.hours }, clock.now())
      await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'pickup_place', entityId: place.id, action: 'created', after: audited(place), requestId })
      return ok(place)
    })
  }
}

// A left-out field stays. Instructions with no text in either language clear them.
// A new link is read before the transaction and moves the pin; a save without one keeps the link and the pin.
export function makeSavePickupPlace<T>({ uow, pickups, maps, audit, clock }: PickupDeps<T>) {
  return async (actor: Actor, storeId: string, placeId: string, ifMatch: number, changes: PickupPlaceEdit, requestId: string | null): Promise<Result<PickupPlace>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    const { mapsLink, ...rest } = changes
    let map: PickupMap | undefined
    if (mapsLink !== undefined) {
      map = await readMap(maps, mapsLink)
      if (!map)
        return fail({ reason: 'maps-link-unreadable' })
    }
    return uow.run(async (tx) => {
      const place = await pickups.find(tx, storeId, placeId, true)
      if (!place)
        return fail({ reason: 'not-found' })
      if (place.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const text = checkPickupText({
        name: rest.name ?? place.name,
        address: rest.address ?? place.address,
        instructions: (rest.instructions === undefined ? place.instructions : rest.instructions) ?? undefined,
      })
      const hoursErrors = rest.hours ? checkHours(rest.hours) : []
      if ('errors' in text || hoursErrors.length > 0)
        return fail({ reason: 'invalid', errors: [...('errors' in text ? text.errors : []), ...hoursErrors] })
      const saved = await pickups.save(tx, place, { ...text.value, ...(map && { map }), ...(rest.hours && { hours: rest.hours }) }, clock.now())
      await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'pickup_place', entityId: place.id, action: 'updated', before: audited(place), after: audited(saved), requestId })
      return ok(saved)
    })
  }
}

// `ids` must be exactly the active points: same length and same set, so [a, a] never passes for [a, b].
export function makeReorderPickupPlaces<T>({ uow, pickups, audit, clock }: PickupDeps<T>) {
  return async (actor: Actor, storeId: string, ids: string[], requestId: string | null): Promise<Result<PickupPlace[]>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    const wanted = ids.map(id => id.toLowerCase())
    return uow.run(async (tx) => {
      await pickups.lockList(tx, storeId)
      const current = (await pickups.list(tx, storeId, false)).map(place => place.id)
      const set = new Set(wanted)
      if (wanted.length !== current.length || set.size !== current.length || !current.every(id => set.has(id)))
        return fail({ reason: 'order-mismatch' })
      await pickups.setPositions(tx, storeId, wanted, clock.now())
      await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'pickup_place', entityId: storeId, action: 'reordered', before: { ids: current }, after: { ids: wanted }, requestId })
      return ok(await pickups.list(tx, storeId, false))
    })
  }
}

function makeSetArchived<T>({ uow, pickups, audit, clock }: PickupDeps<T>, archived: boolean) {
  return async (actor: Actor, storeId: string, placeId: string, ifMatch: number, requestId: string | null): Promise<Result<PickupPlace>> => {
    if (!mayEditCatalog(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      // The same list lock as create and reorder, taken before the row lock, so a reorder never reads the active set while a point leaves or joins it.
      await pickups.lockList(tx, storeId)
      const place = await pickups.find(tx, storeId, placeId, true)
      if (!place)
        return fail({ reason: 'not-found' })
      if (place.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      // Already in the state asked for: nothing to write, so the row version stays.
      if (place.archived === archived)
        return ok(place)
      if (!archived && await pickups.countActive(tx, storeId) >= PICKUP_MAX_PLACES)
        return fail({ reason: 'too-many' })
      const saved = await pickups.setArchived(tx, place, archived, clock.now())
      await audit.record(tx, { storeId, actor: staffActor(actor), entity: 'pickup_place', entityId: place.id, action: archived ? 'archived' : 'restored', before: audited(place), after: audited(saved), requestId })
      return ok(saved)
    })
  }
}

export const makeArchivePickupPlace = <T>(deps: PickupDeps<T>) => makeSetArchived(deps, true)
export const makeRestorePickupPlace = <T>(deps: PickupDeps<T>) => makeSetArchived(deps, false)
