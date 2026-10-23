import type { Me } from '@sk/api-contract'

/**
 * The store a screen works on: the Owner entry of `GET /api/me` `stores`, else the first entry. Phase 1 has one
 * store per person, so this picks no one over another. A02 (Owner only) and Settings both use it, so they
 * cannot disagree about which store the person is in.
 */
export function currentStore(me: Me | undefined): Me['stores'][number] | undefined {
  return me?.stores.find(entry => entry.role === 'owner') ?? me?.stores[0]
}
