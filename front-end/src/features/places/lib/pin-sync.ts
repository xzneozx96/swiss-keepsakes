export interface LatLng { lat: number, lng: number }

/** Closer than this (metres) two positions count as the same spot: a link read, rounded and read again lands within it. */
export const SAME_SPOT_METRES = 15

const EARTH_RADIUS_METRES = 6_371_000

/** The distance between two positions in metres (haversine; exact enough for tens of metres). */
export function distanceMetres(a: LatLng, b: LatLng): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Is the pin somewhere else than `at`? A missing `at` or pin is never "moved": there is nothing to compare. */
export function movedAway(at: LatLng | null, pin: LatLng | null): boolean {
  return at !== null && pin !== null && distanceMetres(at, pin) > SAME_SPOT_METRES
}

/** A link to the pin that the link field reads back (`parseMapsLink` takes a `q=<lat>,<lng>` pair). */
export function linkToPin({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps?q=${Number(lat.toFixed(5))},${Number(lng.toFixed(5))}`
}

/**
 * Does a typed address possibly describe another place than the pin? `typedAt` is where the pin was when the address was
 * last typed (null: there was no pin). With a pin and no such spot, or a pin that has left it, the address may not match.
 */
export function addressMayNotMatch(typedAt: LatLng | null, pin: LatLng | null): boolean {
  return pin !== null && (typedAt === null || movedAway(typedAt, pin))
}
