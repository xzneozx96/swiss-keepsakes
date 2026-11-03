import type { Editor } from '@tiptap/react'

/**
 * Link the selected words to a pin: the words keep their text, lose a plain link they had, and carry the pin's id (ADR-011).
 * With nothing selected on a link or a pin link, that whole link takes the pin's name; elsewhere the name goes in at the cursor.
 */
export function applyPinLink(editor: Editor, pin: { id: string, name: string }): void {
  const attrs = { pinId: pin.id }
  const chain = editor.chain().focus()

  if (!editor.state.selection.empty) {
    chain.unsetMark('link').setMark('pinLink', attrs).run()

    return
  }
  if (editor.isActive('pinLink'))
    chain.extendMarkRange('pinLink')
  else if (editor.isActive('link'))
    chain.extendMarkRange('link')
  chain.insertContent({ type: 'text', text: pin.name, marks: [{ type: 'pinLink', attrs }] }).run()
}

export function removePinLink(editor: Editor): void {
  editor.chain().focus().extendMarkRange('pinLink').unsetMark('pinLink').run()
}

/**
 * Turns every plain link to `href` into a pin link, in one transaction (one undo step). It walks the live document, not the
 * body the page holds, which is up to 300 ms behind typing. Returns how many text pieces changed.
 */
export function convertLinksToPin(editor: Editor, href: string, pinId: string): number {
  const { doc, schema, tr } = editor.state
  const { link, pinLink } = schema.marks
  let changed = 0

  doc.descendants((node, pos) => {
    if (!node.isText || !link || !pinLink || !node.marks.some(mark => mark.type === link && mark.attrs.href === href))
      return
    tr.removeMark(pos, pos + node.nodeSize, link).addMark(pos, pos + node.nodeSize, pinLink.create({ pinId }))
    changed += 1
  })
  if (changed > 0)
    editor.view.dispatch(tr)

  return changed
}
