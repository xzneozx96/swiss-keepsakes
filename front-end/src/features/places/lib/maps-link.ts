/** What a pasted Google Maps link holds: a position the browser can read, a short link only the server can follow, or nothing. */
export type MapsLink
  = | { kind: 'position', latitude: number, longitude: number }
    | { kind: 'short', url: string }
    | { kind: 'unreadable' }

const NUMBER = '-?\\d{1,3}(?:\\.\\d+)?'
// `!3d<lat>!4d<lng>` is the place's own position in the long link; `@<lat>,<lng>` is only where the map was centred.
const PLACE = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`)
const CENTRE = new RegExp(`@(${NUMBER}),(${NUMBER})`)
const PAIR = new RegExp(`^(${NUMBER})\\s*,\\s*(${NUMBER})$`)
const POSITION_PARAMS = ['q', 'query', 'll', 'center'] as const
const SCHEME = /^[a-z][a-z\d+.-]*:\/\//i
// google.com, google.ch, google.co.uk, google.com.au: never google.<anything>.<elsewhere>.
const GOOGLE_HOST = /^(?:[a-z\d-]+\.)*google\.(?:com?(?:\.[a-z]{2})?|[a-z]{2})$/i

function position(lat: string, lng: string): MapsLink {
  const latitude = Number.parseFloat(lat)
  const longitude = Number.parseFloat(lng)

  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { kind: 'position', latitude: Number(latitude.toFixed(5)), longitude: Number(longitude.toFixed(5)) }
    : { kind: 'unreadable' }
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text)
  }
  catch {
    return text
  }
}

/**
 * Reads a Google Maps link. Long links carry the position: the place's own `!3d<lat>!4d<lng>` first, else the
 * `@<lat>,<lng>` the map is centred on, else a `q`, `query`, `ll` or `center` parameter that is a lat,lng pair. The
 * short links (`maps.app.goo.gl/…`, `goo.gl/maps/…`) hold nothing and come back as `short`, for the API to follow.
 * Any other text, any other host and any position outside the globe is `unreadable`.
 */
export function parseMapsLink(input: string): MapsLink {
  const text = input.trim()
  let url: URL

  try {
    url = new URL(SCHEME.test(text) ? text : `https://${text}`)
  }
  catch {
    return { kind: 'unreadable' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    return { kind: 'unreadable' }
  const host = url.hostname.toLowerCase()

  if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps/')))
    return url.pathname.length > 1 ? { kind: 'short', url: url.toString() } : { kind: 'unreadable' }
  if (!GOOGLE_HOST.test(host) || !(host.startsWith('maps.') || url.pathname.startsWith('/maps')))
    return { kind: 'unreadable' }

  const whole = decoded(`${url.pathname}${url.search}`)
  const place = PLACE.exec(whole) ?? PLACE.exec(decoded(url.hash))
  const centre = CENTRE.exec(whole)

  if (place)
    return position(place[1]!, place[2]!)
  if (centre)
    return position(centre[1]!, centre[2]!)
  for (const name of POSITION_PARAMS) {
    const pair = PAIR.exec((url.searchParams.get(name) ?? '').trim())

    if (pair)
      return position(pair[1]!, pair[2]!)
  }

  return { kind: 'unreadable' }
}

// The hosts the API accepts for a stored link (the same rule as `pinWriteBodySchema.mapsLink`): narrower than what
// `parseMapsLink` can read, so a link the field stores never makes the save fail.
const STORED_HOST = /^(?:(?:www|maps)\.)?google\.(?:com?\.)?[a-z]{2,3}$/i
const MAPS_PATH = /^\/maps(?:\/|$)/

/**
 * The link as it is stored with the place: https, a Google Maps address, at most 2000 characters. `http` and a link typed
 * without a scheme become https. Empty when the text is no such link, so the place keeps no link rather than a refused one.
 */
export function storableLink(input: string): string {
  const text = input.trim()
  let url: URL

  try {
    url = new URL(SCHEME.test(text) ? text : `https://${text}`)
  }
  catch {
    return ''
  }
  if (url.protocol === 'http:')
    url.protocol = 'https:'
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '')
    return ''
  const host = url.hostname.toLowerCase()
  const known = host === 'maps.app.goo.gl' ? url.pathname.length > 1 : (host === 'goo.gl' || STORED_HOST.test(host)) && MAPS_PATH.test(url.pathname)
  const link = url.toString()

  return known && link.length <= 2000 ? link : ''
}
