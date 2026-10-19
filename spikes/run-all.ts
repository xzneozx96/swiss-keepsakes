import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SpikeResult } from './lib/env.ts'

const spikes = [
  { id: 'SP1', script: 'sp1-hono-stripe/run.ts' },
  { id: 'SP2', script: 'sp2-pgboss/run.ts' },
  { id: 'SP3', script: 'sp3-concurrent-holds/run.ts' },
  { id: 'SP4', script: 'sp4-stripe-sandbox/run.ts' },
  { id: 'SP5', script: 'sp5-object-storage/run.ts' },
  { id: 'SP6', script: 'sp6-neon-auth/run.ts' },
  { id: 'SP7', script: 'sp7-fly-release/run.ts' },
]

const root = fileURLToPath(new URL('.', import.meta.url))
const verbose = process.env.VERBOSE === '1' || process.argv.includes('--verbose')
const only = process.argv.slice(2).filter((a) => /^SP\d$/i.test(a)).map((a) => a.toUpperCase())
const tmp = mkdtempSync(join(tmpdir(), 'sk-spikes-'))

function run(id: string, script: string): Promise<{ result: SpikeResult | null; output: string; code: number | null }> {
  const resultFile = join(tmp, `${id}.json`)
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', script], {
      cwd: root,
      env: { ...process.env, SPIKE_RESULT_FILE: resultFile },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const collect = (d: Buffer) => {
      output += d.toString()
      if (verbose) process.stderr.write(d)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('close', (code) => {
      let result: SpikeResult | null = null
      try {
        result = JSON.parse(readFileSync(resultFile, 'utf8')) as SpikeResult
      } catch {
        result = null
      }
      resolve({ result, output, code })
    })
  })
}

interface Row {
  spike: string
  ran: string
  outcome: string
  missing: string
}

const rows: Row[] = []
const manualOpen: string[] = []
let anyFail = false
try {
  for (const { id, script } of spikes) {
    if (only.length > 0 && !only.includes(id)) continue
    process.stderr.write(`running ${id} ...\n`)
    const { result, output, code } = await run(id, script)
    if (!result) {
      anyFail = true
      rows.push({ spike: id, ran: 'RAN', outcome: 'FAIL', missing: '-' })
      process.stderr.write(`${id} produced no result (exit ${code}). Output tail:\n${output.split('\n').slice(-12).join('\n')}\n`)
      continue
    }
    const failed = result.pass === false || (code !== 0 && code !== null)
    if (failed) {
      anyFail = true
      process.stderr.write(`${id} failed. Output tail:\n${output.split('\n').slice(-25).join('\n')}\n`)
    }
    if (result.manual) manualOpen.push(`${id}: ${result.manual}`)
    const scopeLabel = result.scope === 'local' ? 'RAN (local)' : result.scope === 'remote' ? 'RAN (remote)' : result.scope === 'local+remote' ? 'RAN (local+remote)' : 'SKIPPED'
    rows.push({
      spike: id,
      ran: result.ran ? scopeLabel : 'SKIPPED',
      outcome: failed ? 'FAIL' : result.pass === null ? '-' : 'PASS',
      missing: result.missing.length > 0 ? result.missing.join(', ') : '-',
    })
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

const headers = ['Spike', 'Ran', 'Result', 'Missing keys']
const table = rows.map((r) => [r.spike, r.ran, r.outcome, r.missing])
const widths = headers.map((h, i) => Math.max(h.length, ...table.map((r) => (r[i] ?? '').length)))
const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join(" | ").trimEnd()
console.log(line(headers))
console.log(widths.map((w) => '-'.repeat(w)).join('-+-'))
for (const r of table) console.log(line(r))
for (const note of manualOpen) console.log(`MANUAL OPEN ${note}`)
process.exit(anyFail ? 1 : 0)
