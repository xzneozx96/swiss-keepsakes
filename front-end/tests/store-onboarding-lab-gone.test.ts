import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.name === 'node_modules' ? [] : entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}

describe('the store onboarding lab page is gone [E2.16][E2.3]', () => {
  it('aC-8: leaves no lab route, no store-onboarding lab file and no lab test for it', () => {
    const named = [...files(join(ROOT, 'src')), ...files(join(ROOT, 'tests'))]
      .map(file => relative(ROOT, file))
      .filter(file => /store-onboarding-(?!lab-gone|steps)/.test(file) || /lab[./]store-onboarding/.test(file))

    expect(named).toEqual([])
    expect(readFileSync(join(ROOT, 'src/routeTree.gen.ts'), 'utf8')).not.toMatch(/lab\/store-onboarding|LabStoreOnboarding/i)
  })
})
