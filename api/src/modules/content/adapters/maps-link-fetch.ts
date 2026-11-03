import type { MapsLinks } from '../ports.ts'

// One request to a short link's next hop. `redirect: 'manual'` makes fetch hand back the 3xx itself, so the use case
// decides whether the next host may be asked, and a HEAD request reads no body. Any failure, a timeout included, is undefined.
export function createMapsLinks(fetchImpl: typeof fetch = fetch): MapsLinks {
  return {
    async step(url, timeoutMs) {
      try {
        const response = await fetchImpl(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) })
        void response.body?.cancel()
        return { status: response.status, location: response.headers.get('location') }
      }
      catch {
        return undefined
      }
    },
  }
}
