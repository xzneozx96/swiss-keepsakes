// Integration tests create and drop a database, so by default they only run against this machine.
// CI sets the flag for its throwaway Neon branch. Never set it for production, staging or development.
export const allowRemoteFlag = 'INTEGRATION_ALLOW_REMOTE_DATABASE'

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export function refusedDatabaseTarget(urls: Record<string, string | undefined>, env: Record<string, string | undefined>): string | undefined {
  for (const [name, url] of Object.entries(urls)) {
    if (!url)
      return `${name} is not set. Example: ${name}=postgres://postgres@127.0.0.1:5433/swiss_keepsakes`
    if (env[allowRemoteFlag] !== '1' && !localHosts.has(new URL(url).hostname))
      return `${name} does not point at this machine. Set ${allowRemoteFlag}=1 only for a throwaway database server.`
  }
  return undefined
}
