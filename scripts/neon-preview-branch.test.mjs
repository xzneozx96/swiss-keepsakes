import { describe, expect, it } from 'vitest'
import { connect, createPreviewBranch, deletePreviewBranch, neonApi, previewBranchName } from './neon-preview-branch.mjs'

const longLived = [
  { id: 'br-production', name: 'production', default: true, protected: false },
  { id: 'br-staging', name: 'staging', default: false, protected: false },
  { id: 'br-development', name: 'development', default: false, protected: false },
]

// A fake Neon API over a list of branches. Like Neon's, its search matches any part of a name.
function fakeNeon(branches) {
  const calls = []
  const api = async (method, path, query = {}, body = undefined) => {
    calls.push({ method, path, query, body })
    if (method === 'GET' && path === '/branches')
      return { branches: branches.filter(branch => branch.name.includes(query.search)) }
    if (method === 'POST' && path === '/branches')
      return { branch: { id: 'br-new', name: body.branch.name }, connection_uris: [{ connection_uri: 'postgresql://neondb_owner:npg_S3cret@ep-new/neondb' }] }
    if (method === 'GET' && path === '/connection_uri') {
      const host = query.pooled ? 'ep-cool-1-pooler.c-2.eu-central-1.aws.neon.tech' : 'ep-cool-1.c-2.eu-central-1.aws.neon.tech'
      return { uri: `postgresql://${query.role_name}:npg_S3cret@${host}/${query.database_name}?sslmode=require&channel_binding=require` }
    }
    if (method === 'DELETE')
      return { branch: {} }
    throw new Error(`unexpected ${method} ${path}`)
  }
  return {
    api,
    calls,
    deleted: () => calls.filter(call => call.method === 'DELETE').map(call => call.path),
    posted: () => calls.filter(call => call.method === 'POST').map(call => call.body),
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

  it('[E1.13] create branches from development, matched by exact name, with an expiry 7 days out', async () => {
    const neon = fakeNeon([{ id: 'br-development-old', name: 'development-old' }, ...longLived, { id: 'br-12', name: 'preview/pr-12' }])

    const result = await createPreviewBranch(neon.api, 1, new Date('2026-10-20T10:00:00.123Z'))

    expect(result).toEqual({ name: 'preview/pr-1', id: 'br-new', created: true, expiresAt: '2026-10-27T10:00:00Z' })
    expect(neon.posted()).toEqual([{
      branch: { name: 'preview/pr-1', parent_id: 'br-development', expires_at: '2026-10-27T10:00:00Z' },
      endpoints: [{ type: 'read_write' }],
    }])
  })

  it('[E1.13] create reuses the branch with the exact name and sends no create', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }, { id: 'br-1', name: 'preview/pr-1' }])

    expect(await createPreviewBranch(neon.api, 1)).toEqual({ name: 'preview/pr-1', id: 'br-1', created: false })
    expect(await createPreviewBranch(neon.api, 12)).toEqual({ name: 'preview/pr-12', id: 'br-12', created: false })
    expect(neon.posted()).toEqual([])
  })

  it('[E1.13] create refuses when the development branch is missing, and never falls back to another parent', async () => {
    const neon = fakeNeon([longLived[0], longLived[1], { id: 'br-development-old', name: 'development-old' }])

    await expect(createPreviewBranch(neon.api, 1)).rejects.toThrow('The parent branch development does not exist')
    expect(neon.posted()).toEqual([])
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
      await expect(connect(neon.api, input, { mask() {}, exportVariable() {} })).rejects.toThrow('Not a pull request number')
    }
    expect(neon.calls).toEqual([])
    await expect(connect(neon.api, 5, { mask() {}, exportVariable() {} })).rejects.toThrow('preview/pr-5 does not exist')
    expect(neon.calls.filter(call => call.path !== '/branches')).toEqual([])
  })

  it('[E1.13] connect masks the password and both URLs before it exports the pooled and the direct URL', async () => {
    const neon = fakeNeon([...longLived, { id: 'br-12', name: 'preview/pr-12' }, { id: 'br-1', name: 'preview/pr-1' }])
    const events = []

    const result = await connect(neon.api, 1, {
      mask: value => events.push(['mask', value]),
      exportVariable: (key, value) => events.push(['export', key, value]),
    })

    const direct = 'postgresql://neondb_owner:npg_S3cret@ep-cool-1.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    const pooled = 'postgresql://neondb_owner:npg_S3cret@ep-cool-1-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    expect(result).toEqual({ name: 'preview/pr-1', id: 'br-1' })
    expect(events).toEqual([
      ['mask', 'npg_S3cret'],
      ['mask', direct],
      ['mask', pooled],
      ['export', 'DATABASE_URL', pooled],
      ['export', 'DATABASE_URL_UNPOOLED', direct],
    ])
    expect(neon.calls.filter(call => call.path === '/connection_uri').map(call => call.query)).toEqual([
      { branch_id: 'br-1', database_name: 'neondb', role_name: 'neondb_owner', pooled: false },
      { branch_id: 'br-1', database_name: 'neondb', role_name: 'neondb_owner', pooled: true },
    ])
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
})
