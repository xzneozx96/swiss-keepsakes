import { Client } from 'pg'

// Integration tests create and drop a database, so by default they only run against this machine.
// The flag is for a throwaway server, or for the Neon `development` branch, where the harness creates its own
// sk_test_* database, migrates it and drops it, so it never writes to the branch's own database. CI sets it for its
// throwaway Neon branch. Never set it with the URLs of the `production` or `staging` branch.
export const allowRemoteFlag = 'INTEGRATION_ALLOW_REMOTE_DATABASE'

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function refusedDatabaseTarget(urls: Record<string, string | undefined>, env: Record<string, string | undefined>): string | undefined {
  for (const [name, url] of Object.entries(urls)) {
    if (!url)
      return `${name} is not set. Example: ${name}=postgres://postgres@127.0.0.1:5433/swiss_keepsakes`
    if (env[allowRemoteFlag] === '1')
      continue
    // pg lets query parameters replace the host in the URL, so refuse them, and ask pg which host it would use.
    const { searchParams } = new URL(url)
    if (searchParams.has('host') || searchParams.has('hostaddr'))
      return `${name} sets the host in a query parameter. Put it in the URL instead.`
    if (!localHosts.has(new Client({ connectionString: url }).host))
      return `${name} does not point at this machine. Set ${allowRemoteFlag}=1 only for a throwaway server or the Neon development branch.`
  }
  return undefined
}
