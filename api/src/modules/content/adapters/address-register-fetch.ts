import type { AddressRegister, RegisteredBuilding } from '../ports.ts'
import { z } from 'zod'

// The federal building and dwelling register (GWR) on geo.admin.ch. The host is fixed here, so no input can make the
// server call another site.
const identifyUrl = 'https://api3.geo.admin.ch/rest/services/api/MapServer/identify'
const layer = 'ch.bfs.gebaeude_wohnungs_register'
const metersPerDegreeLatitude = 111_320
// The service does not sort by distance and stops at `limit`; a window of a few dozen entrances holds them all.
const limit = 50
const windowPixels = 100
const tolerancePixels = 10

const hitSchema = z.object({
  geometry: z.object({ x: z.number(), y: z.number() }),
  attributes: z.object({
    strname: z.array(z.string()).min(1),
    deinr: z.string().nullish(),
    dplz4: z.number().int(),
    dplzname: z.string(),
  }),
})

// `tolerance` is in pixels of the map extent, not in metres, so the extent is made to hold a window of
// `windowPixels` pixels where `tolerancePixels` of them are the radius: every entrance within `radiusMeters` is a hit.
function identifyRequest(latitude: number, longitude: number, radiusMeters: number): URL {
  const radiusLatitude = radiusMeters / metersPerDegreeLatitude
  const radiusLongitude = radiusLatitude / Math.cos(latitude * Math.PI / 180)
  const scale = windowPixels / 2 / tolerancePixels
  const url = new URL(identifyUrl)
  url.search = new URLSearchParams({
    geometryType: 'esriGeometryPoint',
    geometry: `${longitude},${latitude}`,
    sr: '4326',
    layers: `all:${layer}`,
    tolerance: String(tolerancePixels),
    mapExtent: [longitude - radiusLongitude * scale, latitude - radiusLatitude * scale, longitude + radiusLongitude * scale, latitude + radiusLatitude * scale].join(','),
    imageDisplay: `${windowPixels},${windowPixels},96`,
    returnGeometry: 'true',
    limit: String(limit),
  }).toString()
  return url
}

function toBuilding(hit: unknown): RegisteredBuilding | undefined {
  const parsed = hitSchema.safeParse(hit)
  if (!parsed.success)
    return undefined
  const { geometry, attributes } = parsed.data
  const street = attributes.strname[0]!.trim()
  if (street === '')
    return undefined
  return { street, houseNumber: attributes.deinr?.trim() ?? '', postcode: String(attributes.dplz4), city: attributes.dplzname.trim(), latitude: geometry.y, longitude: geometry.x }
}

// One identify request. `redirect: 'manual'` makes a 3xx a failure, like any other status that is not 200. Any failure,
// a timeout or a body that is not the answer of the service included, is undefined; an entrance with no street name is skipped.
export function createAddressRegister(fetchImpl: typeof fetch = fetch): AddressRegister {
  return {
    async buildingsNear(latitude, longitude, radiusMeters, timeoutMs) {
      try {
        const response = await fetchImpl(identifyRequest(latitude, longitude, radiusMeters), { redirect: 'manual', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
        if (response.status !== 200) {
          void response.body?.cancel()
          return undefined
        }
        const body = z.object({ results: z.array(z.unknown()) }).safeParse(await response.json())
        return body.success ? body.data.results.flatMap(hit => toBuilding(hit) ?? []) : undefined
      }
      catch {
        return undefined
      }
    },
  }
}
