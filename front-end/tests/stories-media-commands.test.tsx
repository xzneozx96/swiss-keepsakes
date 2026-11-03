import type { JSONContent } from '@tiptap/react'

import { storyBodySchema } from '@sk/api-contract'
import { NodeSelection } from '@tiptap/pm/state'
import { Editor } from '@tiptap/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createStoryExtensions, storyEditorProps } from '@/features/stories/editor/extensions'
import { insertMediaBlock, liveMediaCount, moveMediaBlock } from '@/features/stories/editor/media-commands'
import { cleanBody } from '@/features/stories/lib/body'
import { imageNode, MEDIA_LIMIT, videoNode } from '@/features/stories/lib/media-block'

const ID = '0198a000-0000-7000-8000-000000000010'
const labels = { image: 'Photo', video: 'Video', audio: 'Recording' }
const text = (value: string) => ({ type: 'text', text: value })
const para = (...content: unknown[]) => ({ type: 'paragraph', ...(content.length > 0 && { content }) })
const doc = (...content: unknown[]): JSONContent => ({ type: 'doc', content: content as JSONContent[] })
const photo = imageNode({ id: ID, alt: { en: 'Wall' } }, 'en')
const image = { type: 'image', attrs: { mediaId: ID, alt: '', caption: '' } }

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

const types = (target: Editor) => (target.getJSON().content ?? []).map(node => node.type)
/** The document position just inside the first text node that holds `word`. */
function cursorIn(target: Editor, word: string) {
  let found = -1

  target.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text?.includes(word))
      found = pos + 1
  })
  target.commands.setTextSelection(found)
}

describe('[E4.3][AC45] media block commands', () => {
  it('[E4.3][AC45] AC-1 a photo inserted with the cursor in the first of two paragraphs lands between them, and the cleaned body parses with storyBodySchema', () => {
    const target = makeEditor(doc(para(text('first')), para(text('second'))))

    cursorIn(target, 'first')
    expect(insertMediaBlock(target, photo)).toBe(true)
    expect(types(target)).toEqual(['paragraph', 'image', 'paragraph'])
    expect(target.getJSON().content![1]!.attrs).toMatchObject({ mediaId: ID, alt: 'Wall', caption: '' })
    expect(storyBodySchema.safeParse(cleanBody(target.getJSON() as never)).success).toBe(true)
  })

  it('[E4.3][AC45] on an empty line the block takes its place', () => {
    const target = makeEditor(doc(para(text('first')), para(), para(text('last'))))

    target.commands.setTextSelection(target.state.doc.child(0).nodeSize + 1)
    insertMediaBlock(target, photo)
    expect(types(target)).toEqual(['paragraph', 'image', 'paragraph'])
  })

  it('[E4.3][AC45] in the middle of a quote, a list item, at the very start and in an empty document it lands at the top level', () => {
    const quote = makeEditor(doc({ type: 'blockquote', content: [para(text('quoted words'))] }, para(text('after'))))

    cursorIn(quote, 'quoted')
    insertMediaBlock(quote, photo)
    expect(types(quote)).toEqual(['blockquote', 'image', 'paragraph'])
    quote.destroy()

    const list = makeEditor(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [para(text('item one'))] }] }, para(text('after'))))

    cursorIn(list, 'item')
    insertMediaBlock(list, photo)
    expect(types(list)).toEqual(['bulletList', 'image', 'paragraph'])
    list.destroy()

    const start = makeEditor(doc(para(text('only'))))

    start.commands.setTextSelection(1)
    insertMediaBlock(start, photo)
    expect(types(start)).toEqual(['paragraph', 'image'])
    start.destroy()

    const blank = makeEditor(doc(para()))

    insertMediaBlock(blank, photo)
    expect(types(blank)).toEqual(['image'])
  })

  it('[E4.3][AC45] with a photo block selected the next block goes after it', () => {
    const target = makeEditor(doc(para(text('first')), image, para(text('last'))))

    target.view.dispatch(target.state.tr.setSelection(NodeSelection.create(target.state.doc, target.state.doc.child(0).nodeSize)))
    insertMediaBlock(target, videoNode('dQw4w9WgXcQ', 'Bells'))
    expect(types(target)).toEqual(['paragraph', 'image', 'video', 'paragraph'])
  })

  it('[E4.3][AC45] AC-6 at 100 media nothing is added and false comes back', () => {
    const target = makeEditor(doc(para(text('x')), ...Array.from({ length: MEDIA_LIMIT }, () => image)))

    expect(liveMediaCount(target)).toBe(100)
    expect(insertMediaBlock(target, photo)).toBe(false)
    expect(liveMediaCount(target)).toBe(100)
  })

  it('[E4.3][AC45] two inserts at 99 end at 100 (the second returns false)', () => {
    const target = makeEditor(doc(para(text('x')), ...Array.from({ length: MEDIA_LIMIT - 1 }, () => image)))

    cursorIn(target, 'x')
    expect(insertMediaBlock(target, photo)).toBe(true)
    expect(insertMediaBlock(target, photo)).toBe(false)
    expect(liveMediaCount(target)).toBe(100)
  })

  it('[E4.3][AC45] moving a block up or down swaps it with its neighbour, is one undo step, and does nothing at the ends', () => {
    const target = makeEditor(doc(para(text('first')), image, para(text('last'))))
    const at = target.state.doc.child(0).nodeSize

    expect(moveMediaBlock(target, at, 1)).toBe(true)
    expect(types(target)).toEqual(['paragraph', 'paragraph', 'image'])
    expect(moveMediaBlock(target, target.state.doc.child(0).nodeSize + target.state.doc.child(1).nodeSize, 1)).toBe(false)
    target.commands.undo()
    expect(types(target)).toEqual(['paragraph', 'image', 'paragraph'])
    expect(moveMediaBlock(target, at, -1)).toBe(true)
    expect(types(target)).toEqual(['image', 'paragraph', 'paragraph'])
    expect(moveMediaBlock(target, 0, -1)).toBe(false)
  })
})
