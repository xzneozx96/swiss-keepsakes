import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const rootEnvFile = ['../../.env.local', '../../api/.env.local']
  .map((rel) => fileURLToPath(new URL(rel, import.meta.url)))
  .find((file) => existsSync(file)) ?? ''
const spikeEnvFile = fileURLToPath(new URL('../.env', import.meta.url))
if (rootEnvFile) process.loadEnvFile(rootEnvFile)
if (existsSync(spikeEnvFile)) {
  const override = parseEnv(readFileSync(spikeEnvFile, 'utf8'))
  for (const [key, value] of Object.entries(override)) if (value !== undefined && value.trim() !== '') process.env[key] = value
}

export interface SpikeResult {
  spike: string
  ran: boolean
  scope: 'local' | 'remote' | 'local+remote' | 'none'
  pass: boolean | null
  missing: string[]
  detail?: string
}

export function recordResult(result: SpikeResult): void {
  const file = process.env.SPIKE_RESULT_FILE
  if (file) writeFileSync(file, JSON.stringify(result))
}

export function finish(result: SpikeResult): never {
  recordResult(result)
  console.log(`${result.pass === false ? 'FAIL' : result.pass ? 'PASS' : 'DONE'} ${result.spike}${result.detail ? `: ${result.detail}` : ''}`)
  process.exit(result.pass === false ? 1 : 0)
}

type Checked<S extends Record<string, z.ZodType>> =
  | { ok: true; env: z.infer<z.ZodObject<S>> }
  | { ok: false; missing: string[] }

export function checkEnv<S extends Record<string, z.ZodType>>(shape: S): Checked<S> {
  const missing: string[] = []
  const invalid: string[] = []
  for (const [key, field] of Object.entries(shape)) {
    const raw = process.env[key]
    const blank = raw === undefined || raw.trim() === ''
    if (blank) {
      if (!field.safeParse(undefined).success) missing.push(key)
    } else if (!field.safeParse(raw).success) {
      invalid.push(key)
    }
  }
  if (missing.length > 0) return { ok: false, missing }
  if (invalid.length > 0) {
    console.error(`FAIL: invalid value for ${invalid.join(', ')} (values are never printed)`)
    process.exit(1)
  }
  const source: Record<string, string | undefined> = {}
  for (const key of Object.keys(shape)) {
    const raw = process.env[key]
    source[key] = raw === undefined || raw.trim() === '' ? undefined : raw
  }
  return { ok: true, env: z.object(shape).parse(source) }
}

export function skipLine(spike: string, missing: string[]): string {
  return `SKIP ${spike}: missing ${missing.join(', ')}`
}

export function tryEnv<S extends Record<string, z.ZodType>>(spike: string, shape: S): z.infer<z.ZodObject<S>> | null {
  const checked = checkEnv(shape)
  if (checked.ok) return checked.env
  console.log(skipLine(spike, checked.missing))
  return null
}

export function requireEnv<S extends Record<string, z.ZodType>>(spike: string, shape: S): z.infer<z.ZodObject<S>> {
  const checked = checkEnv(shape)
  if (checked.ok) return checked.env
  console.log(skipLine(spike, checked.missing))
  recordResult({ spike, ran: false, scope: 'none', pass: null, missing: checked.missing })
  process.exit(0)
}

export const secret = (prefix?: string) =>
  prefix ? z.string().min(1).startsWith(prefix) : z.string().min(1)

export function productionBranchGuard(spike: string): boolean {
  if (process.env.NEON_BRANCH?.trim() !== 'production') return false
  console.log(`SKIP ${spike} remote: NEON_BRANCH is production. Set NEON_BRANCH and the DATABASE_URL* variables to a throwaway branch (e.g. in your shell) to run this against Neon`)
  return true
}
