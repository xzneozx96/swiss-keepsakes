import { describe, expect, it } from 'vitest'
import { listenerPids, reuseProblems, wantsApi, wantsDemo } from './e2e/reuse'

const root = '/work/a'
const here = {
  inboxRoot: async () => root,
  portCwd: async () => `${root}/front-end`,
}

describe('reuseProblems (E2E_REUSE guard)', () => {
  it('finds nothing when every server belongs to this worktree', async () => {
    expect(await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }, { name: 'demo', port: 5391 }], ...here })).toEqual([])
  })

  it('names the other worktree when the API runs from a different root', async () => {
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, inboxRoot: async () => '/work/b' })
    expect(problems.join('\n')).toContain('/work/b')
    expect(problems.join('\n')).toContain('e2e API')
  })

  it('reports an API that is not running', async () => {
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, inboxRoot: async () => undefined })
    expect(problems.join('\n')).toContain('pnpm e2e:servers')
  })

  it('reports an SPA dev server of another worktree, and one that is not listening', async () => {
    const other = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, portCwd: async () => '/work/b/front-end' })
    expect(other.join('\n')).toContain('5392')
    expect(other.join('\n')).toContain('/work/b/front-end')
    const none = await reuseProblems({ root, ports: [{ name: 'demo', port: 5391 }], ...here, portCwd: async () => undefined })
    expect(none.join('\n')).toContain('5391')
  })

  it('does not treat a sibling directory with the same prefix as this root', async () => {
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, portCwd: async () => '/work/a-copy/front-end' })
    expect(problems).toHaveLength(1)
  })

  it('refuses a dev server of a worktree nested under this root', async () => {
    const nested = `${root}/.worktrees/e2e-reuse/front-end`
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, portCwd: async () => nested })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(nested)
  })

  it('accepts a nested root when the server runs from that root\'s own front-end', async () => {
    const nestedRoot = `${root}/.worktrees/e2e-reuse`
    const problems = await reuseProblems({
      root: nestedRoot,
      ports: [{ name: 'SPA', port: 5392 }],
      inboxRoot: async () => nestedRoot,
      portCwd: async () => `${nestedRoot}/front-end`,
    })
    expect(problems).toEqual([])
  })

  it('refuses a server started from a folder of the root other than front-end', async () => {
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA', port: 5392 }], ...here, portCwd: async () => `${root}/front-end/src` })
    expect(problems).toHaveLength(1)
  })

  it('says "dev server" once in its refusal', async () => {
    const problems = await reuseProblems({ root, ports: [{ name: 'SPA dev server', port: 5392 }], ...here, portCwd: async () => '/work/b/front-end' })
    expect(problems[0]).not.toContain('dev server dev server')
  })
})

describe('listenerPids (dual-stack binds list one pid per socket)', () => {
  it('returns every distinct pid on the port', () => {
    const out = [
      'LISTEN 0 511 [::1]:5392 [::]:* users:(("node",pid=111,fd=20))',
      'LISTEN 0 511 127.0.0.1:5392 0.0.0.0:* users:(("node",pid=222,fd=21),("node",pid=111,fd=22))',
    ].join('\n')
    expect(listenerPids(out)).toEqual(['111', '222'])
  })

  it('returns nothing for empty output', () => {
    expect(listenerPids('')).toEqual([])
  })
})

describe('wantsApi (when the api project and its servers are in the run)', () => {
  const urls = { DATABASE_URL: 'x', DATABASE_URL_UNPOOLED: 'y' }

  it('needs both Neon variables in a default run', () => {
    expect(wantsApi({})).toBe(false)
    expect(wantsApi({ DATABASE_URL: 'x' })).toBe(false)
    expect(wantsApi(urls)).toBe(true)
  })

  it('is on in a reuse run without any URL, because the reused servers already hold them', () => {
    expect(wantsApi({ E2E_REUSE: '1' })).toBe(true)
  })
})

describe('wantsDemo (which servers a run starts or reuses)', () => {
  const api = 'api-chromium-en'

  it('wants the demo server by default, also in a reuse run without --project', () => {
    expect(wantsDemo({}, ['playwright', 'test', 'x'])).toBe(true)
    expect(wantsDemo({ E2E_REUSE: '1' }, ['playwright', 'test'])).toBe(true)
  })

  it('leaves it out with E2E_DEMO=0', () => {
    expect(wantsDemo({ E2E_DEMO: '0' }, [])).toBe(false)
  })

  it('leaves it out of a reuse run that selects only the api project, in either --project form', () => {
    expect(wantsDemo({ E2E_REUSE: '1' }, ['--project', api])).toBe(false)
    expect(wantsDemo({ E2E_REUSE: '1' }, [`--project=${api}`])).toBe(false)
    expect(wantsDemo({ E2E_REUSE: '1' }, ['--project', api, '--project', 'chromium'])).toBe(true)
  })

  it('keeps the demo server in a default run that selects only the api project', () => {
    expect(wantsDemo({}, ['--project', api])).toBe(true)
  })
})
