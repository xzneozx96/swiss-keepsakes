import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const SHARED = 'components/choice-card.ts'
const ALLOWED = ['features/lab/']
const OWN_COPY = /\b(?:const|let|var|function)\s+choiceCard\b/
const OLD_COPY = /border-separator p-3 data-\[selected=true\]:border-foreground/

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
}

const outside = sources(SRC)
  .map(file => relative(SRC, file))
  .filter(file => file !== SHARED && !ALLOWED.some(prefix => file.startsWith(prefix)))
const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

describe('choice card guard', () => {
  it('no screen outside the lab defines its own choiceCard', () => {
    expect(outside.filter(file => OWN_COPY.test(read(file))), 'Import choiceCard from @/components/choice-card instead').toEqual([])
  })

  it('no screen outside the lab keeps a copy of the black-border card class', () => {
    expect(outside.filter(file => OLD_COPY.test(read(file))), 'The selected card has the red accent border: use choiceCard from @/components/choice-card').toEqual([])
  })

  it('the shared choiceCard turns the border to the accent red when selected', () => {
    const shared = read(SHARED)

    expect(shared).toContain('data-[selected=true]:border-accent')
    expect(shared).not.toContain('border-foreground')
  })
})
