import { z } from 'zod'

const configSchema = z.object({
  ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url({
    protocol: /^postgres(?:ql)?$/,
    error: issue => (issue.input === undefined ? 'Required' : 'Expected a postgres:// or postgresql:// URL'),
  }),
})

export type Config = z.infer<typeof configSchema>

export type ConfigResult = { ok: true, config: Config } | { ok: false, message: string }

export function loadConfig(env: Record<string, string | undefined>): ConfigResult {
  // A blank value counts as unset, so `PORT=` takes the default instead of coercing to 0.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value?.trim()))
  const result = configSchema.safeParse(present)
  if (result.success)
    return { ok: true, config: result.data }
  // Path and message only: an issue's input may be a secret.
  const lines = result.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
  return { ok: false, message: ['Invalid environment, the service did not start:', ...lines, 'Values are never printed.'].join('\n') }
}
