import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const apiDir = fileURLToPath(new URL('../../api/', import.meta.url))

export const PROTECTED_BRANCHES = ['production', 'staging', 'main']

export function readProjectId(): string | null {
  if (process.env.NEON_PROJECT_ID?.trim()) return process.env.NEON_PROJECT_ID.trim()
  const candidates = [`${apiDir}.neon`]
  const envLocal = `${apiDir}.env.local`
  if (existsSync(envLocal)) candidates.push(`${realpathSync(envLocal).replace(/[^/]+$/, '')}.neon`)
  for (const file of candidates) {
    if (!existsSync(file)) continue
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as { projectId?: string }
      if (parsed.projectId) return parsed.projectId
    } catch {
      // unreadable .neon: try the next candidate
    }
  }
  return null
}

export function neon(args: string[]): { ok: boolean; stdout: string } {
  const res = spawnSync('neon', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return { ok: res.status === 0, stdout: res.stdout ?? '' }
}

export interface ThrowawayBranch {
  name: string
  unpooledUrl: string
  pooledUrl: string
  remove: () => void
}

export function createThrowawayBranch(spike: string): { branch: ThrowawayBranch } | { skip: string } {
  const parent = process.env.NEON_BRANCH?.trim()
  if (!parent) return { skip: 'NEON_BRANCH is not set' }
  if (PROTECTED_BRANCHES.includes(parent)) return { skip: `NEON_BRANCH is ${parent}: refusing to branch from or touch it` }
  const projectId = readProjectId()
  if (!projectId) return { skip: 'no Neon project id (NEON_PROJECT_ID or api/.neon)' }
  const name = `spike-${spike.toLowerCase()}-${Date.now().toString(36)}`
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z')
  const created = neon(['branches', 'create', '--project-id', projectId, '--name', name, '--parent', parent, '--expires-at', expires, '--output', 'json'])
  const remove = () => {
    neon(['branches', 'delete', name, '--project-id', projectId])
  }
  if (!created.ok) {
    remove()
    return { skip: 'neon branches create failed' }
  }
  try {
    const parsed = JSON.parse(created.stdout) as { connection_uris?: { connection_uri: string; connection_parameters: { host: string; pooler_host: string } }[] }
    const conn = parsed.connection_uris?.[0]
    if (!conn) throw new Error('no connection uri')
    return {
      branch: {
        name,
        unpooledUrl: conn.connection_uri,
        pooledUrl: conn.connection_uri.replace(conn.connection_parameters.host, conn.connection_parameters.pooler_host),
        remove,
      },
    }
  } catch {
    remove()
    return { skip: 'could not read the new branch connection string' }
  }
}

export async function withThrowawayBranch<T>(spike: string, fn: (b: ThrowawayBranch) => Promise<T>): Promise<{ skip: string } | { value: T }> {
  const made = createThrowawayBranch(spike)
  if ('skip' in made) return made
  const { branch } = made
  console.log(`obs  throwaway Neon branch ${branch.name} created from ${process.env.NEON_BRANCH}, expires in 24 h`)
  const onSignal = () => {
    branch.remove()
    process.exit(130)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    return { value: await fn(branch) }
  } finally {
    branch.remove()
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    console.log(`obs  throwaway Neon branch ${branch.name} deleted`)
  }
}
