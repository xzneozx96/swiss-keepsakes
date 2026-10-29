import type { FullConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { INBOX_PORT } from './api-server'
import { listenerCwd, readInboxRoot, reuseProblems } from './reuse'

const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '')

/**
 * Registered by playwright.config.ts only when E2E_REUSE=1. Refuses to run when a server the config
 * would reuse belongs to another worktree. A server that is not running never gets here: its web server
 * command is reuse-refuse.mjs, which stops the run first.
 */
export default async function globalSetup(config: FullConfig) {
  const ports = (config.webServer === null ? [] : [config.webServer].flat())
    .map(server => Number(new URL(server.url ?? '').port))
  const spa = ports.filter(port => port !== INBOX_PORT)
  const problems = await reuseProblems({
    root,
    ports: spa.map(port => ({ name: 'dev server', port })),
    inboxRoot: async () => ports.includes(INBOX_PORT) ? readInboxRoot(INBOX_PORT) : root,
    portCwd: listenerCwd,
  })

  if (problems.length)
    throw new Error(`E2E_REUSE=1 refused to run:\n- ${problems.join('\n- ')}`)
}
