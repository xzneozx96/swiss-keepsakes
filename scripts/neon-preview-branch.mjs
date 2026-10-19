// The pull request's Neon branch in CI (E1.13). Every call works on `preview/pr-<number>` only, so the
// long-lived production, staging and development branches are never read for credentials or deleted.
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs connect   masks the branch's URLs and exports them to $GITHUB_ENV
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs delete    deletes the branch; a branch that is gone is fine
// Both read NEON_API_KEY and NEON_PROJECT_ID. neondatabase/create-branch-action creates the branch.
import { appendFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const apiBase = 'https://console.neon.tech/api/v2'

export function previewBranchName(prNumber) {
  if (!/^[1-9]\d*$/.test(String(prNumber)))
    throw new Error(`Not a pull request number: "${prNumber}"`)
  return `preview/pr-${prNumber}`
}

export function neonApi({ apiKey, projectId, fetch = globalThis.fetch, retryDelayMs = 2000 }) {
  return async (method, path, query = {}) => {
    const url = new URL(`${apiBase}/projects/${encodeURIComponent(projectId)}${path}`)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } })
      // Neon answers 423 or 503 while another operation runs on the branch, and both are safe to retry.
      if ((response.status === 423 || response.status === 503) && attempt < 5) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
        continue
      }
      if (!response.ok)
        throw new Error(`Neon API ${method} ${url.pathname}: ${response.status} ${(await response.text()).slice(0, 200)}`)
      return response.json()
    }
  }
}

// Neon's search matches part of a name: `preview/pr-1` also finds `preview/pr-12`.
async function findBranch(api, name) {
  const { branches } = await api('GET', '/branches', { search: name })
  return branches.find(branch => branch.name === name)
}

export async function connect(api, prNumber, { mask, exportVariable }) {
  const name = previewBranchName(prNumber)
  const branch = await findBranch(api, name)
  if (!branch)
    throw new Error(`${name} does not exist`)
  const uri = async pooled => (await api('GET', '/connection_uri', { branch_id: branch.id, database_name: 'neondb', role_name: 'neondb_owner', pooled })).uri
  const direct = await uri(false)
  const pooled = await uri(true)
  // The password on its own as well: the integration setup builds URLs for its own database, which a mask
  // of the whole URL would miss. The repository is public, and a branch inherits its parent's password.
  const { password } = new URL(direct)
  for (const secret of new Set([password, decodeURIComponent(password), direct, pooled])) mask(secret)
  exportVariable('DATABASE_URL', pooled)
  exportVariable('DATABASE_URL_UNPOOLED', direct)
  return { name, id: branch.id }
}

export async function deletePreviewBranch(api, prNumber) {
  const name = previewBranchName(prNumber)
  const branch = await findBranch(api, name)
  if (!branch)
    return { name, deleted: false }
  if (branch.default || branch.protected)
    throw new Error(`Refusing to delete ${name}: it is the default or a protected branch`)
  await api('DELETE', `/branches/${branch.id}`)
  return { name, id: branch.id, deleted: true }
}

async function main([command], env) {
  const api = neonApi({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID })
  if (command === 'connect') {
    const { name, id } = await connect(api, env.PR_NUMBER, {
      mask: value => process.stdout.write(`::add-mask::${value}\n`),
      exportVariable: (key, value) => appendFileSync(env.GITHUB_ENV, `${key}=${value}\n`),
    })
    console.log(`DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED point at ${name} (${id})`)
  }
  else if (command === 'delete') {
    const { name, id, deleted } = await deletePreviewBranch(api, env.PR_NUMBER)
    console.log(deleted ? `Deleted ${name} (${id})` : `${name} does not exist, nothing to delete`)
  }
  else {
    throw new Error('Usage: node scripts/neon-preview-branch.mjs connect|delete')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).catch((error) => {
    console.error(`::error::${error.message}`)
    process.exitCode = 1
  })
}
