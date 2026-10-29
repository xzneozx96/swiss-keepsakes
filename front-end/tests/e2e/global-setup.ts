import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { INBOX_PORT, SPA_PORT } from './api-server'
import { listenerCwd, readInboxRoot, reuseProblems, wantsDemo } from './reuse'

const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '')

/**
 * Registered by playwright.config.ts only when E2E_REUSE=1. Refuses to run when a server the config
 * reuses belongs to another worktree. A server that is not running never gets here: its web server
 * command is reuse-refuse.mjs, which stops the run first. It checks the servers the config lists:
 * the demo dev server (when wantsDemo), and with the Neon variables the e2e API and the API-mode dev server.
 */
export default async function globalSetup() {
  const withApi = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED)
  const ports = [
    ...(wantsDemo(process.env, process.argv) ? [{ name: 'demo dev server', port: Number(process.env.E2E_PORT ?? 5391) }] : []),
    ...(withApi ? [{ name: 'API-mode dev server', port: SPA_PORT }] : []),
  ]
  const problems = await reuseProblems({
    root,
    ports,
    inboxRoot: async () => withApi ? readInboxRoot(INBOX_PORT) : root,
    portCwd: listenerCwd,
  })

  if (problems.length)
    throw new Error(`E2E_REUSE=1 refused to run:\n- ${problems.join('\n- ')}`)
}
