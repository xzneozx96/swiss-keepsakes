// Text-diff proof for a refactor: renders about 100 routes of two builds in English and German
// (frozen clock, owner and guest roles) and prints every route whose visible text differs.
// An empty diff ("different: 0") is the pass. The renderer is front-end/scripts/verify/compare-builds.mjs.
//
//   pnpm --dir front-end exec vite build --outDir /tmp/opencode/sk-base --emptyOutDir   # on the base commit
//   pnpm --dir front-end exec vite build --outDir /tmp/opencode/sk-new --emptyOutDir    # after the change
//   node scripts/codemods/route-text-diff.mjs /tmp/opencode/sk-base /tmp/opencode/sk-new /tmp/opencode/sk-out
//
// Set PLAYWRIGHT_CHANNEL=chrome to use the installed Chrome. The visible text of every route is
// written to <outDir>/base/text.json and <outDir>/new/text.json.
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const [baseDir, newDir, outDir] = process.argv.slice(2).map(p => resolve(p))

if (!baseDir || !newDir || !outDir) {
  console.error('usage: node scripts/codemods/route-text-diff.mjs <baseBuildDir> <newBuildDir> <outDir>')
  process.exit(2)
}

const frontEnd = resolve(import.meta.dirname, '../../front-end')
const run = spawnSync('node', ['scripts/verify/compare-builds.mjs', baseDir, newDir, outDir], { cwd: frontEnd, encoding: 'utf8' })

process.stdout.write(run.stdout)
process.stderr.write(run.stderr)
process.exit(run.status === 0 && /different: 0\b/.test(run.stdout) ? 0 : 1)
