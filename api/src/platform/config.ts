import { z } from 'zod'

const portMessage = 'Expected a whole number from 0 to 65535'

const host = z.union([z.ipv4(), z.ipv6(), z.hostname()], { error: 'Expected an IP address or a hostname' })

// Digits only: Number() would also accept forms such as 0x1F90 and 1e3.
const port = z.string().regex(/^\d{1,5}$/, portMessage).transform(Number).pipe(z.number().max(65_535, portMessage))

const postgresUrl = z.url({
  protocol: /^postgres(?:ql)?$/,
  hostname: /./,
  error: issue => (issue.input === undefined ? 'Required' : 'Expected a postgres:// or postgresql:// URL with a host'),
})

const configSchema = z.object({
  // Only `production` changes anything here: BETTER_AUTH_URL must then be https.
  NODE_ENV: z.string().optional(),
  ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  HOST: host.default('0.0.0.0'),
  PORT: port.default(5002),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Request handlers use the pooled connection, pg-boss and migrations the direct one (D2).
  // The names are the ones `neon env pull` writes.
  DATABASE_URL: postgresUrl,
  DATABASE_URL_UNPOOLED: postgresUrl,
  // Mail over SMTP (D12). loadConfig takes all six or none.
  SMTP_HOST: host.optional(),
  SMTP_PORT: port.optional(),
  // true: TLS from the first byte, as on port 465. false: STARTTLS, which the transport then requires, as on port 587.
  SMTP_SECURE: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  // The sender. Gmail accepts only the signed-in account. Message-IDs use its domain.
  SMTP_FROM: z.email({ error: 'Expected an email address' }).optional(),
  // The sender's display name. Plain text: no control characters, angle brackets or quotes, so it cannot open a header.
  SMTP_FROM_NAME: z.string().trim().min(1).max(80).refine(isPlainName, 'Expected plain text without line breaks, angle brackets or quotes').default('Swiss Keepsakes'),
  // Better Auth (D8). BETTER_AUTH_URL is the origin the browser sees: the cookie, the trusted origin and the
  // Google redirect URI come from it. The secret is required everywhere, so a missing one never falls back to
  // Better Auth's built-in development secret.
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/, hostname: /./, error: issue => (issue.input === undefined ? 'Required' : 'Expected an http:// or https:// URL') }),
  BETTER_AUTH_SECRET: z.string({ error: 'Required' }).min(32, 'Expected at least 32 characters. Generate one with `openssl rand -base64 32`'),
  // The origin of the SPA, which an invitation link opens (E2.3). Required with NODE_ENV=production, where it must
  // be https. Elsewhere it defaults to the Vite dev server's. Only its origin is used.
  APP_URL: z.url({ protocol: /^https?$/, hostname: /./, error: 'Expected an http:// or https:// URL' }).optional(),
  // Google sign-in is on only when both are set (loadConfig takes both or neither).
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
})

const googleKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const

// A sender name never carries a control character, an angle bracket or a quote, so it cannot open a header.
function isPlainName(name: string): boolean {
  return ![...name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || '<>"'.includes(char))
}

const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const

type Parsed = z.infer<typeof configSchema>

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from: string
  fromName: string
}

export interface GoogleConfig {
  clientId: string
  clientSecret: string
}

// Without `smtp` the worker still starts, and every mail fails and retries until SMTP_* is set (main.ts).
// Without `google` Better Auth registers no Google provider.
export type Config = Omit<Parsed, typeof smtpKeys[number] | typeof googleKeys[number] | 'APP_URL' | 'SMTP_FROM_NAME'> & { APP_URL: string, smtp?: SmtpConfig, google?: GoogleConfig }

export type ConfigResult = { ok: true, config: Config } | { ok: false, message: string }

function smtpProblems(present: Record<string, string>, parsed: Parsed | undefined): string[] {
  const set = smtpKeys.filter(key => key in present)
  if (set.length === 0)
    return []
  if (set.length < smtpKeys.length)
    return smtpKeys.filter(key => !(key in present)).map(key => `  ${key}: Required when any SMTP_* variable is set`)
  if (parsed?.SMTP_PORT === 465 && parsed.SMTP_SECURE === false)
    return ['  SMTP_SECURE: Port 465 starts with TLS. Expected true']
  if (parsed?.SMTP_PORT === 587 && parsed.SMTP_SECURE === true)
    return ['  SMTP_SECURE: Port 587 upgrades with STARTTLS. Expected false']
  return []
}

// Better Auth reads this variable itself, outside our schema, and would trust more origins than our own (D8).
const refusedAuthKeys = ['BETTER_AUTH_TRUSTED_ORIGINS'] as const

function authProblems(present: Record<string, string>, parsed: Parsed | undefined): string[] {
  return [
    ...refusedAuthKeys.filter(key => key in present).map(key => `  ${key}: Not supported. The only trusted origin is BETTER_AUTH_URL's`),
    ...(parsed?.NODE_ENV === 'production' && !parsed.BETTER_AUTH_URL.startsWith('https:') ? ['  BETTER_AUTH_URL: Expected an https:// URL when NODE_ENV is production'] : []),
  ]
}

const developmentAppUrl = 'http://localhost:3002'

function appUrlProblems(present: Record<string, string>, parsed: Parsed | undefined): string[] {
  if (parsed?.NODE_ENV !== 'production')
    return []
  if (!('APP_URL' in present))
    return ['  APP_URL: Required when NODE_ENV is production']
  return parsed.APP_URL?.startsWith('https:') ? [] : ['  APP_URL: Expected an https:// URL when NODE_ENV is production']
}

function googleProblems(present: Record<string, string>): string[] {
  const set = googleKeys.filter(key => key in present)
  return set.length === 0 || set.length === googleKeys.length
    ? []
    : googleKeys.filter(key => !(key in present)).map(key => `  ${key}: Required when any GOOGLE_* variable is set`)
}

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  // A blank value counts as unset, so `PORT=` in an env file takes the default.
  const present = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())))
  const result = configSchema.safeParse(present)
  // Path and message only: an issue's input may be a secret.
  const lines = [
    ...(result.success ? [] : result.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`)),
    ...smtpProblems(present, result.data),
    ...googleProblems(present),
    ...authProblems(present, result.data),
    ...appUrlProblems(present, result.data),
  ]
  if (!result.success || lines.length > 0)
    return { ok: false, message: ['Invalid environment, the service did not start:', ...lines, 'Values are never printed.'].join('\n') }
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL, ...rest } = result.data
  const base = { ...rest, APP_URL: new URL(APP_URL ?? developmentAppUrl).origin }
  const google = GOOGLE_CLIENT_ID !== undefined && GOOGLE_CLIENT_SECRET !== undefined ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } : undefined
  const config: Config = google ? { ...base, google } : base
  if (SMTP_HOST === undefined || SMTP_PORT === undefined || SMTP_SECURE === undefined || SMTP_USER === undefined || SMTP_PASSWORD === undefined || SMTP_FROM === undefined)
    return { ok: true, config }
  return { ok: true, config: { ...config, smtp: { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, user: SMTP_USER, password: SMTP_PASSWORD, from: SMTP_FROM, fromName: SMTP_FROM_NAME } } }
}
