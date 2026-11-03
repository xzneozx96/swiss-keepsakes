import type { JSONContent } from '@tiptap/react'

import { storyBodySchema } from '@sk/api-contract'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '@tiptap/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { createStoryExtensions, storyEditorProps } from '@/features/stories/editor/extensions'
import { LinkForm } from '@/features/stories/editor/link-form'
import { applyPinLink, convertLinksToPin, removePinLink } from '@/features/stories/editor/pin-commands'
import { cleanBody } from '@/features/stories/lib/body'

const PIN = '0198a000-0000-7000-8000-000000000010'
const labels = { image: 'Photo', video: 'Video', audio: 'Recording' }
const link = (href: string) => [{ type: 'link', attrs: { href } }]
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]): JSONContent => ({ type: 'doc', content: content as JSONContent[] })

let editor: Editor | undefined

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
  vi.stubGlobal('ClipboardEvent', class extends Event {})
})

afterEach(() => {
  editor?.destroy()
  editor = undefined
})

function makeEditor(content: JSONContent) {
  editor = new Editor({ extensions: createStoryExtensions(labels), content, editorProps: storyEditorProps })

  return editor
}

/** The text offsets of `word` in the first paragraph, as document positions. */
function select(target: Editor, word: string) {
  let from = -1

  target.state.doc.descendants((node, pos) => {
    const at = node.isText && node.text ? node.text.indexOf(word) : -1

    if (at >= 0 && from < 0)
      from = pos + at
  })
  target.commands.setTextSelection({ from, to: from + word.length })
}

const marksOf = (target: Editor) => (target.getJSON().content![0]!.content as { text: string, marks?: { type: string, attrs?: object }[] }[])

describe('[E4.3][AC45] pin link commands', () => {
  it('[E4.3][AC45] AC-4 selecting "Zyt tower" and applying a pin gives the words a pinLink with the pin id and no link', () => {
    const target = makeEditor(doc(para(text('See the Zyt tower now'))))

    select(target, 'Zyt tower')
    applyPinLink(target, { id: PIN, name: 'Zyt tower' })
    const parts = marksOf(target)

    expect(parts.map(part => part.text)).toEqual(['See the ', 'Zyt tower', ' now'])
    expect(parts[1]!.marks).toEqual([{ type: 'pinLink', attrs: { pinId: PIN } }])
  })

  it('[E4.3][AC45] AC-4 with nothing selected the pin\'s name goes in at the cursor as pin-linked text', () => {
    const target = makeEditor(doc(para(text('Visit '))))

    target.commands.setTextSelection(7)
    applyPinLink(target, { id: PIN, name: 'Zyt tower' })
    const parts = marksOf(target)

    expect(parts.map(part => part.text).join('')).toBe('Visit Zyt tower')
    expect(parts.at(-1)!.marks).toEqual([{ type: 'pinLink', attrs: { pinId: PIN } }])
  })

  it('[E4.3][AC45] AC-4 a plain link under the selection is replaced by the pin link', () => {
    const target = makeEditor(doc(para(text('Go '), text('Zyt tower', link('https://zyt.example/a')))))

    select(target, 'Zyt tower')
    applyPinLink(target, { id: PIN, name: 'Zyt tower' })

    expect(marksOf(target)[1]!.marks).toEqual([{ type: 'pinLink', attrs: { pinId: PIN } }])
  })

  it('[E4.3][AC45] with the cursor inside a pin link, a new pin replaces that link\'s text and Remove drops the mark', () => {
    const target = makeEditor(doc(para(text('Go '), text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }]))))

    target.commands.setTextSelection(6)
    removePinLink(target)

    expect(marksOf(target).every(part => !part.marks)).toBe(true)
  })

  it('[E4.3][AC45] AC-5 convertLinksToPin turns every link to that address into a pin link in one undo step and returns the count', () => {
    const href = 'https://zyt.example/a'
    const target = makeEditor(doc(para(text('one', link(href)), text(' two ', undefined), text('three', link(href)), text(' four'), text('other', link('https://other.example')))))

    expect(convertLinksToPin(target, href, PIN)).toBe(2)
    const after = marksOf(target)

    expect(after.filter(part => part.marks?.[0]?.type === 'pinLink').map(part => part.text)).toEqual(['one', 'three'])
    expect(after.find(part => part.text === 'other')!.marks![0]!.type).toBe('link')
    target.commands.undo()
    expect(marksOf(target).filter(part => part.marks?.[0]?.type === 'link')).toHaveLength(3)
  })

  it('[E4.3][AC45] AC-5 conversion reads the live document: a link inserted a moment ago, before any hand-over, converts', () => {
    const target = makeEditor(doc(para(text('start '))))

    target.commands.setTextSelection(7)
    target.chain().insertContent({ type: 'text', text: 'fresh', marks: link('https://zyt.example/a') }).run()

    expect(convertLinksToPin(target, 'https://zyt.example/a', PIN)).toBe(1)
  })

  it('[E4.3][AC45] the link form applied over a pin link leaves only the link', async () => {
    const target = makeEditor(doc(para(text('Go '), text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }]))))

    select(target, 'Zyt tower')
    render(
      <LocaleProvider>
        <LinkForm current="" editor={target} onDone={() => {}} />
      </LocaleProvider>,
    )
    const field = screen.getByRole('textbox')

    await userEvent.clear(field)
    await userEvent.type(field, 'https://example.org')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const marks = marksOf(target)[1]!.marks!

    expect(marks.map(mark => mark.type)).toEqual(['link'])
  })

  it('[E4.3][AC45] a cleaned body of the result parses with storyBodySchema', () => {
    const target = makeEditor(doc(para(text('See the Zyt tower now'))))

    select(target, 'Zyt tower')
    applyPinLink(target, { id: PIN, name: 'Zyt tower' })

    expect(storyBodySchema.safeParse(cleanBody(target.getJSON() as never)).success).toBe(true)
  })
})
