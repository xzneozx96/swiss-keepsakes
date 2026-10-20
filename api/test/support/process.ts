import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterEach } from 'vitest'

// Runs the real entry point (src/main.ts) in a child process, the way `pnpm dev` and production start it.
const apiDir = fileURLToPath(new URL('../..', import.meta.url))

export interface LogLine { msg: string, level: number, address?: string, port?: number, role?: string, worker?: boolean, err?: Record<string, unknown> }

const children = new Set<ChildProcess>()

afterEach(() => {
  for (const child of children) child.kill('SIGKILL')
  children.clear()
})

// Better Auth's variables are required, so every child gets placeholders. A test passes its own to override them.
const authEnv = { BETTER_AUTH_URL: 'http://localhost:5173', BETTER_AUTH_SECRET: 'test-only-secret-0123456789-abcdefghij' }

export function startMain(env: Record<string, string>, preload?: string) {
  const args = ['--import', 'tsx', ...(preload ? ['--import', `./test/fixtures/${preload}`] : []), 'src/main.ts']
  const child = spawn(process.execPath, args, { cwd: apiDir, env: { PATH: process.env.PATH ?? '', ...authEnv, ...env } })
  children.add(child)
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    stderr += chunk
  })
  // 'close' fires after stdout and stderr are drained; 'exit' can fire before.
  const exited = once(child, 'close').then(([code]) => code as number | null)
  // Only finished lines: a chunk can end in the middle of one.
  const logs = () => stdout.split('\n').slice(0, -1).map(line => JSON.parse(line) as LogLine)
  const messages = () => logs().map(line => line.msg)
  const find = (msg: string) => logs().find(line => line.msg === msg)

  async function waitFor(msg: string) {
    while (!messages().includes(msg)) {
      if (child.exitCode !== null)
        throw new Error(`exited before "${msg}": ${stderr}`)
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  return { child, exited, logs, messages, find, waitFor, output: () => stdout + stderr }
}
