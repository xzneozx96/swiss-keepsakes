import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose'
import pg from 'pg'
import { z } from 'zod'
import { finish, requireEnv, secret } from '../lib/env.ts'

const SPIKE = 'SP6'
const env = requireEnv(SPIKE, {
  NEON_AUTH_URL: z.url(),
  SP6_JWT: secret(),
  SP6_JWT_LATER: z.string().min(1).optional(),
  DATABASE_URL_DIRECT: z.string().min(1).optional(),
})

const results: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  results.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}
const mask = (id: unknown) => (typeof id === 'string' ? `${id.slice(0, 8)}...` : 'absent')

const authUrl = new URL(env.NEON_AUTH_URL)
const issuer = authUrl.origin
const jwks = createRemoteJWKSet(new URL(`${env.NEON_AUTH_URL.replace(/\/$/, '')}/.well-known/jwks.json`))

const header = decodeProtectedHeader(env.SP6_JWT)
check('token is signed with EdDSA', header.alg === 'EdDSA', `alg ${header.alg ?? 'none'}, kid ${header.kid ? 'present' : 'absent'}`)

const verified = await jwtVerify(env.SP6_JWT, jwks, { issuer, algorithms: ['EdDSA'] }).then(
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

const parts = env.SP6_JWT.split('.')
const tampered = `${parts[0]}.${parts[1]}.${(parts[2] ?? '').slice(0, -2)}AA`
await jwtVerify(tampered, jwks, { issuer, algorithms: ['EdDSA'] }).then(
  () => check('tampered signature is rejected', false),
  () => check('tampered signature is rejected', true),
)
await jwtVerify(env.SP6_JWT, jwks, { issuer: 'https://not-the-issuer.example', algorithms: ['EdDSA'] }).then(
  () => check('wrong issuer is rejected', false),
  () => check('wrong issuer is rejected', true),
)

if (env.SP6_JWT_LATER) {
  const first = decodeJwt(env.SP6_JWT)
  const later = await jwtVerify(env.SP6_JWT_LATER, jwks, { issuer, algorithms: ['EdDSA'] }).then(
    (r) => r.payload,
    () => null,
  )
  check('a token fetched later verifies (renewal works)', later !== null)
  if (later) {
    check('later token is a new token with the same subject', later.sub === first.sub && (later.iat ?? 0) > (first.iat ?? 0), `iat gap ${(later.iat ?? 0) - (first.iat ?? 0)} s`)
  }
}

if (env.DATABASE_URL_DIRECT && verified?.sub) {
  const client = new pg.Client({ connectionString: env.DATABASE_URL_DIRECT })
  await client.connect()
  try {
    const row = await client.query('select count(*)::int as n from neon_auth."user" where id = $1', [verified.sub])
    check('sub resolves to a row in neon_auth.user', (row.rows[0] as { n: number }).n === 1)
  } finally {
    await client.end()
  }
}

console.log('MANUAL: iOS Safari persistence, Google sign-in, staff invitation, code limits and user export are in spikes/sp6-neon-auth/README.md.')
finish({ spike: SPIKE, ran: true, scope: 'remote', pass: results.every((r) => r.ok), missing: [], detail: 'automatable parts only; manual checklist still open' })
