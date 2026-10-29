import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const SCANNED = ['features/', 'routes/']
const SKIPPED = ['features/lab/']
// A generic block: a Skeleton that is full width, has the large card radius and a fixed height.
const SKELETON = /<Skeleton\b[^>]*>/g
function isGenericBlock(tag: string) {
  return /(?<![\w-])w-full(?![\w-])/.test(tag) && /(?<![\w-])rounded-3xl(?![\w-])/.test(tag) && /(?<![\w-])h-\d+(?![\w-])/.test(tag)
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
}

describe('skeleton guard', () => {
  it('detects a generic block and ignores shaped skeletons', () => {
    expect(isGenericBlock('<Skeleton className="h-40 w-full rounded-3xl" />')).toBe(true)
    expect(isGenericBlock('<Skeleton className="h-5 w-48 rounded-lg" />')).toBe(false)
    expect(isGenericBlock('<Skeleton className="h-11 w-full rounded-xl" />')).toBe(false)
  })

  it('no feature or route renders a generic w-full rounded-3xl Skeleton block', () => {
    const offenders = sources(SRC)
      .map(file => relative(SRC, file))
      .filter(file => SCANNED.some(prefix => file.startsWith(prefix)))
      .filter(file => !SKIPPED.some(prefix => file.startsWith(prefix)))
      .filter(file => (readFileSync(join(SRC, file), 'utf8').match(SKELETON) ?? []).some(isGenericBlock))

    expect(
      offenders,
      'Shape the skeleton like the real rows or cards (see "Reuse shared UI and match loading layouts" in docs/development-rules/frontend/heroui-and-styling.md)',
    ).toEqual([])
  })
})
