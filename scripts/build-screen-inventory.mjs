// Rebuilds the DATA line of docs/development-plan/screen-inventory.html from the tables of
// docs/development-plan/screen-inventory.md (table 1: existing routes, table 2: new screens).
// Run from the repo root: node scripts/build-screen-inventory.mjs
// The areas cards, the decisions list and the rest of the page are hand-written in the html.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/development-plan')
const mdPath = resolve(dir, 'screen-inventory.md')
const htmlPath = resolve(dir, 'screen-inventory.html')

const clean = cell => cell.trim().replace(/\*\*/g, '').replace(/`/g, '')

function tableRows(lines, heading, columns) {
  const start = lines.findIndex(l => l.startsWith(heading))
  if (start < 0) throw new Error(`heading not found: ${heading}`)
  const rows = []
  let inTable = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('|')) {
      inTable = true
      const cells = line.slice(1, -1).split(' | ').map(clean)
      if (cells[0] === 'Route file' || cells[0] === 'Id' || /^-+$/.test(cells[0].replace(/\s/g, '')))
        continue
      if (cells.length !== columns)
        throw new Error(`${cells.length} cells, expected ${columns}: ${line.slice(0, 80)}`)
      rows.push(cells)
    }
    else if (inTable) {
      break
    }
  }
  return rows
}

const lines = readFileSync(mdPath, 'utf8').split('\n')

const ex = tableRows(lines, '## Table 1.', 9).map(([route, url, id, aud, verdict, render, why, adr, track]) =>
  ({ route, url, id, aud, verdict, render, why, adr, track }))

const nw = tableRows(lines, '## Table 2.', 9).map(([id, url, aud, why, prd, adr, track, render, reuse]) => ({
  id,
  url,
  aud,
  why,
  prd,
  adr,
  track,
  render,
  reuse,
  verdict: url === 'removed' ? 'Removed' : 'New',
}))

const html = readFileSync(htmlPath, 'utf8')
const out = html.split('\n').map(l => (l.startsWith('const DATA=') ? `const DATA=${JSON.stringify({ ex, nw })}` : l)).join('\n')
if (out === html && !html.includes(JSON.stringify({ ex, nw })))
  throw new Error('no DATA line found')
writeFileSync(htmlPath, out)
console.log(`existing rows: ${ex.length}, new rows: ${nw.length} (${nw.filter(r => r.verdict === 'Removed').length} removed)`)
