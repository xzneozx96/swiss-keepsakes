import type { Auth } from '../../src/platform/auth.ts'
import { createHmac } from 'node:crypto'

// A session for a user who already exists, made with Better Auth's own adapter instead of the emailed-code
// sign-in, and the signed cookie the browser would hold. It is the cookie the real sign-in sets (Better Auth
// signs the token with HMAC-SHA256 under the secret), so `createSessionReader` reads it like any other. Use it
// where the sign-in is not what the test proves.
export async function sessionCookie(auth: Pick<Auth, '$context'>, userId: string, secret: string): Promise<string> {
  const context = await auth.$context
  const session = await context.internalAdapter.createSession(userId)
  const signature = createHmac('sha256', secret).update(session.token).digest('base64')
  return `better-auth.session_token=${encodeURIComponent(`${session.token}.${signature}`)}`
}
