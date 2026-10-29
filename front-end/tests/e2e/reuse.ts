import { execFile } from 'node:child_process'
import { readlink } from 'node:fs/promises'
import { promisify } from 'node:util'

// E2E_REUSE=1 runs the Playwright specs against servers started earlier by `pnpm e2e:servers`
// (front-end/scripts/e2e-servers.mjs). This file holds the guard that keeps such a run from testing
// another worktree's code. See docs/development-rules/shared/testing.md.

const run = promisify(execFile)
const listenerPid = /pid=(\d+)/

export interface ReuseCheck {
  /** The worktree root this run belongs to. */
  root: string
  /** The dev servers that must run from this root, e.g. `demo` (5391) and `SPA` (5392). */
  ports: Array<{ name: string, port: number }>
  /** The root the e2e API reports on its inbox `/ready`, or undefined when it does not answer. */
  inboxRoot: () => Promise<string | undefined>
  /** The working directory of the process listening on a port, or undefined when nothing listens. */
  portCwd: (port: number) => Promise<string | undefined>
}

const start = 'Start them in this worktree with `pnpm e2e:servers` (in front-end/), or run without E2E_REUSE=1.'

function inside(path: string, root: string) {
  return path === root || path.startsWith(`${root}/`)
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
      problems.push(`The ${name} dev server is not running on port ${port}. ${start}`)
    else if (!inside(cwd, root))
      problems.push(`The ${name} dev server on port ${port} runs from ${cwd}, not from ${root}. Stop it and ${start.charAt(0).toLowerCase()}${start.slice(1)}`)
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

/** The working directory of the process listening on a TCP port, through `ss` and /proc (Linux). */
export async function listenerCwd(port: number): Promise<string | undefined> {
  try {
    const { stdout } = await run('ss', ['-ltnpH', `sport = :${port}`])
    const pid = listenerPid.exec(stdout)?.[1]

    return pid ? await readlink(`/proc/${pid}/cwd`) : undefined
  }
  catch {
    return undefined
  }
}
