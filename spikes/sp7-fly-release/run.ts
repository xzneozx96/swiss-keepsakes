import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { finish, requireEnv, secret } from '../lib/env.ts'

const SPIKE = 'SP7'
const env = requireEnv(SPIKE, {
  FLY_API_TOKEN: secret(),
  FLY_APP_STAGING: z.string().min(1),
  DATABASE_URL_DDL: secret(),
  DATABASE_URL: secret(),
})

const appDir = fileURLToPath(new URL('./app', import.meta.url))
const baseUrl = `https://${env.FLY_APP_STAGING}.fly.dev`
const sleep = (n: number) => new Promise((r) => setTimeout(r, n))

const results: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  results.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}

function fly(args: string[], input?: string) {
  const res = spawnSync('flyctl', args, {
    cwd: appDir,
    input,
    encoding: 'utf8',
    env: { ...process.env, FLY_API_TOKEN: env.FLY_API_TOKEN, FLY_NO_UPDATE_CHECK: '1' },
    maxBuffer: 64 * 1024 * 1024,
  })
  return { status: res.status ?? 1, stdout: res.stdout, stderr: res.stderr }
}

async function version(): Promise<{ appVersion: string; appliedMigrations: number } | null> {
  try {
    const res = await fetch(`${baseUrl}/version`, { signal: AbortSignal.timeout(3000) })
    return res.ok ? ((await res.json()) as { appVersion: string; appliedMigrations: number }) : null
  } catch {
    return null
  }
}

function startPoller() {
  let total = 0
  let failures = 0
  let running = true
  const loop = (async () => {
    while (running) {
      total++
      try {
        const res = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(2000) })
        if (!res.ok) failures++
      } catch {
        failures++
      }
      await sleep(200)
    }
  })()
  return {
    async stop() {
      running = false
      await loop
      return { total, failures }
    },
  }
}

async function deploy(label: string, args: string[], expectSuccess: boolean) {
  const poller = startPoller()
  const res = fly(['deploy', '--app', env.FLY_APP_STAGING, '--remote-only', '--ha=false', '--yes', ...args])
  await sleep(10000)
  const polled = await poller.stop()
  if ((res.status === 0) !== expectSuccess) {
    console.log(res.stderr.split('\n').slice(-6).join('\n'))
  }
  check(`${label}: deploy ${expectSuccess ? 'succeeded' : 'failed as expected'}`, (res.status === 0) === expectSuccess, `exit ${res.status}`)
  check(`${label}: zero failed health probes during the deploy`, polled.failures === 0, `${polled.failures} of ${polled.total} probes failed`)
}

const flyVersion = fly(['version'])
if (flyVersion.status !== 0) {
  console.log('SKIP SP7: missing flyctl')
  finish({ spike: SPIKE, ran: false, scope: 'none', pass: null, missing: ['flyctl'] })
}

fly(['secrets', 'import', '--app', env.FLY_APP_STAGING, '--stage'], `DATABASE_URL_DDL=${env.DATABASE_URL_DDL}\nDATABASE_URL=${env.DATABASE_URL}\n`)

await deploy('baseline v1', ['--build-arg', 'STEP=v1', '--build-arg', 'APP_VERSION=v1'], true)
const v1 = await version()
check('baseline serves v1 with 1 migration applied', v1?.appVersion === 'v1' && v1.appliedMigrations === 1, JSON.stringify(v1))

const releases = JSON.parse(fly(['releases', '--app', env.FLY_APP_STAGING, '--image', '--json']).stdout || '[]') as { ImageRef?: string }[]
const v1Image = releases.find((r) => r.ImageRef)?.ImageRef

await deploy('v2 with a migration', ['--build-arg', 'STEP=v2', '--build-arg', 'APP_VERSION=v2'], true)
const v2 = await version()
check('release command applied the migration and v2 serves', v2?.appVersion === 'v2' && v2.appliedMigrations === 2, JSON.stringify(v2))

if (v1Image) {
  await deploy('rollback to the v1 image', ['--image', v1Image], true)
  const back = await version()
  check('rollback serves v1 on the migrated schema (expand/contract holds)', back?.appVersion === 'v1' && back.appliedMigrations === 2, JSON.stringify(back))
} else {
  check('v1 image reference found for the rollback', false, 'flyctl releases --image returned no ImageRef')
}

await deploy('broken migration', ['--build-arg', 'STEP=bad', '--build-arg', 'APP_VERSION=bad'], false)
const after = await version()
check('failed release command leaves the running version untouched', after?.appVersion === 'v1' && after.appliedMigrations === 2, JSON.stringify(after))

finish({ spike: SPIKE, ran: true, scope: 'remote', pass: results.every((r) => r.ok), missing: [] })
