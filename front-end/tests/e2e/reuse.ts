import { execFile } from 'node:child_process'
import { readlink } from 'node:fs/promises'
import { promisify } from 'node:util'

// E2E_REUSE=1 runs the Playwright specs against servers started earlier by `pnpm e2e:servers`
// (front-end/scripts/e2e-servers.mjs). This file holds the guard that keeps such a run from testing
// another worktree's code. See docs/development-rules/shared/testing.md.

const run = promisify(execFile)
const listenerPid = /pid=(\d+)/g

export interface ReuseCheck {
  /** The worktree root this run belongs to. */
  root: string
  /** The dev servers that must run from this root, each named in full, e.g. `demo dev server` (5391) and `API-mode dev server` (5392). */
  ports: Array<{ name: string, port: number }>
  /** The root the e2e API reports on its inbox `/ready`, or undefined when it does not answer. */
  inboxRoot: () => Promise<string | undefined>
  /** The working directory of the process listening on a port, or undefined when nothing listens. */
  portCwd: (port: number) => Promise<string | undefined>
}

/** Whether a run starts (or, with E2E_REUSE=1, reuses) the demo dev server. playwright.config.ts and global-setup.ts both ask. */
export function wantsDemo(env: Record<string, string | undefined>, argv: string[]): boolean {
  const projects = argv.flatMap((arg, index) =>
    arg.startsWith('--project=') ? [arg.slice('--project='.length)] : arg === '--project' && argv[index + 1] ? [argv[index + 1]] : [])
  const apiOnly = projects.length > 0 && projects.every(name => name === 'api-chromium-en')

  return env.E2E_DEMO !== '0' && !(env.E2E_REUSE === '1' && apiOnly)
}

/** Whether a run includes the api project and its servers. A reuse run needs no Neon URLs: the reused servers already hold them. */
export function wantsApi(env: Record<string, string | undefined>): boolean {
  return env.E2E_REUSE === '1' || Boolean(env.DATABASE_URL && env.DATABASE_URL_UNPOOLED)
}

const start = 'Start them in this worktree with `pnpm e2e:servers` (in front-end/), or run without E2E_REUSE=1.'

/** Both dev servers start in `<root>/front-end` (e2e-servers.mjs and playwright.config.ts), so the match is exact: a prefix test would accept a worktree nested under this root (.worktrees/*). */
function startsFrom(cwd: string, root: string) {
  return cwd === `${root}/front-end`
}

/** The reasons a reuse run must not go ahead. An empty list means every server belongs to this worktree. */
export async function reuseProblems({ root, ports, inboxRoot, portCwd }: ReuseCheck): Promise<string[]> {
  const problems: string[] = []
  const api = await inboxRoot()

  if (api === undefined)
    problems.push(`The e2e API is not running (its inbox does not answer). ${start}`)
  else if (api !== root)
    problems.push(`The e2e API runs from another worktree: ${api}. This run is in ${root}. Stop that one and ${start.charAt(0).toLowerCase()}${start.slice(1)}`)

  for (const { name, port } of ports) {
    const cwd = await portCwd(port)

    if (cwd === undefined)
      problems.push(`The ${name} is not running on port ${port}. ${start}`)
    else if (!startsFrom(cwd, root))
      problems.push(`The ${name} on port ${port} runs from ${cwd}, not from ${root}. Stop it and ${start.charAt(0).toLowerCase()}${start.slice(1)}`)
  }

  return problems
}

/** The e2e API's root, from `/ready`. */
export async function readInboxRoot(inboxPort: number): Promise<string | undefined> {
  try {
    const response = await fetch(`http://127.0.0.1:${inboxPort}/ready`, { signal: AbortSignal.timeout(3000) })
    const body = await response.json() as { root?: string }

    return body.root ?? ''
  }
  catch {
    return undefined
  }
}

/** Every distinct pid in `ss -ltnpH` output: a dual-stack bind lists one socket per address family. */
export function listenerPids(stdout: string): string[] {
  return [...new Set(Array.from(stdout.matchAll(listenerPid), match => match[1]))]
}

/**
 * The working directory of the processes listening on a TCP port, through `ss` and /proc (Linux).
 * Undefined when nothing listens. When the listeners differ, one that is not this worktree's still shows (the first of them).
 */
export async function listenerCwd(port: number, expected?: string): Promise<string | undefined> {
  try {
    const { stdout } = await run('ss', ['-ltnpH', `sport = :${port}`])
    const cwds = await Promise.all(listenerPids(stdout).map(pid => readlink(`/proc/${pid}/cwd`)))

    return cwds.find(cwd => cwd !== expected) ?? cwds[0]
  }
  catch {
    return undefined
  }
}
