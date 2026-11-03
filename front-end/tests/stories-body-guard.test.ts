import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const FEATURE = join(__dirname, '..', 'src', 'features', 'stories')
const DOMAIN = join(__dirname, '..', '..', 'packages', 'domain', 'src', 'content')

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sources(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [])
}

/** The `from '...'` and `import('...')` specifiers of a file, with whether the statement is a type import. */
function imports(text: string) {
  const found: { specifier: string, type: boolean }[] = []

  for (const match of text.matchAll(/\bimport\b([^'";]+)\bfrom\s*'([^']+)'/g))
    found.push({ specifier: match[2]!, type: match[1]!.trimStart().startsWith('type ') })
  for (const match of text.matchAll(/\bimport\s*'([^']+)'/g))
    found.push({ specifier: match[1]!, type: false })
  for (const match of text.matchAll(/import\(\s*'([^']+)'/g))
    found.push({ specifier: match[1]!, type: false })

  return found
}

const tiptap = (specifier: string) => specifier.startsWith('@tiptap/') || specifier.startsWith('prosemirror')
const read = (file: string) => readFileSync(file, 'utf8')

describe('[E4.3][AC45] the editor library loads lazily', () => {
  it('[E4.3][AC45] AC-6 the guard finds a value import and ignores a type import', () => {
    expect(imports('import type { Editor } from \'@tiptap/react\'\nimport { a } from \'./a\'')).toEqual([{ specifier: '@tiptap/react', type: true }, { specifier: './a', type: false }])
    expect(imports('const E = lazy(() => import(\'../editor/x\'))')).toEqual([{ specifier: '../editor/x', type: false }])
  })

  it('[E4.3][AC45] AC-6 no file under features/stories outside editor/ imports @tiptap/* as a value (type imports are allowed)', () => {
    const offenders = sources(FEATURE)
      .filter(file => !relative(FEATURE, file).startsWith('editor/'))
      .flatMap(file => imports(read(file)).filter(item => tiptap(item.specifier) && !item.type).map(item => `${relative(FEATURE, file)}: ${item.specifier}`))

    expect(offenders).toEqual([])
  })

  it('[E4.3][AC45] AC-6 lib/ and hooks/ import nothing from ../editor/, and body.ts, paste.ts, link-input.ts, facts-line.ts and @sk/domain/content pull in no Tiptap', () => {
    const inner = sources(FEATURE).filter(file => /^(?:lib|hooks)\//.test(relative(FEATURE, file)))

    expect(inner.flatMap(file => imports(read(file)).filter(item => item.specifier.includes('editor/')).map(item => `${relative(FEATURE, file)}: ${item.specifier}`))).toEqual([])
    for (const name of ['body.ts', 'paste.ts', 'link-input.ts', 'facts-line.ts'])
      expect(imports(read(join(FEATURE, 'lib', name))).filter(item => tiptap(item.specifier))).toEqual([])
    expect(sources(DOMAIN).flatMap(file => imports(read(file)).filter(item => tiptap(item.specifier)))).toEqual([])
  })

  it('[E4.3][AC45] AC-6 the only reference to editor/story-body-editor is the dynamic import inside lazy() in story-body-card.tsx', () => {
    const references = sources(join(__dirname, '..', 'src'))
      .filter(file => !!relative(join(FEATURE, 'editor'), file).startsWith('..'))
      .flatMap(file => (read(file).includes('story-body-editor') ? [relative(FEATURE, file)] : []))

    expect(references).toEqual(['components/story-body-card.tsx'])
    expect(read(join(FEATURE, 'components', 'story-body-card.tsx'))).toMatch(/lazy\(\s*\(\)\s*=>\s*import\('\.\.\/editor\/story-body-editor'\)\s*\)/)
  })
})
