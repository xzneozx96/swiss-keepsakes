import type { Editor } from '@tiptap/react'
import type { MediaNodeInput } from '../lib/media-block'

import { NodeSelection } from '@tiptap/pm/state'

import { countMediaNodes, MEDIA_LIMIT } from '../lib/media-block'

/** The media blocks in the live document. The limit reads this, never the body the page holds, which is up to 300 ms behind typing. */
export function liveMediaCount(editor: Editor): number {
  return countMediaNodes(editor.getJSON())
}

/**
 * Puts a photo, video or recording at the top level, never inside a quote or a list: after a selected block; in place of an empty
 * paragraph; otherwise after the top-level block that holds the cursor. Returns false and changes nothing at the limit (the count
 * is read from the live document at press time, so two quick presses at 99 end at 100).
 */
export function insertMediaBlock(editor: Editor, node: MediaNodeInput): boolean {
  if (liveMediaCount(editor) >= MEDIA_LIMIT)
    return false
  const { selection } = editor.state
  const { $from } = selection

  if (selection instanceof NodeSelection) {
    editor.chain().focus().insertContentAt(selection.to, node).run()
  }
  else if ($from.depth === 0) {
    editor.chain().focus().insertContentAt(selection.from, node).run()
  }
  else if ($from.depth === 1 && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0) {
    editor.chain().focus().insertContentAt({ from: $from.before(1), to: $from.after(1) }, node).run()
  }
  else {
    editor.chain().focus().insertContentAt($from.after(1), node).run()
  }

  return true
}

/** Swaps the top-level block that starts at `pos` with the one before (-1) or after (1) it, in one undo step. False at the ends. */
export function moveMediaBlock(editor: Editor, pos: number, direction: -1 | 1): boolean {
  const { doc, tr } = editor.state
  const node = doc.nodeAt(pos)
  const index = doc.resolve(pos).index(0)
  const sibling = node ? doc.maybeChild(index + direction) : null

  if (!node || !sibling)
    return false
  const target = direction === -1 ? pos - sibling.nodeSize : pos + sibling.nodeSize

  tr.delete(pos, pos + node.nodeSize).insert(target, node)
  tr.setSelection(NodeSelection.create(tr.doc, target))
  editor.view.dispatch(tr)

  return true
}
