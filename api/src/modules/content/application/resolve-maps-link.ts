import type { Actor } from '@sk/domain/identity'
import type { Clock, MapsLinks } from '../ports.ts'
import type { Result } from './failure.ts'
import type { MapsPosition } from './maps-link.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'
import { isGoogleMapsHost, parseMapsPosition, parseMapsShortLink } from './maps-link.ts'

export interface ResolveMapsLinkDeps {
  links: MapsLinks
  clock: Clock
  /** One deadline for the whole link, however many redirects it takes. */
  timeoutMs?: number
  maxRedirects?: number
}

const isRedirect = (status: number) => status >= 300 && status < 400

// A hop target is safe to ask only when it is https, has no credentials or port, and sits on a Google Maps host.
const mayFollow = (url: URL) => url.protocol === 'https:' && url.username === '' && url.password === '' && url.port === '' && isGoogleMapsHost(url.hostname)

// Reads the position behind a Google Maps short link, so a merchant can paste a link instead of dragging a pin. It
// follows at most five redirects, one request at a time, and never asks a host that is not Google's, so a link cannot
// make the server call another site (SSRF). A URL is read as soon as it holds a position, which saves the request to
// the final page. Anything that goes wrong is one answer, `maps-link-unreadable`.
export function makeResolveMapsLink({ links, clock, timeoutMs = 3000, maxRedirects = 5 }: ResolveMapsLinkDeps) {
  return async (actor: Actor, storeId: string, text: string): Promise<Result<MapsPosition>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    let current = parseMapsShortLink(text)
    const deadline = clock.now().getTime() + timeoutMs
    for (let redirects = 0; current; redirects++) {
      if (!mayFollow(current))
        break
      const position = parseMapsPosition(current)
      if (position)
        return ok(position)
      const remaining = deadline - clock.now().getTime()
      if (redirects === maxRedirects || remaining <= 0)
        break
      const step = await links.step(current, remaining)
      if (!step || !isRedirect(step.status) || !step.location)
        break
      current = URL.parse(step.location, current.href) ?? undefined
    }
    return fail({ reason: 'maps-link-unreadable' })
  }
}
