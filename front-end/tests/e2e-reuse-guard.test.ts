import { describe, expect, it } from 'vitest'
import { reuseProblems } from './e2e/reuse'

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
})
