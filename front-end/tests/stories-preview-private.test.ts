import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)

    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

describe('[E4.3][AC45] the story preview stays inside the signed-in editor', () => {
  it('no guest route and no guest content file imports the stories feature', () => {
    // features/content/merchant is the merchant side of ADR-003; the rest of features/content is what guests load.
    const guestFiles = [...filesUnder(join(__dirname, '..', 'src', 'routes', '_guest')), ...filesUnder(join(__dirname, '..', 'src', 'features', 'content')).filter(path => !path.includes('/merchant/'))].filter(path => /\.(?:ts|tsx)$/.test(path))

    expect(guestFiles.length).toBeGreaterThan(0)
    expect(guestFiles.filter(path => /from\s+['"][^'"]*features\/stories/.test(readFileSync(path, 'utf8')))).toEqual([])
  })
})
