import type { Membership } from '@sk/domain/identity'
import type { JWK, JWTPayload } from 'jose'
import type { Clock } from '../../src/platform/clock.ts'
import type { Authentication } from '../../src/platform/http/auth.ts'
import { randomUUID } from 'node:crypto'
import { actorFor } from '@sk/domain/identity'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { createTokenVerifier } from '../../src/platform/http/auth.ts'

// Tests sign their own tokens. Nothing here calls Neon.
export const testIssuer = 'https://auth.example.test'
// Neon Auth tokens last 900 s (docs/spikes/SP6.md).
export const tokenLifetime = 900

// An Ed25519 key with a key id, the shape of Neon Auth's JWKS.
export async function createSigningKey(kid = randomUUID()) {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' })
  const jwk: JWK = { ...await exportJWK(publicKey), alg: 'EdDSA', kid }
  return { privateKey, jwk, kid }
}

export type SigningKey = Awaited<ReturnType<typeof createSigningKey>>

// The claims Neon Auth puts in a token, issued now by the clock.
export async function signToken(key: SigningKey, clock: Clock, claims: JWTPayload = {}, header: { alg?: string, kid?: string } = {}) {
  const iat = Math.floor(clock.now().getTime() / 1000)
  return new SignJWT({ iss: testIssuer, aud: testIssuer, sub: randomUUID(), iat, exp: iat + tokenLifetime, email: 'guest@example.ch', name: 'Guest', role: 'user', emailVerified: true, ...claims })
    .setProtectedHeader({ alg: 'EdDSA', kid: key.kid, ...header })
    .sign(key.privateKey)
}

export interface Person {
  platformAdmin?: boolean
  memberships?: Membership[]
}

// The real verifier over a local key set, and the people the identity tables would hold.
export function testAuthentication(keys: JWK[], clock: Clock, people: Record<string, Person> = {}): Authentication {
  return {
    verifyToken: createTokenVerifier({ keys: createLocalJWKSet({ keys }), issuer: testIssuer, clock }),
    loadActor: async userId => actorFor(userId, people[userId]?.platformAdmin ?? false, people[userId]?.memberships ?? []),
  }
}
