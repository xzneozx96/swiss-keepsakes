import type { MapsPosition } from './maps-link.ts'
import type { ResolveMapsLinkDeps } from './resolve-maps-link.ts'
import { parseMapsLink } from './maps-link.ts'
import { followMapsLink } from './resolve-maps-link.ts'

// The position of a stored Google Maps link, for another module that keeps such a link (the catalog's pickup points, gate
// G-S8-PICKUP-MAPS). A full link is read as it is; a short one is followed like the place lookup follows it, through
// Google hosts only. It takes no actor: the module that calls it has already checked who may write. Undefined when the
// text is no Google Maps link or holds no position.
export function makeReadMapsPosition(deps: ResolveMapsLinkDeps) {
  return (text: string): Promise<MapsPosition | undefined> => followMapsLink(parseMapsLink(text), deps)
}
