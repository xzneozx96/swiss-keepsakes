import { randomUUID } from 'node:crypto'
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose'
import pg from 'pg'
import { z } from 'zod'
import { finish, requireEnv } from '../lib/env.ts'
import { neon, readProjectId } from '../lib/neon-project.ts'

const SPIKE = 'SP6'
const env = requireEnv(SPIKE, {
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_JWKS_URL: z.url().optional(),
  SP6_JWT: z.string().min(1).optional(),
  NEON_BRANCH: z.string().min(1),
  SP6_JWT_LATER: z.string().min(1).optional(),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
})

const results: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  results.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}
const mask = (id: unknown) => (typeof id === 'string' ? `${id.slice(0, 8)}...` : 'absent')

const authUrl = new URL(env.NEON_AUTH_BASE_URL)
const issuer = authUrl.origin
const jwksUrl = env.NEON_AUTH_JWKS_URL ?? `${env.NEON_AUTH_BASE_URL.replace(/\/$/, '')}/.well-known/jwks.json`
const jwks = createRemoteJWKSet(new URL(jwksUrl))

const jwksRes = await fetch(jwksUrl)
const jwksBody = (await jwksRes.json().catch(() => ({ keys: [] }))) as { keys?: { alg?: string; crv?: string; kid?: string }[] }
check('JWKS is public and lists an Ed25519 key', jwksRes.ok && (jwksBody.keys ?? []).some((k) => k.alg === 'EdDSA' && k.crv === 'Ed25519'), `HTTP ${jwksRes.status}, ${jwksBody.keys?.length ?? 0} key(s)`)

let testUserId: string | null = null
let testUserDeleted: boolean | null = null
let SP6_JWT = env.SP6_JWT ?? ''
if (!SP6_JWT) {
  const email = `sp6-test-${randomUUID()}@example.com`
  const password = `Sp6-${randomUUID()}-Aa1!`
  const signUp = await fetch(`${env.NEON_AUTH_BASE_URL}/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: issuer },
    body: JSON.stringify({ email, password, name: 'sp6 spike' }),
  })
  const signUpBody = (await signUp.json().catch(() => ({}))) as { user?: { id?: string; emailVerified?: boolean } }
  testUserId = signUpBody.user?.id ?? null
  check('email + password sign-up works without an email code', signUp.ok && testUserId !== null, `HTTP ${signUp.status}, emailVerified ${String(signUpBody.user?.emailVerified)}`)
  const cookie = (signUp.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
  if (cookie) {
    const tokenRes = await fetch(`${env.NEON_AUTH_BASE_URL}/token`, { headers: { cookie, origin: issuer } })
    const tokenBody = (await tokenRes.json().catch(() => ({}))) as { token?: string }
    check('GET /token with the session cookie returns a JWT', tokenRes.ok && Boolean(tokenBody.token), `HTTP ${tokenRes.status}`)
    SP6_JWT = tokenBody.token ?? ''
  }
  const deleteApi = await fetch(`${env.NEON_AUTH_BASE_URL}/delete-user`, {
    method: 'POST',
    headers: { cookie, origin: issuer, 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  console.log(`obs  Better Auth /delete-user from the client API: HTTP ${deleteApi.status}`)
}

let cleaned = false
async function cleanup() {
  if (!testUserId || cleaned) return
  cleaned = true
  const projectId = readProjectId()
  if (!projectId) {
    console.log('WARN test user NOT deleted: no Neon project id (NEON_PROJECT_ID or api/.neon)')
    testUserDeleted = false
    return
  }
  testUserDeleted = neon(['neon-auth', 'user', 'delete', testUserId, '--project-id', projectId, '--branch', env.NEON_BRANCH]).ok
}

if (!SP6_JWT) {
  await cleanup()
  check('a JWT was obtained', false)
  finish({ spike: SPIKE, ran: true, scope: 'remote', pass: false, missing: [], detail: 'automated part' })
}

let verified: Awaited<ReturnType<typeof jwtVerify>>['payload'] | null = null
try {
  const header = decodeProtectedHeader(SP6_JWT)
  check('token is signed with EdDSA', header.alg === 'EdDSA', `alg ${header.alg ?? 'none'}, kid ${header.kid ? 'present' : 'absent'}`)

  verified = await jwtVerify(SP6_JWT, jwks, { issuer, algorithms: ['EdDSA'] }).then(
    (r) => r.payload,
    (e: unknown) => {
      check('token verifies with jose against the JWKS and the issuer', false, e instanceof Error ? e.message : 'verification error')
      return null
    },
  )
  if (verified) {
    check('token verifies with jose against the JWKS and the issuer', true, `issuer ${issuer}`)
    const lifetime = (verified.exp ?? 0) - (verified.iat ?? 0)
    check('token lifetime is 15 minutes (900 s)', lifetime === 900, `exp - iat = ${lifetime} s`)
    check('sub claim is a uuid (neon_auth.user.id)', z.uuid().safeParse(verified.sub).success, `sub ${mask(verified.sub)}`)
    console.log(`obs  claims present: ${Object.keys(verified).sort().join(', ')}`)
    console.log(`obs  seconds until expiry: ${(verified.exp ?? 0) - Math.floor(Date.now() / 1000)}`)
  }

  const parts = SP6_JWT.split('.')
  const tampered = `${parts[0]}.${parts[1]}.${(parts[2] ?? '').slice(0, -2)}AA`
  await jwtVerify(tampered, jwks, { issuer, algorithms: ['EdDSA'] }).then(
    () => check('tampered signature is rejected', false),
    () => check('tampered signature is rejected', true),
  )
  await jwtVerify(SP6_JWT, jwks, { issuer: 'https://not-the-issuer.example', algorithms: ['EdDSA'] }).then(
    () => check('wrong issuer is rejected', false),
    () => check('wrong issuer is rejected', true),
  )

  if (env.SP6_JWT_LATER) {
    const first = decodeJwt(SP6_JWT)
    const later = await jwtVerify(env.SP6_JWT_LATER, jwks, { issuer, algorithms: ['EdDSA'] }).then(
      (r) => r.payload,
      () => null,
    )
    check('a token fetched later verifies (renewal works)', later !== null)
    if (later) {
      check('later token is a new token with the same subject', later.sub === first.sub && (later.iat ?? 0) > (first.iat ?? 0), `iat gap ${(later.iat ?? 0) - (first.iat ?? 0)} s`)
    }
  }
} catch (error) {
  await cleanup()
  throw error
}

async function sqlCount(query: string, params: unknown[] = []): Promise<number | null> {
  if (!env.DATABASE_URL_UNPOOLED) return null
  const client = new pg.Client({ connectionString: env.DATABASE_URL_UNPOOLED })
  await client.connect()
  try {
    return ((await client.query(query, params)).rows[0] as { n: number }).n
  } finally {
    await client.end()
  }
}

if (verified?.sub && testUserId) {
  const rows = await sqlCount('select count(*)::int as n from neon_auth."user" where id = $1', [verified.sub])
  check('sub resolves to a row in neon_auth.user', rows === 1, rows === null ? 'DATABASE_URL_UNPOOLED not set' : undefined)
}

if (testUserId) {
  await cleanup()
  check('throwaway test user deleted via `neon neon-auth user delete`', testUserDeleted === true)
  const left = await sqlCount(`select count(*)::int as n from neon_auth."user" where email like 'sp6-test-%'`)
  check('no sp6-test-% user left in neon_auth.user (SQL count)', left === 0, left === null ? 'DATABASE_URL_UNPOOLED not set' : `${left} left`)
}

const manual = 'iOS Safari persistence, Google sign-in, staff invitation, code limits, email sender, token renewal and user export (spikes/sp6-neon-auth/README.md)'
finish({ spike: SPIKE, ran: true, scope: 'remote', pass: results.every((r) => r.ok), missing: [], detail: 'automated part', manual })
