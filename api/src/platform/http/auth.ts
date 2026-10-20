import type { Actor } from '@sk/domain/identity'
import type { Context, MiddlewareHandler } from 'hono'
import type { JWTVerifyGetKey } from 'jose'
import type { Clock } from '../clock.ts'
import type { AppEnv } from './app.ts'
import { anonymous, storeRole } from '@sk/domain/identity'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import { z } from 'zod'
import { problem } from './problem.ts'

// Resolves to the user id, the JWT `sub`, or rejects with InvalidToken.
export type VerifyToken = (token: string) => Promise<string>

export interface Authentication {
  verifyToken: VerifyToken
  loadActor: (userId: string) => Promise<Actor>
}

// The message is the reason, for the log. The client only gets the 401.
export class InvalidToken extends Error {}

// Faults of the token itself. Anything else, such as a key set request that fails or times out, is not the
// client's fault, so it is a 503 and the SPA keeps its session.
const tokenFaults = [
  errors.JWSInvalid,
  errors.JWTInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
]

// The store_memberships and platform_admins columns are uuid, and Postgres accepts any 8-4-4-4-12 hex form.
const userIdSchema = z.guid()

export function createTokenVerifier(deps: { keys: JWTVerifyGetKey, issuer: string, clock: Clock }): VerifyToken {
  return async (token) => {
    let subject: unknown
    try {
      const { payload } = await jwtVerify(token, deps.keys, {
        issuer: deps.issuer,
        algorithms: ['EdDSA'],
        requiredClaims: ['exp', 'sub'],
        // No clockTolerance: a token is refused from the second its exp passes, and the SPA renews it.
        currentDate: deps.clock.now(),
      })
      subject = payload.sub
    }
    catch (error) {
      const fault = tokenFaults.find(type => error instanceof type)
      if (fault)
        throw new InvalidToken(fault.code)
      throw new HTTPException(503, { message: 'The signing keys are not available', cause: error })
    }
    const userId = userIdSchema.safeParse(subject)
    if (!userId.success)
      throw new InvalidToken('sub is not a uuid')
    return userId.data
  }
}

const trailingSlashes = /\/+$/

// Neon Auth signs EdDSA tokens for 15 minutes, with the origin of its URL as the issuer (docs/spikes/SP6.md).
// jose fetches the key set on first use, keeps it for 10 minutes, and fetches it again for an unknown key id
// at most every 30 seconds (its cacheMaxAge and cooldownDuration defaults).
export function neonAuthVerifier(baseUrl: string, clock: Clock): VerifyToken {
  const base = baseUrl.replace(trailingSlashes, '')
  return createTokenVerifier({ keys: createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`)), issuer: new URL(base).origin, clock })
}

function unauthenticated(c: Context<AppEnv>, tokenSent: boolean): Response {
  const response = tokenSent
    ? problem(c, { type: 'unauthenticated', status: 401, title: 'The access token is not valid or has expired' })
    : problem(c, { type: 'unauthenticated', status: 401, title: 'Sign in to use this route' })
  // RFC 6750: no error code when the request carried no token.
  response.headers.set('WWW-Authenticate', tokenSent ? 'Bearer error="invalid_token"' : 'Bearer')
  return response
}

const bearer = /^Bearer (\S+)$/i

// Mounted on /api/*. A request without an Authorization header is anonymous. A token that fails any check is a
// 401 on every route, public ones too, so the SPA renews it instead of reading a public page signed out.
export function authenticate(auth: Authentication): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const header = c.req.header('Authorization')
    if (header === undefined) {
      c.set('actor', anonymous)
      return next()
    }
    let userId: string
    try {
      const token = bearer.exec(header)?.[1]
      if (!token)
        throw new InvalidToken('not a Bearer token')
      userId = await auth.verifyToken(token)
    }
    catch (error) {
      if (!(error instanceof InvalidToken))
        throw error
      c.get('logger').info({ reason: error.message }, 'token refused')
      return unauthenticated(c, true)
    }
    // The token's own `role` claim is Neon Auth's. Roles come from our tables only (D8).
    c.set('actor', await auth.loadActor(userId))
    c.set('logger', c.get('logger').child({ userId }))
    return next()
  }
}

// Mounted on /api/store/:storeId/*, after authenticate: every store route needs a membership in that store
// (section 9, AC02). The Super Admin has none, so it gets 403 too.
export const requireStoreMember: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get('actor')
  if (actor.kind === 'anonymous')
    return unauthenticated(c, false)
  const storeId = c.req.param('storeId')
  if (!storeId || !storeRole(actor, storeId))
    return problem(c, { type: 'forbidden', status: 403, title: 'Only a member of this store may do this' })
  c.set('logger', c.get('logger').child({ storeId }))
  return next()
}
