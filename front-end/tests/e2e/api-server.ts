// The ports and helpers of the real-API Playwright projects (playwright.config.ts). The API runs through
// api/test/support/e2e-server.ts on a database of its own on the Neon development branch.
export const SPA_PORT = 5392
export const INBOX_PORT = 5393
export const API_PORT = 5394
export const SPA_ORIGIN = `http://localhost:${SPA_PORT}`
const inbox = `http://127.0.0.1:${INBOX_PORT}`

export interface SignInCode { code: string, language: string, template: string, subject: string, text: string }

/** The sign-in code of the latest N01 job for this address. No worker runs, so no mail goes out. */
export async function latestCode(email: string): Promise<SignInCode> {
  const response = await fetch(`${inbox}/code?email=${encodeURIComponent(email)}`)

  if (!response.ok)
    throw new Error(`No sign-in code was queued for ${email}`)

  return response.json() as Promise<SignInCode>
}

/** Ages the address's code past its 5 minutes. */
export async function expireCode(email: string) {
  await fetch(`${inbox}/expire?email=${encodeURIComponent(email)}`, { method: 'POST' })
}

/** Moves every rate-limit counter a minute into the past, so a limit lifts without waiting. */
export async function ageRateLimits() {
  await fetch(`${inbox}/age-limits`, { method: 'POST' })
}

/** Deletes the address's sessions on the server, as a revoked or expired session would be. */
export async function endSessions(email: string) {
  await fetch(`${inbox}/end-sessions?email=${encodeURIComponent(email)}`, { method: 'POST' })
}

export function newEmail(): string {
  return `guest-${Math.random().toString(36).slice(2, 10)}@example.ch`
}

/** Makes a user who has signed in once a Super Admin, through the use case `api/scripts/admin-grant.ts` runs. */
export async function grantSuperAdmin(email: string) {
  const response = await fetch(`${inbox}/grant-admin?email=${encodeURIComponent(email)}`, { method: 'POST' })

  if (!response.ok)
    throw new Error(`${email} could not be made a Super Admin: ${await response.text()}`)
}

export interface OwnerInvitationMail { to: string, subject: string, text: string, link: string }

/** Runs the mail attempt for the newest N20 job of this address and returns the mail it would send, with its link. */
export async function ownerInvitationMail(email: string): Promise<OwnerInvitationMail> {
  const response = await fetch(`${inbox}/invitation-link?email=${encodeURIComponent(email)}`, { method: 'POST' })

  if (!response.ok)
    throw new Error(`No N20 link could be made for ${email}: ${await response.text()}`)

  return response.json() as Promise<OwnerInvitationMail>
}

export function newStoreName(): { name: string, slug: string } {
  const suffix = Math.random().toString(36).slice(2, 8)

  return { name: `Keepsake ${suffix}`, slug: `keepsake-${suffix}` }
}
