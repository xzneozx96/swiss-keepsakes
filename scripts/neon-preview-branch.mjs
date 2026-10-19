// The pull request's Neon branch in CI (E1.13). Every call works on `preview/pr-<number>` only, so the
// long-lived production, staging and development branches are never changed, deleted or read for credentials.
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs create    creates the branch from development, or reuses it
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs connect   resets its password, masks its URLs, exports them to $GITHUB_ENV
//   PR_NUMBER=12 node scripts/neon-preview-branch.mjs delete    deletes the branch; a branch that is gone is fine
// All three read NEON_API_KEY and NEON_PROJECT_ID. neondatabase/create-branch-action is not used: it writes the
// password and URLs as unmasked step outputs, which the runner prints in debug logs, and this repository is public.
import { appendFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const apiBase = 'https://console.neon.tech/api/v2'
const parentName = 'development'
// A fallback: Neon deletes the branch after 3 days if the closed event never deletes it. The Free plan allows
// 10 branches per project, and production, staging and development take 3 of them.
const expiryMs = 3 * 24 * 60 * 60 * 1000
const pollLimit = 120

export function previewBranchName(prNumber) {
  if (!/^[1-9]\d*$/.test(String(prNumber)))
    throw new Error(`Not a pull request number: "${prNumber}"`)
  return `preview/pr-${prNumber}`
}

export class NeonApiError extends Error {
  constructor(method, path, status, body) {
    super(`Neon API ${method} ${path}: ${status} ${body.slice(0, 200)}`)
    this.status = status
    this.body = body
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export function neonApi({ apiKey, projectId, fetch = globalThis.fetch, retryDelayMs = 2000 }) {
  return async (method, path, query = {}, body = undefined) => {
    const url = new URL(`${apiBase}/projects/${encodeURIComponent(projectId)}${path}`)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) }
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, { method, headers, body: body && JSON.stringify(body) })
      // Neon answers 423 or 503 while another operation runs on the branch, and both are safe to retry.
      if ((response.status === 423 || response.status === 503) && attempt < 5) {
        await sleep(retryDelayMs * attempt)
        continue
      }
      if (!response.ok)
        throw new NeonApiError(method, url.pathname, response.status, await response.text())
      return response.json()
    }
  }
}

// Neon's search matches part of a name: `preview/pr-1` also finds `preview/pr-12`.
async function findBranch(api, name) {
  for (let cursor; ;) {
    const { branches, pagination } = await api('GET', '/branches', { search: name, ...(cursor && { cursor }) })
    const branch = branches.find(candidate => candidate.name === name)
    cursor = pagination?.next
    if (branch || !cursor)
      return branch
  }
}

async function waitForOperations(api, operations, pollMs) {
  for (const { id } of operations ?? []) {
    for (let poll = 1; ; poll++) {
      const { operation } = await api('GET', `/operations/${id}`)
      if (operation.status === 'finished' || operation.status === 'skipped')
        break
      if (['failed', 'error', 'cancelled'].includes(operation.status))
        throw new Error(`Neon operation ${operation.action} ${operation.status}`)
      if (poll === pollLimit)
        throw new Error(`Neon operation ${operation.action} is still ${operation.status} after ${pollLimit} polls`)
      await sleep(pollMs)
    }
  }
}

function expiryFrom(now) {
  return new Date(now.getTime() + expiryMs).toISOString().replace(/\.\d+Z$/, 'Z')
}

// The create response also holds connection URIs with the inherited password, so it is never logged.
export async function createPreviewBranch(api, prNumber, { now = new Date(), pollMs = 1000 } = {}) {
  const name = previewBranchName(prNumber)
  const expiresAt = expiryFrom(now)
  const existing = await findBranch(api, name)
  if (existing) {
    const { operations } = await api('PATCH', `/branches/${existing.id}`, {}, { branch: { expires_at: expiresAt } })
    await waitForOperations(api, operations, pollMs)
    return { name, id: existing.id, created: false, expiresAt }
  }
  const parent = await findBranch(api, parentName)
  if (!parent)
    throw new Error(`The parent branch ${parentName} does not exist`)
  let created
  try {
    created = await api('POST', '/branches', {}, {
      branch: { name, parent_id: parent.id, expires_at: expiresAt },
      endpoints: [{ type: 'read_write' }],
    })
  }
  catch (error) {
    // Neon documents no code for this, so match its message.
    if (error instanceof NeonApiError && error.status < 500 && error.status !== 429 && /branch.*limit|limit.*branch/i.test(error.body))
      throw new Error(`Neon refused to create ${name}: the project has reached its branch limit (10 on the Free plan, counting production, staging and development). Delete the preview branches of closed pull requests, or wait for them to expire. ${error.message}`)
    throw error
  }
  await waitForOperations(api, created.operations, pollMs)
  return { name, id: created.branch.id, created: true, expiresAt }
}

// A branch starts with its parent's password, and development's came from production. Every run resets it first,
// so the URLs this exports work only on the preview branch.
export async function connect(api, prNumber, { mask, exportVariable, pollMs = 1000 }) {
  const name = previewBranchName(prNumber)
  const branch = await findBranch(api, name)
  if (!branch)
    throw new Error(`${name} does not exist`)
  const { role, operations } = await api('POST', `/branches/${branch.id}/roles/neondb_owner/reset_password`)
  mask(role.password)
  // The old password works until the reset's operations finish.
  await waitForOperations(api, operations, pollMs)
  const uri = async pooled => (await api('GET', '/connection_uri', { branch_id: branch.id, database_name: 'neondb', role_name: 'neondb_owner', pooled })).uri
  const direct = await uri(false)
  const pooled = await uri(true)
  if (![direct, pooled].every(url => decodeURIComponent(new URL(url).password) === role.password))
    throw new Error(`The connection URIs of ${name} do not carry the reset password`)
  // The password was masked on its own above, because the integration setup builds URLs for its own database,
  // which a mask of the whole URL would miss. Here its URL-encoded form, when that differs, and both URLs.
  for (const secret of new Set([new URL(direct).password, direct, pooled])) {
    if (secret !== role.password)
      mask(secret)
  }
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

export async function main([command], env, { fetch = globalThis.fetch, write = text => process.stdout.write(text), pollMs = 1000, retryDelayMs = 2000 } = {}) {
  const mask = value => write(`::add-mask::${value}\n`)
  // Actions masks the secret already. This keeps it masked if the key ever comes from somewhere else.
  if (env.NEON_API_KEY)
    mask(env.NEON_API_KEY)
  const api = neonApi({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID, fetch, retryDelayMs })
  if (command === 'create') {
    const { name, id, created, expiresAt } = await createPreviewBranch(api, env.PR_NUMBER, { pollMs })
    write(`${created ? `Created ${name} (${id}) from ${parentName}` : `Reusing ${name} (${id})`}, expires ${expiresAt}\n`)
  }
  else if (command === 'connect') {
    const { name, id } = await connect(api, env.PR_NUMBER, {
      mask,
      exportVariable: (key, value) => appendFileSync(env.GITHUB_ENV, `${key}=${value}\n`),
      pollMs,
    })
    write(`Reset the neondb_owner password of ${name} (${id}). DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED point at it\n`)
  }
  else if (command === 'delete') {
    const { name, id, deleted } = await deletePreviewBranch(api, env.PR_NUMBER)
    write(deleted ? `Deleted ${name} (${id})\n` : `${name} does not exist, nothing to delete\n`)
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
