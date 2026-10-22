import { createHash, randomBytes } from 'node:crypto'

// 256 bits from the system's random source. The raw token exists only in memory and in the mail (section 8).
export function newInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

// What `store_invitations.token_hash` holds. The token is random, so a plain SHA-256 is enough and lets the
// accept route find the row by an indexed equality.
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
