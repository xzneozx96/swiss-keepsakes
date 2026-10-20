import { z } from 'zod'

const portMessage = 'Expected a whole number from 0 to 65535'

const postgresUrl = z.url({
  protocol: /^postgres(?:ql)?$/,
  hostname: /./,
  error: issue => (issue.input === undefined ? 'Required' : 'Expected a postgres:// or postgresql:// URL with a host'),
})

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
const authUrlMessage = 'Expected an https:// URL, or http:// on this machine'

// The signing keys come from this URL, so plain HTTP is only for a key server on this machine.
const authUrl = z.url({
  protocol: /^https?$/,
  hostname: /./,
  error: issue => (issue.input === undefined ? 'Required' : authUrlMessage),
}).refine((value) => {
  // Zod runs this after a failed URL check too, which has already reported the value.
  if (!URL.canParse(value))
    return true
  const { protocol, hostname } = new URL(value)
  return protocol === 'https:' || loopbackHosts.has(hostname)
}, authUrlMessage)

const configSchema = z.object({
  ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  HOST: z.union([z.ipv4(), z.ipv6(), z.hostname()], { error: 'Expected an IP address or a hostname' }).default('0.0.0.0'),
  // Digits only: Number() would also accept forms such as 0x1F90 and 1e3.
  PORT: z.string().regex(/^\d{1,5}$/, portMessage).transform(Number).pipe(z.number().max(65_535, portMessage)).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Request handlers use the pooled connection, pg-boss and migrations the direct one (D2).
  // The names are the ones `neon env pull` writes.
  DATABASE_URL: postgresUrl,
  DATABASE_URL_UNPOOLED: postgresUrl,
  // Neon Auth of the branch, also a `neon env pull` name. The API verifies Bearer JWTs against the keys at
  // <NEON_AUTH_BASE_URL>/.well-known/jwks.json and expects the URL's origin as the issuer (D8).
  NEON_AUTH_BASE_URL: authUrl,
})

export type Config = z.infer<typeof configSchema>

export type ConfigResult = { ok: true, config: Config } | { ok: false, message: string }

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  // A blank value counts as unset, so `PORT=` in an env file takes the default.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value?.trim()))
  const result = configSchema.safeParse(present)
  if (result.success)
    return { ok: true, config: result.data }
  // Path and message only: an issue's input may be a secret.
  const lines = result.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
  return { ok: false, message: ['Invalid environment, the service did not start:', ...lines, 'Values are never printed.'].join('\n') }
}
