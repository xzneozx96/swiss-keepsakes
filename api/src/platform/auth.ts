import type { Logger } from 'pino'
import type { GoogleConfig } from './config.ts'
import type { Database } from './db/client.ts'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { account, rateLimit, session, user, verification } from '../modules/identity/adapters/schema.ts'

export type SignInCodeLanguage = 'en' | 'de'

export interface SignInCode {
  email: string
  code: string
  language: SignInCodeLanguage
}

export interface AuthDeps {
  db: Database
  // The origin the browser sees. It becomes the base URL and the one trusted origin.
  baseUrl: string
  secret: string
  // Google sign-in exists only with credentials (config.google).
  google?: GoogleConfig
  // Queues the N01 mail and returns. It never waits for the mail itself.
  sendSignInCode: (code: SignInCode) => Promise<void>
  logger: Logger
}

// The SPA sends its current language in `Accept-Language` through the auth client's `fetchOptions` (D8, section 9).
// Only the first tag counts. Anything but German is English.
export function signInCodeLanguage(acceptLanguage: string | null | undefined): SignInCodeLanguage {
  const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? ''
  return first === 'de' || first.startsWith('de-') ? 'de' : 'en'
}

const sessionSeconds = 7 * 24 * 60 * 60
const sessionRefreshSeconds = 24 * 60 * 60

// Better Auth inside the API (D8), mounted at /api/auth/* by createApp. Every option name here was checked
// against the installed better-auth (docs/architecture/backend.md section 9). Only the emailOTP plugin and the
// Google provider are on: email and password, magic link, device flow, SSO, the OAuth proxy, the admin plugin
// and the bearer plugin stay off.
export function createAuth({ db, baseUrl, secret, google, sendSignInCode, logger }: AuthDeps) {
  const origin = new URL(baseUrl).origin
  return betterAuth({
    baseURL: origin,
    secret,
    trustedOrigins: [origin],
    database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification, rateLimit } }),
    // The sign-in code is a secret that Better Auth would log with the rest of its arguments, so only the
    // message and an error reach pino, the way the rest of the API logs (backend/data-jobs-security.md).
    logger: {
      log: (level, message, ...args) => {
        logger[level]({ err: args.find(arg => arg instanceof Error) }, message)
      },
    },
    telemetry: { enabled: false },
    advanced: {
      database: { generateId: 'uuid' },
      // Better Auth skips both checks when NODE_ENV is test, so they are set rather than left to the default.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: origin.startsWith('https:'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
      // Fly's proxy sets Fly-Client-IP itself. X-Forwarded-For can be spoofed, so it is not read (F29).
      ipAddress: { ipAddressHeaders: ['fly-client-ip'] },
    },
    session: {
      expiresIn: sessionSeconds,
      updateAge: sessionRefreshSeconds,
      // With the cache on, a revoked session would stay valid until the cache expires.
      cookieCache: { enabled: false },
    },
    // trustedProviders stays empty: Google joins an existing user only when it reports the email as verified.
    account: { accountLinking: { trustedProviders: [] } },
    // Off outside production by default, and two Fly machines need the counters in Postgres, per IP.
    rateLimit: { enabled: true, storage: 'database' },
    socialProviders: google ? { google: { clientId: google.clientId, clientSecret: google.clientSecret } } : {},
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        async sendVerificationOTP({ email, otp, type }, ctx) {
          // Only a sign-in code has a mail. The other types belong to password flows that are off.
          if (type !== 'sign-in')
            return
          const headers = ctx?.headers ?? ctx?.request?.headers
          await sendSignInCode({ email, code: otp, language: signInCodeLanguage(headers?.get('accept-language')) })
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
