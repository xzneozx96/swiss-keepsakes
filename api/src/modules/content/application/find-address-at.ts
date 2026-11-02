import type { Actor } from '@sk/domain/identity'
import type { AddressRegister, FoundAddress, RegisteredBuilding } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

export interface FindAddressAtDeps {
  register: AddressRegister
  timeoutMs?: number
  radiusMeters?: number
}

const earthRadiusMeters = 6_371_000
const toRadians = (degrees: number) => degrees * Math.PI / 180

function distanceMeters(from: { latitude: number, longitude: number }, to: { latitude: number, longitude: number }): number {
  const dLat = toRadians(to.latitude - from.latitude)
  const dLng = toRadians(to.longitude - from.longitude)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a))
}

function toAddress({ street, houseNumber, postcode, city }: RegisteredBuilding): FoundAddress {
  const line = [street, houseNumber].filter(part => part !== '').join(' ')
  const place = [postcode, city].filter(part => part !== '').join(' ')
  return { street, houseNumber, postcode, city, formatted: [line, place].filter(part => part !== '').join(', ') }
}

// The address of the building nearest to a pin, so the Address field of a place can fill itself. The register does not
// sort by distance, so the use case measures each entrance and keeps the nearest one inside the radius. A viewpoint or
// a bench has none (`address-not-found`, never retried: it is an answer). A register that cannot be read is asked once
// more, each ask with its own `timeoutMs`, because the service is slow now and then (the owner's call, 2026-11-02);
// if the second ask fails too, it is `address-lookup-unavailable`.
export function makeFindAddressAt({ register, timeoutMs = 3000, radiusMeters = 50 }: FindAddressAtDeps) {
  return async (actor: Actor, storeId: string, position: { latitude: number, longitude: number }): Promise<Result<FoundAddress>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const buildings = await register.buildingsNear(position.latitude, position.longitude, radiusMeters, timeoutMs)
      ?? await register.buildingsNear(position.latitude, position.longitude, radiusMeters, timeoutMs)
    if (!buildings)
      return fail({ reason: 'address-lookup-unavailable' })
    let nearest: { building: RegisteredBuilding, distance: number } | undefined
    for (const building of buildings) {
      const distance = distanceMeters(position, building)
      if (distance <= radiusMeters && (!nearest || distance < nearest.distance))
        nearest = { building, distance }
    }
    return nearest ? ok(toAddress(nearest.building)) : fail({ reason: 'address-not-found' })
  }
}
