import type { Context } from 'hono'
import type { AppEnv } from '../../../src/platform/http/app.ts'
import { describe, expect, it } from 'vitest'
import { problem } from '../../../src/platform/http/problem.ts'

describe('[E1.10] problem()', () => {
  // `pnpm typecheck` fails if a call below compiles, because each @ts-expect-error would then be unused.
  it('[E1.10] takes only a code from problemTypes and a 4xx or 5xx status', () => {
    function wrongCalls(c: Context<AppEnv>) {
      // @ts-expect-error 'teapot' is not in problemTypes.
      problem(c, { type: 'teapot', status: 400, title: 'Not a known code' })
      // @ts-expect-error 200 is not an error status.
      problem(c, { type: 'not-found', status: 200, title: 'Not an error' })
      // @ts-expect-error 302 is not an error status.
      problem(c, { type: 'about:blank', status: 302, title: 'Not an error' })
    }

    expect(wrongCalls).toBeTypeOf('function')
  })
})
