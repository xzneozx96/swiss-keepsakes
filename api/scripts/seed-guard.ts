// The host guard of db:seed. A URL is local when its host is a loopback name and no query parameter can point
// the driver somewhere else: pg honours `host`, `hostaddr` and `service` in the query string over the URL's host.
const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const overrides = ['host', 'hostaddr', 'service']

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return localHosts.has(parsed.hostname) && overrides.every(name => !parsed.searchParams.has(name))
  }
  catch {
    return false
  }
}
