export interface MapsPosition { latitude: number, longitude: number }

// Google serves its maps on google.com and on one google.<cc> domain per country (google.ch, google.co.uk, google.com.au).
const goPath = /^\/maps(?:\/|$)/
const googleHost = /^(?:(?:www|maps)\.)?google\.(?:com?\.)?[a-z]{2,3}$/

/** A host a Google Maps short link may redirect through: Google's own maps hosts and the goo.gl short-link hosts. */
export function isGoogleMapsHost(host: string): boolean {
  const name = host.toLowerCase()
  return name === 'maps.app.goo.gl' || name === 'goo.gl' || googleHost.test(name)
}

/**
 * A short link a merchant may paste: https, no credentials or port, on maps.app.goo.gl (any path) or goo.gl (a path
 * that starts /maps). Anything else is undefined.
 */
export function parseMapsShortLink(text: string): URL | undefined {
  let url: URL
  try {
    url = new URL(text.trim())
  }
  catch {
    return undefined
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '')
    return undefined
  if (url.hostname === 'maps.app.goo.gl' && url.pathname.length > 1)
    return url
  if (url.hostname === 'goo.gl' && goPath.test(url.pathname))
    return url
  return undefined
}

function position(latitude: string | undefined, longitude: string | undefined): MapsPosition | undefined {
  if (latitude === undefined || longitude === undefined)
    return undefined
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return undefined
  return { latitude: lat, longitude: lng }
}

const number = '(-?\\d+(?:\\.\\d+)?)'
const placeData = new RegExp(`!3d${number}!4d${number}`)
const viewport = new RegExp(`@${number},${number}`)
const pair = new RegExp(`^\\s*${number}\\s*,\\s*${number}\\s*$`)

function decoded(text: string): string {
  try {
    return decodeURIComponent(text)
  }
  catch {
    return text
  }
}

/**
 * The position in a full Google Maps URL. The pin of a place (`!3d<lat>!4d<lng>`) wins over the map centre
 * (`@<lat>,<lng>`), which wins over the `q`, `query` and `ll` parameters when they hold a coordinate pair.
 */
export function parseMapsPosition(url: URL): MapsPosition | undefined {
  const path = decoded(url.pathname + url.search)
  const place = placeData.exec(path)
  if (place)
    return position(place[1], place[2])
  const view = viewport.exec(path)
  if (view)
    return position(view[1], view[2])
  for (const key of ['q', 'query', 'll']) {
    const match = pair.exec(url.searchParams.get(key) ?? '')
    if (match)
      return position(match[1], match[2])
  }
  return undefined
}
