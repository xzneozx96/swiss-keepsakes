import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const ALLOWED = ['components/', 'features/lab/', 'dormant/']
const TABS_IMPORT = /import\s*(?:type\s*)?\{[^}]*\bTabs\b[^}]*\}\s*from\s*['"]@heroui\/react['"]/

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
}

describe('tabs guard', () => {
  it('only src/components, the lab and dormant code import Tabs from @heroui/react', () => {
    const offenders = sources(SRC)
      .map(file => relative(SRC, file))
      .filter(file => !ALLOWED.some(prefix => file.startsWith(prefix)))
      .filter(file => TABS_IMPORT.test(readFileSync(join(SRC, file), 'utf8')))

    expect(offenders, 'Use RouteTabs, PageTabs or DetailTabs from src/components instead of HeroUI Tabs').toEqual([])
  })
})
