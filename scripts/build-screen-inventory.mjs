// Rebuilds the DATA line of docs/development-plan/screen-inventory.html from the tables of
// docs/development-plan/screen-inventory.md (the slice index, table 1: existing routes, table 2: new screens).
// Run from the repo root: node scripts/build-screen-inventory.mjs
// The slice cards and the grouped table are built in the page from DATA. The decisions list and the
// rest of the page are hand-written in the html.
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
      if (cells[0] === 'Slice' || cells[0] === 'Id' || line.startsWith('| | **Total**') || /^-+$/.test(cells[0].replace(/\s/g, '')))
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

const slices = tableRows(lines, '## Feature slices', 13).map(([slice, name, track, goal, redesign, nw, keep, hide, design, status, approved, spec, blocked]) =>
  ({ slice, name, track, goal, counts: { Redesign: +redesign, New: +nw, Keep: +keep, Hide: +hide }, design: +design, status, approved: approved === 'none' ? [] : approved.split(',').map(x => x.trim()), spec: spec === 'none' ? '' : spec, blocked }))

const ex = tableRows(lines, '## Table 1.', 11).map(([slice, ui, route, url, id, aud, verdict, render, why, adr, track]) =>
  ({ slice, ui, route, url, id, aud, verdict, render, why, adr, track }))

const nw = tableRows(lines, '## Table 2.', 11).map(([slice, ui, id, url, aud, why, prd, adr, track, render, reuse]) => ({
  slice,
  ui,
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

// Every row needs a known slice, and the index counts must match the rows.
const known = new Set(slices.map(s => s.slice))
for (const r of [...ex, ...nw]) {
  if (!known.has(r.slice))
    throw new Error(`unknown slice "${r.slice}" on ${r.route ?? r.id}`)
  if (!['Design', 'Edit', 'Wire', 'None'].includes(r.ui))
    throw new Error(`unknown UI work "${r.ui}" on ${r.route ?? r.id}`)
}
for (const s of slices) {
  const count = { Redesign: 0, New: 0, Keep: 0, Hide: 0 }
  for (const r of [...ex, ...nw]) {
    if (r.slice === s.slice && r.verdict in count)
      count[r.verdict]++
  }
  const design = [...ex, ...nw].filter(r => r.slice === s.slice && r.ui === 'Design').length
  if (design !== s.design)
    throw new Error(`slice ${s.slice} index says ${s.design} Design rows, rows say ${design}`)
  if (JSON.stringify(count) !== JSON.stringify(s.counts))
    throw new Error(`slice ${s.slice} index says ${JSON.stringify(s.counts)}, rows say ${JSON.stringify(count)}`)
}

// "Blocked by" of each slice must match the open items table (closed items are skipped).
const idSlices = new Map()
const addTo = (key, slice) => idSlices.set(key, [...(idSlices.get(key) ?? []), slice])
for (const r of [...ex, ...nw]) {
  if (r.id)
    addTo(r.id, r.slice)
  if (r.route)
    addTo(r.route.replace(/^store\//, ''), r.slice)
}
// Words the table uses for a screen or a group of screens.
const alias = { home: ['S2'], settings: ['S0'], tracking: ['S11'] }
const derived = new Map(slices.map(s => [s.slice, new Set()]))
for (const [oid, blocks, missing] of tableRows(lines, '## Open items that block a screen', 3)) {
  if (missing.startsWith('Closed'))
    continue
  for (const token of blocks.split(',').map(x => x.trim())) {
    const hit = alias[token] ?? idSlices.get(token)
    if (!hit)
      throw new Error(`open item ${oid} blocks "${token}", which maps to no slice`)
    for (const sl of hit)
      derived.get(sl).add(oid)
  }
}
const byNumber = (a, b) => +a.slice(1) - +b.slice(1)
for (const s of slices) {
  const want = [...derived.get(s.slice)].sort(byNumber).join(', ') || 'none'
  const have = s.blocked.split(',').map(x => x.trim()).sort(byNumber).join(', ')
  if (want !== have)
    throw new Error(`slice ${s.slice} says blocked by "${s.blocked}", open items say "${want}"`)
}

// Design status: must agree with the Design rows of the slice.
const statuses = ['Approved', 'Partly approved', 'In design', 'Not started', 'No design needed']
for (const s of slices) {
  if (!statuses.includes(s.status))
    throw new Error(`slice ${s.slice} has unknown design status "${s.status}"`)
  const designIds = [...ex, ...nw].filter(r => r.slice === s.slice && r.ui === 'Design').map(r => r.id).filter(Boolean)
  const unknown = s.approved.filter(id => !designIds.includes(id))
  if (unknown.length)
    throw new Error(`slice ${s.slice} approves ${unknown.join(', ')}, which are not Design screens of the slice`)
  // A screen with two route files (M12 new and edit) is two Design rows but one approval.
  const idless = [...ex, ...nw].filter(r => r.slice === s.slice && r.ui === 'Design' && !r.id).length
  const all = idless === 0 && designIds.every(id => s.approved.includes(id))
  const some = s.approved.length > 0
  const ok = {
    'Approved': all && some,
    'Partly approved': some && !all,
    'In design': !some && s.design > 0,
    'Not started': !some && s.design > 0,
    'No design needed': s.design === 0 && !some,
  }[s.status]
  if (!ok)
    throw new Error(`slice ${s.slice} says "${s.status}" but ${s.approved.length} of ${s.design} Design screens are approved`)
  if (s.status === 'Approved' || s.status === 'Partly approved') {
    if (!s.spec)
      throw new Error(`slice ${s.slice} is ${s.status} but names no spec file`)
  }
}

const data = JSON.stringify({ ex, nw, slices })
const html = readFileSync(htmlPath, 'utf8')
const out = html.split('\n').map(l => (l.startsWith('const DATA=') ? `const DATA=${data}` : l)).join('\n')
if (out === html && !html.includes(data))
  throw new Error('no DATA line found')
writeFileSync(htmlPath, out)
console.log(`slices: ${slices.length}, existing rows: ${ex.length}, new rows: ${nw.length} (${nw.filter(r => r.verdict === 'Removed').length} removed)`)
