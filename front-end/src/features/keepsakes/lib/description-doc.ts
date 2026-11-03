import type { ProductSaveBody } from '@sk/api-contract'
import type { Language, RichNode } from '@sk/domain/shared'

import { descriptionFromPlain, descriptionLength } from '@sk/domain/content'
import { safeHref } from '@sk/domain/shared'
import { hasDescription, LANGUAGES, TEXT_MAX } from './keepsake-rules'

/**
 * The API stores a description with exactly the keys it allows (the contract's strict objects), while Tiptap's JSON adds
 * more: a link carries target, rel and class, a numbered list its start. This keeps the nodes and marks of the
 * description's allow-list and only the attributes the contract names, so what the editor made is what the API accepts.
 */
function cleanMarks(marks: RichNode['marks']): RichNode['marks'] {
  const kept = (marks ?? []).flatMap((mark) => {
    if (mark.type === 'bold' || mark.type === 'italic')
      return [{ type: mark.type }]
    const href = mark.type === 'link' ? safeHref(mark.attrs?.href) : undefined

    return href ? [{ type: 'link', attrs: { href } }] : []
  })

  return kept.length > 0 ? kept : undefined
}

function cleanNode(node: RichNode): RichNode[] {
  switch (node.type) {
    case 'text': {
      const marks = cleanMarks(node.marks)

      return node.text ? [{ type: 'text', text: node.text, ...(marks && { marks }) }] : []
    }
    case 'hardBreak':
      return [{ type: 'hardBreak' }]
    case 'paragraph':
    case 'bulletList':
    case 'orderedList':
    case 'listItem': {
      const content = (node.content ?? []).flatMap(cleanNode)

      return [{ type: node.type, ...(content.length > 0 || node.type !== 'paragraph' ? { content } : {}) }]
    }
    default:
      return []
  }
}

export function cleanDescription(doc: RichNode): RichNode {
  return { type: 'doc', content: (doc.content ?? []).flatMap(cleanNode) }
}

/** The languages that have words, as the body of a save: nothing for a language with no text. */
export function descriptionsBody(text: Record<Language, RichNode | undefined>): NonNullable<ProductSaveBody['text']> {
  // cleanDescription keeps only what the contract's schema allows, which its loose RichNode type cannot say.
  return Object.fromEntries(LANGUAGES.flatMap(language => (hasDescription(text[language]) ? [[language, cleanDescription(text[language]!)]] : []))) as NonNullable<ProductSaveBody['text']>
}

/** True when a language holds more than 1200 characters of text: the API refuses it, so it is not sent. */
export function isTooLong(text: Record<Language, RichNode | undefined>): boolean {
  return LANGUAGES.some(language => descriptionLength(text[language]) > TEXT_MAX)
}

/**
 * A description kept in the browser: a document, or a string from before descriptions were rich text (a half-typed new
 * keepsake survives the change as paragraphs).
 */
export function storedDescription(value: unknown): RichNode | undefined {
  if (typeof value === 'string')
    return descriptionFromPlain(value)

  return typeof value === 'object' && value !== null && (value as RichNode).type === 'doc' ? (value as RichNode) : undefined
}
