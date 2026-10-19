import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const globs = [...readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8').matchAll(/^\s+- (\S+)\s*$/gm)].map(m => m[1])

function members() {
  return globs.flatMap((glob) => {
    if (!glob.endsWith('/*')) return [glob]
    const parent = glob.slice(0, -2)
    return readdirSync(join(root, parent), { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name !== 'node_modules')
      .map(entry => `${parent}/${entry.name}`)
  })
}

describe('[E1.1] pnpm workspace root', () => {
  it('[E1.1] lists front-end, api and the packages folder', () => {
    expect(globs).toEqual(expect.arrayContaining(['front-end', 'api', 'packages/*']))
  })

  it('[E1.1] every listed member is a package with a name', () => {
    for (const member of members()) {
      const file = join(root, member, 'package.json')
      expect(existsSync(file), `${member} has no package.json`).toBe(true)
      expect(JSON.parse(readFileSync(file, 'utf8')).name, `${member} has no name`).toBeTruthy()
    }
  })

  it('[E1.1] the root runs build, typecheck and test for every member', () => {
    expect(manifest.scripts.build).toContain('pnpm -r')
    expect(manifest.scripts.typecheck).toContain('pnpm -r')
    expect(manifest.scripts.test).toContain('vitest')
  })
})
