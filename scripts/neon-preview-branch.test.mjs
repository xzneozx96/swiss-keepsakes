import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { connect, createPreviewBranch, deletePreviewBranch, main, NeonApiError, neonApi, previewBranchName } from './neon-preview-branch.mjs'

const longLived = [
  { id: 'br-production', name: 'production', default: true, protected: false },
  { id: 'br-staging', name: 'staging', default: false, protected: false },
  { id: 'br-development', name: 'development', default: false, protected: false },
]
const inherited = 'npg_Inherited1'
const host = pooled => (pooled ? 'ep-cool-1-pooler.c-2.eu-central-1.aws.neon.tech' : 'ep-cool-1.c-2.eu-central-1.aws.neon.tech')
const url = (password, pooled) => `postgresql://neondb_owner:${password}@${host(pooled)}/neondb?sslmode=require&channel_binding=require`
const noOutput = { mask() {}, exportVariable() {}, pollMs: 0 }

// A fake Neon API over a list of branches. Like Neon's, its search matches any part of a name, and it pages
// `pageSize` branches at a time. Every operation reports `running` on its first poll and `finished` after.
// A branch starts with the inherited password until its password is reset.
function fakeNeon(branches, { pageSize = 100, resetChangesPassword = true, createFails } = {}) {
  const calls = []
  const operations = new Map()
  let password = inherited
  const operation = (action) => {
    const id = `op-${operations.size + 1}`
    operations.set(id, { id, action, polls: 0 })
    return { id, action, status: 'running' }
  }
  const api = async (method, path, query = {}, body = undefined) => {
    calls.push({ method, path, query, body })
    if (method === 'GET' && path === '/branches') {
      const matches = branches.filter(branch => branch.name.includes(query.search))
      const start = Number(query.cursor ?? 0)
      const next = start + pageSize < matches.length ? String(start + pageSize) : undefined
      return { branches: matches.slice(start, start + pageSize), pagination: next ? { next } : {} }
    }
    if (method === 'POST' && path === '/branches') {
      if (createFails)
        throw createFails
      return { branch: { id: 'br-new', name: body.branch.name }, operations: [operation('create_branch'), operation('start_compute')], connection_uris: [{ connection_uri: url(inherited, false) }] }
    }
    if (method === 'PATCH' && path.startsWith('/branches/'))
      return { branch: { id: path.split('/')[2], expires_at: body.branch.expires_at }, operations: [operation('apply_config')] }
    if (method === 'POST' && path.endsWith('/roles/neondb_owner/reset_password')) {
      const fresh = `npg_Reset${calls.filter(call => call.path.endsWith('/reset_password')).length}`
      if (resetChangesPassword)
        password = fresh
      return { role: { name: 'neondb_owner', password: fresh }, operations: [operation('apply_config')] }
    }
    if (method === 'GET' && path.startsWith('/operations/')) {
      const tracked = operations.get(path.split('/')[2])
      tracked.polls++
      return { operation: { id: tracked.id, action: tracked.action, status: tracked.polls > 1 ? 'finished' : 'running' } }
    }
    if (method === 'GET' && path === '/connection_uri')
      return { uri: url(password, query.pooled) }
    if (method === 'DELETE')
      return { branch: {} }
    throw new Error(`unexpected ${method} ${path}`)
  }
  return {
    api,
    calls,
    deleted: () => calls.filter(call => call.method === 'DELETE').map(call => call.path),
    posted: () => calls.filter(call => call.method === 'POST' && call.path === '/branches').map(call => call.body),
  }
}

// The fake API behind fetch, so main() runs the real client. Query values arrive as strings, as on the wire.
function fakeFetch(neon) {
  return async (input, init) => {
    const target = new URL(input)
    const path = target.pathname.replace(/^\/api\/v2\/projects\/[^/]+/, '')
    const query = Object.fromEntries([...target.searchParams].map(([key, value]) => [key, key === 'pooled' ? value === 'true' : value]))
    try {
      return new Response(JSON.stringify(await neon.api(init.method, path, query, init.body && JSON.parse(init.body))), { status: 200 })
    }
    catch (error) {
      return new Response(error.body ?? error.message, { status: error.status ?? 500 })
    }
  }
}

function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('[E1.13] the pull request Neon branch', () => {
  it('[E1.13] a pull request number maps to preview/pr-<number>, and anything else is refused', () => {
    expect(previewBranchName(12)).toBe('preview/pr-12')
    expect(previewBranchName('7')).toBe('preview/pr-7')
    for (const bad of ['', '0', '-1', '1.5', '12a', ' 12', 'production', 'development', '1;rm -rf /', undefined])
      expect(() => previewBranchName(bad), String(bad)).toThrow('Not a pull request number')
  })

  it('[E1.13] create branches from development, matched by exact name, with an expiry 3 days out, and waits for it', async () => {
    const neon = fakeNeon([{ id: 'br-development-old', name: 'development-old' }, ...longLived, { id: 'br-12', name: 'preview/pr-12' }])

    const result = await createPreviewBranch(neon.api, 1, { now: new Date('2026-10-20T10:00:00.123Z'), pollMs: 0 })

    expect(result).toEqual({ name: 'preview/pr-1', id: 'br-new', created: true, expiresAt: '2026-10-23T10:00:00Z' })
    expect(neon.posted()).toEqual([{
      branch: { name: 'preview/pr-1', parent_id: 'br-development', expires_at: '2026-10-23T10:00:00Z' },
      endpoints: [{ type: 'read_write' }],
    }])
    expect(neon.calls.filter(call => call.path.startsWith('/operations/')).map(call => call.path)).toEqual(['/operations/op-1', '/operations/op-1', '/operations/op-2', '/operations/op-2'])
  })

  it('[E1.13] create reuses the branch with the exact name, moves its expiry 3 days out, and sends no create', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }, { id: 'br-1', name: 'preview/pr-1' }])

    const result = await createPreviewBranch(neon.api, 1, { now: new Date('2026-10-20T10:00:00Z'), pollMs: 0 })

    expect(result).toEqual({ name: 'preview/pr-1', id: 'br-1', created: false, expiresAt: '2026-10-23T10:00:00Z' })
    expect(neon.calls.filter(call => call.method === 'PATCH')).toEqual([{ method: 'PATCH', path: '/branches/br-1', query: {}, body: { branch: { expires_at: '2026-10-23T10:00:00Z' } } }])
    expect(neon.posted()).toEqual([])
  })

  it('[E1.13] create refuses when the development branch is missing, and never falls back to another parent', async () => {
    const neon = fakeNeon([longLived[0], longLived[1], { id: 'br-development-old', name: 'development-old' }])

    await expect(createPreviewBranch(neon.api, 1, { pollMs: 0 })).rejects.toThrow('The parent branch development does not exist')
    expect(neon.posted()).toEqual([])
  })

  it('[E1.13] create says plainly when the project is at its branch limit', async () => {
    const limit = new NeonApiError('POST', '/api/v2/projects/p/branches', 422, '{"code":"BRANCHES_LIMIT_EXCEEDED","message":"branches limit exceeded"}')
    const other = new NeonApiError('POST', '/api/v2/projects/p/branches', 400, '{"message":"invalid expires_at"}')

    await expect(createPreviewBranch(fakeNeon(longLived, { createFails: limit }).api, 1, { pollMs: 0 }))
      .rejects
      .toThrow('Neon refused to create preview/pr-1: the project has reached its branch limit (10 on the Free plan')
    await expect(createPreviewBranch(fakeNeon(longLived, { createFails: other }).api, 1, { pollMs: 0 })).rejects.toBe(other)
  })

  it('[E1.13] branch lookups follow pagination to the exact name', async () => {
    const neon = fakeNeon([{ id: 'br-12', name: 'preview/pr-12' }, { id: 'br-13', name: 'preview/pr-13' }, { id: 'br-1', name: 'preview/pr-1' }], { pageSize: 1 })

    expect(await deletePreviewBranch(neon.api, 1)).toEqual({ name: 'preview/pr-1', id: 'br-1', deleted: true })
    expect(neon.calls.filter(call => call.path === '/branches').map(call => call.query.cursor)).toEqual([undefined, '1', '2'])
    expect(neon.deleted()).toEqual(['/branches/br-1'])
  })

  it('[E1.13] delete removes the branch with the exact name, so pull request 1 never deletes preview/pr-12', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }, { id: 'br-1', name: 'preview/pr-1' }])

    expect(await deletePreviewBranch(neon.api, 1)).toEqual({ name: 'preview/pr-1', id: 'br-1', deleted: true })
    expect(neon.deleted()).toEqual(['/branches/br-1'])
  })

  it('[E1.13] a branch that is already gone counts as deleted, and no delete is sent', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }])

    expect(await deletePreviewBranch(neon.api, 1)).toEqual({ name: 'preview/pr-1', deleted: false })
    expect(neon.deleted()).toEqual([])
  })

  it('[E1.13] delete refuses a preview branch marked default or protected', async () => {
    const neon = fakeNeon([{ id: 'br-3', name: 'preview/pr-3', protected: true }, { id: 'br-4', name: 'preview/pr-4', default: true }])

    await expect(deletePreviewBranch(neon.api, 3)).rejects.toThrow('Refusing to delete preview/pr-3')
    await expect(deletePreviewBranch(neon.api, 4)).rejects.toThrow('Refusing to delete preview/pr-4')
    expect(neon.deleted()).toEqual([])
  })

  it('[E1.13] no command touches production, staging or development, whatever the input', async () => {
    const neon = fakeNeon(longLived)

    for (const input of ['production', 'staging', 'development', 'br-production', '', undefined]) {
      await expect(createPreviewBranch(neon.api, input)).rejects.toThrow('Not a pull request number')
      await expect(deletePreviewBranch(neon.api, input)).rejects.toThrow('Not a pull request number')
      await expect(connect(neon.api, input, noOutput)).rejects.toThrow('Not a pull request number')
    }
    expect(neon.calls).toEqual([])
    await expect(connect(neon.api, 5, noOutput)).rejects.toThrow('preview/pr-5 does not exist')
    expect(neon.calls.filter(call => call.path !== '/branches')).toEqual([])
  })

  it('[E1.13] connect resets the password and waits for the reset before it reads any URL, and exports only the new password', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }, { id: 'br-1', name: 'preview/pr-1' }])
    const events = []

    const result = await connect(neon.api, 1, {
      mask: value => events.push(['mask', value]),
      exportVariable: (key, value) => events.push(['export', key, value]),
      pollMs: 0,
    })

    expect(result).toEqual({ name: 'preview/pr-1', id: 'br-1' })
    expect(events).toEqual([
      ['mask', 'npg_Reset1'],
      ['mask', url('npg_Reset1', false)],
      ['mask', url('npg_Reset1', true)],
      ['export', 'DATABASE_URL', url('npg_Reset1', true)],
      ['export', 'DATABASE_URL_UNPOOLED', url('npg_Reset1', false)],
    ])
    expect(JSON.stringify(events)).not.toContain(inherited)
    const paths = neon.calls.map(call => call.path)
    expect(paths.slice(paths.indexOf('/branches/br-1/roles/neondb_owner/reset_password'))).toEqual([
      '/branches/br-1/roles/neondb_owner/reset_password',
      '/operations/op-1',
      '/operations/op-1',
      '/connection_uri',
      '/connection_uri',
    ])
    expect(neon.calls.filter(call => call.path === '/connection_uri').map(call => call.query)).toEqual([
      { branch_id: 'br-1', database_name: 'neondb', role_name: 'neondb_owner', pooled: false },
      { branch_id: 'br-1', database_name: 'neondb', role_name: 'neondb_owner', pooled: true },
    ])
  })

  it('[E1.13] connect refuses URLs that do not carry the reset password, and exports nothing', async () => {
    const neon = fakeNeon([{ id: 'br-1', name: 'preview/pr-1' }], { resetChangesPassword: false })
    const exported = []

    await expect(connect(neon.api, 1, { mask() {}, exportVariable: (...pair) => exported.push(pair), pollMs: 0 }))
      .rejects
      .toThrow('The connection URIs of preview/pr-1 do not carry the reset password')
    expect(exported).toEqual([])
  })

  it('[E1.13] main writes the add-mask lines before any other output, reads PR_NUMBER, fills GITHUB_ENV and never GITHUB_OUTPUT', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-7', name: 'preview/pr-7' }, { id: 'br-99', name: 'preview/pr-99' }])
    const dir = mkdtempSync(join(tmpdir(), 'neon-preview-'))
    const env = {
      NEON_API_KEY: 'napi_k3y',
      NEON_PROJECT_ID: 'plain-resonance-94662542',
      PR_NUMBER: '7',
      GITHUB_RUN_NUMBER: '99',
      GITHUB_ENV: join(dir, 'env'),
      GITHUB_OUTPUT: join(dir, 'output'),
    }
    const run = async (command) => {
      let out = ''
      await main([command], env, { fetch: fakeFetch(neon), write: (text) => { out += text }, pollMs: 0, retryDelayMs: 0 })
      return out.split('\n').slice(0, -1)
    }

    expect(await run('create')).toEqual(['::add-mask::napi_k3y', expect.stringMatching(/^Reusing preview\/pr-7 \(br-7\), expires \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)])
    expect(await run('connect')).toEqual([
      '::add-mask::napi_k3y',
      '::add-mask::npg_Reset1',
      `::add-mask::${url('npg_Reset1', false)}`,
      `::add-mask::${url('npg_Reset1', true)}`,
      'Reset the neondb_owner password of preview/pr-7 (br-7). DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED point at it',
    ])
    expect(await run('delete')).toEqual(['::add-mask::napi_k3y', 'Deleted preview/pr-7 (br-7)'])

    expect(readFileSync(env.GITHUB_ENV, 'utf8')).toBe(`DATABASE_URL=${url('npg_Reset1', true)}\nDATABASE_URL_UNPOOLED=${url('npg_Reset1', false)}\n`)
    expect(existsSync(env.GITHUB_OUTPUT)).toBe(false)
    expect(neon.calls.some(call => call.path.includes('br-99'))).toBe(false)
    expect(neon.deleted()).toEqual(['/branches/br-7'])
  })

  it('[E1.13] the API client sends the key as a bearer token and a JSON body, retries a busy branch, and keeps the key out of errors', async () => {
    const requests = []
    const answers = [response(423, { message: 'branch is locked' }), response(200, { branches: [] }), response(201, { branch: { id: 'br-1' } }), response(401, { message: 'unauthorized' })]
    const api = neonApi({
      apiKey: 'napi_k3y',
      projectId: 'plain-resonance-94662542',
      retryDelayMs: 0,
      fetch: async (url, init) => {
        requests.push({ url: String(url), method: init.method, headers: init.headers, body: init.body })
        return answers.shift()
      },
    })

    expect(await api('GET', '/branches', { search: 'preview/pr-1' })).toEqual({ branches: [] })
    expect(await api('POST', '/branches', {}, { branch: { name: 'preview/pr-1' } })).toEqual({ branch: { id: 'br-1' } })
    const get = { url: 'https://console.neon.tech/api/v2/projects/plain-resonance-94662542/branches?search=preview%2Fpr-1', method: 'GET', headers: { Authorization: 'Bearer napi_k3y', Accept: 'application/json' }, body: undefined }
    expect(requests).toEqual([get, get, {
      url: 'https://console.neon.tech/api/v2/projects/plain-resonance-94662542/branches',
      method: 'POST',
      headers: { 'Authorization': 'Bearer napi_k3y', 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: '{"branch":{"name":"preview/pr-1"}}',
    }])
    const error = await api('DELETE', '/branches/br-1').catch(caught => caught)
    expect(error.message).toBe('Neon API DELETE /api/v2/projects/plain-resonance-94662542/branches/br-1: 401 {"message":"unauthorized"}')
    expect(error.message).not.toContain('napi_k3y')
  })

  it('[E1.13] the API client gives up after 5 attempts on a branch that stays busy', async () => {
    for (const status of [423, 503]) {
      let attempts = 0
      const api = neonApi({ apiKey: 'k', projectId: 'p', retryDelayMs: 0, fetch: async () => {
        attempts++
        return response(status, { message: 'busy' })
      } })

      await expect(api('DELETE', '/branches/br-1')).rejects.toMatchObject({ status })
      expect(attempts, String(status)).toBe(5)
    }
  })
})
