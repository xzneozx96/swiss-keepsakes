// The ports and helpers of the real-API Playwright projects (playwright.config.ts). The API runs through
// api/test/support/e2e-server.ts on a database of its own on the Neon development branch.
export const SPA_PORT = 5392
export const INBOX_PORT = 5393
export const API_PORT = 5394
export const SPA_ORIGIN = `http://localhost:${SPA_PORT}`
const inbox = `http://127.0.0.1:${INBOX_PORT}`

export interface SignInCode { code: string, language: string, template: string }

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

/** Deletes the address's sessions on the server, as a revoked or expired session would be. */
export async function endSessions(email: string) {
  await fetch(`${inbox}/end-sessions?email=${encodeURIComponent(email)}`, { method: 'POST' })
}

export function newEmail(): string {
  return `guest-${Math.random().toString(36).slice(2, 10)}@example.ch`
}
