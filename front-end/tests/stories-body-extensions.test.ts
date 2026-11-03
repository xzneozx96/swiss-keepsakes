import type { JSONContent } from '@tiptap/react'
import { storyBodySchema } from '@sk/api-contract'
import { BODY_MARK_TYPES, BODY_NODE_TYPES } from '@sk/domain/content'

import { Editor } from '@tiptap/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createStoryExtensions, storyEditorProps } from '@/features/stories/editor/extensions'
import { cleanBody } from '@/features/stories/lib/body'

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const labels = { image: 'Photo', video: 'Video', audio: 'Recording' }
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', ...(content.length > 0 && { content }) })
const doc = (...content: unknown[]): JSONContent => ({ type: 'doc', content: content as JSONContent[] })
const listOf = (type: string, ...items: unknown[]) => ({ type, content: items.map(item => ({ type: 'listItem', content: [item] })) })

let editor: Editor | undefined

beforeAll(() => {
  // ProseMirror measures the selection and a paste; jsdom has no layout and no ClipboardEvent.
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

function makeEditor(content?: unknown, options: { onUpdate?: () => void } = {}) {
  editor = new Editor({ extensions: createStoryExtensions(labels), content: content as never, editorProps: storyEditorProps, ...options })

  return editor
}

const clean = (e: Editor) => cleanBody(e.getJSON())
const parses = (body: unknown) => storyBodySchema.safeParse(body).success

function pasteHtml(e: Editor, html: string) {
  e.view.pasteHTML(html, new ClipboardEvent('paste'))
}

/** Types the way a keyboard does: the input rules see each character first. */
function type(e: Editor, characters: string) {
  for (const character of characters) {
    const { from, to } = e.state.selection
    const handled = e.view.someProp('handleTextInput', handler => handler(e.view, from, to, character, () => e.state.tr.insertText(character, from, to)))

    if (!handled)
      e.view.dispatch(e.state.tr.insertText(character, from, to))
  }
}

function press(e: Editor, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

  return e.view.someProp('handleKeyDown', handler => handler(e.view, event)) ?? false
}

/** The names of the node types in a body, deep. */
function typesIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach(item => typesIn(item, found))
  }
  else if (typeof value === 'object' && value !== null) {
    const { type, content } = value as { type?: string, content?: unknown }

    if (type)
      found.add(type)
    typesIn(content, found)
  }

  return found
}

describe('[E4.3][AC30][AC45] the editor extensions', () => {
  it('[E4.3][AC30] AC-2 the schema\'s nodes are doc plus BODY_NODE_TYPES and its marks are BODY_MARK_TYPES, exactly', () => {
    const { schema } = makeEditor()

    expect(Object.keys(schema.nodes).sort()).toEqual(['doc', ...BODY_NODE_TYPES].sort())
    expect(Object.keys(schema.marks).sort()).toEqual([...BODY_MARK_TYPES].sort())
  })

  it('[E4.3][AC30] AC-2 every extension name is a node, a mark, or one of undoRedo, dropcursor, gapcursor, listKeymap', () => {
    const e = makeEditor()
    // Tiptap's own plumbing extensions (editable, keymap, paste, ...) and the StarterKit wrapper are not content.
    const plumbing = ['editable', 'clipboardTextSerializer', 'commands', 'focusEvents', 'keymap', 'tabindex', 'drop', 'paste', 'delete', 'textDirection', 'starterKit']
    const known = new Set([...Object.keys(e.schema.nodes), ...Object.keys(e.schema.marks), ...plumbing, 'undoRedo', 'dropCursor', 'gapCursor', 'listKeymap'])

    expect(e.extensionManager.extensions.map(extension => extension.name).filter(name => !known.has(name))).toEqual([])
  })

  it('[E4.3][AC30] AC-2 paste outline through view.pasteHTML', () => {
    const e = makeEditor()

    pasteHtml(e, '<h1>One</h1><h4>Four</h4>')
    pasteHtml(e, '<p><code>c</code> <s>s</s> <u>u</u></p>')
    pasteHtml(e, '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>')
    pasteHtml(e, '<p><a href="javascript:alert(1)">bad</a> <a href="https://example.org">ok</a></p>')

    const body = clean(e)
    const json = JSON.stringify(body)

    expect(json).not.toMatch(/"level":\s*[14]/)
    for (const banned of ['code', 'strike', 'underline', 'table', 'heading'])
      expect(json).not.toContain(`"type":"${banned}"`)
    for (const word of ['One', 'Four', 'A B', 'C D', 'bad', 'ok'])
      expect(json).toContain(word)
    expect(json).not.toContain('javascript')
    expect(json.match(/"type":"link"/g)).toHaveLength(1)
    expect(json).toContain('"href":"https://example.org"')
    expect(parses(body)).toBe(true)
  })

  it('[E4.3][AC45] AC-1 a body with bold text, a link, an H2, a quote, a bullet list and two paragraphs goes through Editor, getJSON and cleanBody deep-equal and parses with storyBodySchema', () => {
    const body = doc(
      para(text('one '), text('bold', [{ type: 'bold' }]), text(' and '), text('link', [{ type: 'link', attrs: { href: 'https://example.org' } }])),
      { type: 'heading', attrs: { level: 2 }, content: [text('Head')] },
      { type: 'blockquote', content: [para(text('quoted'))] },
      listOf('bulletList', para(text('a')), para(text('b'))),
      para(text('two')),
    )

    expect(clean(makeEditor(body))).toEqual(body)
    expect(parses(body)).toBe(true)
  })

  it('[E4.3][AC45] Review Focus 2: a body that ends in a list, one that ends in a quote and one that ends in an image, a video, an audio and a pinLink text come back unchanged and the editor fires no update on creation', () => {
    const bodies = [
      doc(para(text('x')), listOf('bulletList', para(text('a')))),
      doc(para(text('x')), { type: 'blockquote', content: [para(text('q'))] }),
      doc(
        para(text('x')),
        { type: 'image', attrs: { mediaId: ID, alt: 'a', caption: 'c' } },
        { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 't', caption: '' } },
        { type: 'audio', attrs: { mediaId: ID, title: 't', caption: '' } },
        para(text('pin', [{ type: 'pinLink', attrs: { pinId: ID } }])),
        { type: 'image', attrs: { mediaId: ID, alt: '', caption: '' } },
      ),
    ]

    for (const body of bodies) {
      const onUpdate = vi.fn()

      expect(clean(makeEditor(body, { onUpdate }))).toEqual(body)
      expect(onUpdate).not.toHaveBeenCalled()
      editor?.destroy()
    }
  })

  it('[E4.3][AC30] Review Focus 3: a heading, a quote or a list cannot be put in a quote; a heading or a quote cannot be put in a list item; a nested list can', () => {
    // Each action on its own editor: whatever it does, the body keeps the contract's shape (a quote of paragraphs, a list item of paragraphs and lists).
    const inQuote = doc({ type: 'blockquote', content: [para(text('q'))] })
    const inItem = doc(listOf('bulletList', para(text('i'))))
    const actions: [unknown, number, (e: Editor) => void][] = [
      [inQuote, 3, e => e.commands.toggleHeading({ level: 2 })],
      [inQuote, 3, e => e.commands.toggleBlockquote()],
      [inQuote, 3, e => e.commands.toggleBulletList()],
      [inQuote, 3, e => type(e, '## ')],
      [inQuote, 3, e => type(e, '> ')],
      [inItem, 4, e => e.commands.toggleHeading({ level: 2 })],
      [inItem, 4, e => e.commands.toggleBlockquote()],
      [inItem, 4, e => type(e, '> ')],
      [inItem, 4, e => type(e, '## ')],
    ]

    for (const [content, position, act] of actions) {
      const e = makeEditor(content)

      e.commands.setTextSelection(position)
      act(e)
      expect(parses(clean(e))).toBe(true)
      expect(JSON.stringify(e.getJSON())).not.toMatch(/"blockquote","content":\[\{"type":"(?:heading|bulletList|orderedList|blockquote)"/)
      expect(JSON.stringify(e.getJSON())).not.toMatch(/"listItem","content":\[\{"type":"(?:heading|blockquote)"/)
      e.destroy()
    }

    // Typing the rules at the top level still works, and paste cannot nest.
    const top = makeEditor(doc(para()))

    top.commands.focus('end')
    type(top, '## Head')
    expect(clean(top).content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
    top.commands.setContent(doc(para()))
    top.commands.focus('end')
    type(top, '> ')
    expect(clean(top).content[0]).toMatchObject({ type: 'blockquote' })
    top.commands.setContent(doc(para()))
    pasteHtml(top, '<blockquote><h2>x</h2><ul><li>y</li></ul><blockquote><p>z</p></blockquote></blockquote><ul><li><h2>h</h2><blockquote><p>b</p></blockquote></li></ul>')
    expect(parses(clean(top))).toBe(true)
    expect(JSON.stringify(clean(top))).toContain('"x"')

    // A nested list is allowed.
    const nested = doc({ type: 'bulletList', content: [{ type: 'listItem', content: [para(text('a')), listOf('orderedList', para(text('b')))] }] })

    expect(clean(makeEditor(nested))).toEqual(nested)
  })

  it('[E4.3][AC45] Enter splits a list item, Tab nests it, Shift-Tab lifts it, and Backspace at the start of an empty item leaves the list', () => {
    const e = makeEditor(doc(listOf('bulletList', para(text('a')), para(text('b')))))

    e.commands.setTextSelection(3)
    expect(press(e, 'Enter')).toBe(true)
    expect((clean(e).content[0] as { content: unknown[] }).content).toHaveLength(3)

    // The caret is in the new empty item; Tab sinks it under "a".
    expect(press(e, 'Tab')).toBe(true)
    expect(JSON.stringify(clean(e))).toContain('"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"')
    expect(parses(clean(e))).toBe(true)
    expect(typesIn(clean(e).content[0]).has('listItem')).toBe(true)

    expect(press(e, 'Tab', { shiftKey: true })).toBe(true)
    expect((clean(e).content[0] as { content: unknown[] }).content).toHaveLength(3)

    // Backspace in an empty item leaves the list: the list ends with "a" and "b" and the empty paragraph follows.
    expect(press(e, 'Backspace')).toBe(true)
    expect(clean(e).content.map(node => node.type)).toContain('paragraph')
    expect(parses(clean(e))).toBe(true)
  })

  it('[E4.3][AC30] an ordered list loaded from the server (no attrs) and edited still parses after cleanBody', () => {
    const body = doc(listOf('orderedList', para(text('one')), para(text('two'))))
    const e = makeEditor(body)

    e.commands.focus('end')
    type(e, '!')
    expect(JSON.stringify(e.getJSON())).toContain('"start"')
    expect(parses(clean(e))).toBe(true)
    expect(JSON.stringify(clean(e))).toContain('two!')
  })
})
