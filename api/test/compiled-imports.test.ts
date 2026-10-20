import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const apiSource = fileURLToPath(new URL('../src/', import.meta.url))
const domainManifest = fileURLToPath(new URL('../../packages/domain/package.json', import.meta.url))
const domainImport = /from '@sk\/domain(\/[\w-]+)?'/g
const compiledFile = /^\.\/dist\/.+\.js$/

// packages/domain compiles only the entries listed with an sk-compiled export (tsconfig.build.json). Production
// Node would run any other entry's .ts source, whose extensionless imports it cannot load.
describe('[E2.2] the API imports only compiled @sk/domain entries', () => {
  it('[E2.2] every @sk/domain import under api/src has an sk-compiled export', async () => {
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
