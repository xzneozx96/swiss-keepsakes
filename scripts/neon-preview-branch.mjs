// The pull request's Neon branch in CI (E1.13). Every call works on `preview/pr-<number>` only, so the
// long-lived production, staging and development branches are never changed, deleted or read for credentials.
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs create    creates the branch from development, or reuses it
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs connect   masks the branch's URLs and exports them to $GITHUB_ENV
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs delete    deletes the branch; a branch that is gone is fine
// All three read NEON_API_KEY and NEON_PROJECT_ID. neondatabase/create-branch-action is not used: it writes the
// password and URLs as unmasked step outputs, which the runner prints in debug logs, and this repository is public.
import { appendFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const apiBase = 'https://console.neon.tech/api/v2'
const parentName = 'development'
// A fallback: Neon deletes the branch after a week if the closed event never deletes it.
const expiryMs = 7 * 24 * 60 * 60 * 1000

export function previewBranchName(prNumber) {
  if (!/^[1-9]\d*$/.test(String(prNumber)))
    throw new Error(`Not a pull request number: "${prNumber}"`)
  return `preview/pr-${prNumber}`
}

export function neonApi({ apiKey, projectId, fetch = globalThis.fetch, retryDelayMs = 2000 }) {
  return async (method, path, query = {}, body = undefined) => {
    const url = new URL(`${apiBase}/projects/${encodeURIComponent(projectId)}${path}`)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) }
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, { method, headers, body: body && JSON.stringify(body) })
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

// The response also holds connection URIs with the password, so it is never logged.
export async function createPreviewBranch(api, prNumber, now = new Date()) {
  const name = previewBranchName(prNumber)
  const existing = await findBranch(api, name)
  if (existing)
    return { name, id: existing.id, created: false }
  const parent = await findBranch(api, parentName)
  if (!parent)
    throw new Error(`The parent branch ${parentName} does not exist`)
  const expiresAt = new Date(now.getTime() + expiryMs).toISOString().replace(/\.\d+Z$/, 'Z')
  const { branch } = await api('POST', '/branches', {}, {
    branch: { name, parent_id: parent.id, expires_at: expiresAt },
    endpoints: [{ type: 'read_write' }],
  })
  return { name, id: branch.id, created: true, expiresAt }
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
  if (command === 'create') {
    const { name, id, created, expiresAt } = await createPreviewBranch(api, env.PR_NUMBER)
    console.log(created ? `Created ${name} (${id}) from ${parentName}, expires ${expiresAt}` : `Reusing ${name} (${id})`)
  }
  else if (command === 'connect') {
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
    throw new Error('Usage: node scripts/neon-preview-branch.mjs create|connect|delete')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).catch((error) => {
    console.error(`::error::${error.message}`)
    process.exitCode = 1
  })
}
