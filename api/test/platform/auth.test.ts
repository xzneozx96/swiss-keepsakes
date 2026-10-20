import { APIError } from 'better-auth/api'
import { describe, expect, it } from 'vitest'
import { createSessionReader, signInCodeLanguage } from '../../src/platform/auth.ts'

describe('[E2.2] signInCodeLanguage: the SPA sends its language in Accept-Language', () => {
  it.each([
    ['de', 'de'],
    ['de-CH', 'de'],
    ['DE-ch,en;q=0.8', 'de'],
    ['en', 'en'],
    ['en-US,de;q=0.5', 'en'],
    ['fr', 'en'],
    ['deutsch', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    [null, 'en'],
  ])('[E2.2] %j is %s', (header, language) => {
    expect(signInCodeLanguage(header)).toBe(language)
  })
})

describe('[E2.2] createSessionReader: a session deleted during its refresh is a signed-out request', () => {
  const reader = (getSession: () => Promise<unknown>) => createSessionReader({ api: { getSession } } as never)

  it('[E2.2] a 401 from Better Auth becomes no session, and keeps the header that clears the cookie', async () => {
    const clearing = new Headers({ 'Set-Cookie': 'better-auth.session_token=; Max-Age=0; Path=/' })
    const read = reader(async () => {
      throw new APIError('UNAUTHORIZED', { message: 'Failed to get session' }, clearing)
    })

    const { headers, response } = await read(new Headers())

    expect(response).toBeNull()
    expect(headers.getSetCookie()).toEqual(['better-auth.session_token=; Max-Age=0; Path=/'])
  })

  it('[E2.2] any other error still surfaces, so a database outage is a 500 and not a sign-out', async () => {
    const read = reader(async () => {
      throw new Error('connection refused')
    })

    await expect(read(new Headers())).rejects.toThrow('connection refused')
  })

  it('[E2.2] a live session passes through unchanged', async () => {
    const session = { headers: new Headers(), response: { user: { id: 'user-1' } } }

    expect(await reader(async () => session)(new Headers())).toBe(session)
  })
})
