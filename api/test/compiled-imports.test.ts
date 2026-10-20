import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const apiSource = fileURLToPath(new URL('../src/', import.meta.url))
const domainManifest = fileURLToPath(new URL('../../packages/domain/package.json', import.meta.url))
// A static `from '...'`, a side-effect `import '...'` and a dynamic `import('...')`.
const domainImport = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)'@sk\/domain(\/[\w-]+)?'/g
const compiledFile = /^\.\/dist\/src\/.+\.js$/

// packages/domain compiles only the entries listed with an sk-compiled export (tsconfig.build.json). Production
// Node would run any other entry's .ts source, whose extensionless imports it cannot load.
describe('[E2.10] the API imports only compiled @sk/domain entries', () => {
  it.each([
    ['import { can } from \'@sk/domain/identity\'', './identity'],
    ['import type { Actor } from \'@sk/domain/identity\'', './identity'],
    ['const { can } = await import(\'@sk/domain/orders\')', './orders'],
    ['lazy(() => import( \'@sk/domain/money\' ))', './money'],
    ['import \'@sk/domain/dates\'', './dates'],
    ['export { x } from \'@sk/domain\'', '.'],
  ])('[E2.10] the pattern finds the import in %s', (source, entry) => {
    expect(Array.from(source.matchAll(domainImport), match => `.${match[1] ?? ''}`)).toEqual([entry])
  })

  it('[E2.10] every @sk/domain import under api/src has an sk-compiled export', async () => {
    const files = (await readdir(apiSource, { recursive: true })).filter(file => file.endsWith('.ts'))
    const imported = new Set<string>()
    for (const file of files) {
      for (const match of (await readFile(join(apiSource, file), 'utf8')).matchAll(domainImport))
        imported.add(`.${match[1] ?? ''}`)
    }
    const { exports } = JSON.parse(await readFile(domainManifest, 'utf8')) as { exports: Record<string, unknown> }

    expect([...imported]).toContain('./identity')
    for (const entry of imported)
      expect(exports[entry], `@sk/domain${entry.slice(1)} has no sk-compiled export in packages/domain/package.json`).toMatchObject({ 'sk-compiled': expect.stringMatching(compiledFile) })
  })
})
