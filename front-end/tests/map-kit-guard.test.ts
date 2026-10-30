import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
// The only file that loads MapLibre. The lab keeps its own throwaway maps.
const LOADER = 'components/map/use-map-instance.ts'
const LAB = /^(?:features\/lab\/|routes\/lab\.)/

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.gen.ts') ? [join(dir, entry.name)] : [],
  )
}

/** The statements of a file that bring MapLibre in as a value: not `import type`, a side-effect import, or a dynamic `import()`. */
export function maplibreValueImports(text: string) {
  const found: string[] = []

  for (const match of text.matchAll(/from\s+'(maplibre-gl[^']*)'/g)) {
    const start = text.lastIndexOf('import', match.index)

    if (!text.slice(start, match.index).startsWith('import type'))
      found.push(match[1]!)
  }
  for (const match of text.matchAll(/import\s+'(maplibre-gl[^']*)'/g))
    found.push(match[1]!)
  for (const match of text.matchAll(/import\(\s*'(maplibre-gl[^']*)'/g))
    found.push(match[1]!)

  return found
}

describe('map kit guard', () => {
  it('finds the value imports of MapLibre and ignores type imports', () => {
    expect(maplibreValueImports('import type { Map } from \'maplibre-gl\'\nimport { x } from \'@/a\'')).toEqual([])
    expect(maplibreValueImports('import type {\n  A,\n  B,\n} from \'maplibre-gl\'')).toEqual([])
    expect(maplibreValueImports('import { Map } from \'maplibre-gl\'')).toEqual(['maplibre-gl'])
    expect(maplibreValueImports('import \'maplibre-gl/dist/maplibre-gl.css\'')).toEqual(['maplibre-gl/dist/maplibre-gl.css'])
    expect(maplibreValueImports('const lib = await import(\'maplibre-gl\')')).toEqual(['maplibre-gl'])
    expect(maplibreValueImports('import workerUrl from \'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url\'')).toEqual(['maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'])
  })

  it('loads MapLibre, its CSS and its worker only in use-map-instance.ts (outside the lab), so no screen builds a map of its own', () => {
    const offenders = sources(SRC)
      .map(file => relative(SRC, file))
      .filter(file => file !== LOADER && !LAB.test(file))
      .filter(file => maplibreValueImports(readFileSync(join(SRC, file), 'utf8')).length > 0)

    expect(offenders).toEqual([])
  })

  it('has MapLibre only behind a dynamic import() in the loader', () => {
    const text = readFileSync(join(SRC, LOADER), 'utf8')

    expect(text).toContain('import(\'maplibre-gl\')')
    expect(text).toContain('import(\'maplibre-gl/dist/maplibre-gl.css\')')
    expect(text).not.toMatch(/^import (?!type)[^\n]*from 'maplibre-gl'/m)
    expect(text).not.toMatch(/^import 'maplibre-gl/m)
  })

  it('keeps the old map-controls, fold-credits and per-screen aerial style shims gone', () => {
    const all = sources(SRC).map(file => relative(SRC, file))

    expect(all.filter(file => /(?:^|\/)(?:map-controls|fold-credits|aerial-style)\.tsx?$/.test(file) && !file.startsWith('components/map/'))).toEqual([])
  })
})
