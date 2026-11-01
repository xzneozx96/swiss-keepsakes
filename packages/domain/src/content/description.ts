import type { ContentLanguage } from './localized.ts'

/** The part of a Tiptap node the description rules read. A story body node and the editor's JSON both fit it. */
export interface DescriptionNode {
  type?: string
  attrs?: Record<string, unknown>
  marks?: unknown[]
  text?: string
  content?: DescriptionNode[]
}

/** The description of a keepsake: one document per language (DESC-rich, owner 2026-11-01). */
export type LocalizedDescription = Partial<Record<ContentLanguage, DescriptionNode & { type: 'doc' }>>

const SPLIT_PARAGRAPHS = /\n\s*\n/

/** The text a guest reads, in order. A hard break and a paragraph boundary add nothing. */
export function descriptionText(node: DescriptionNode | undefined): string {
  if (!node)
    return ''
  if (node.type === 'text')
    return node.text ?? ''

  return (node.content ?? []).map(descriptionText).join('')
}

/** The limit of 1200 characters counts this. */
export function descriptionLength(node: DescriptionNode | undefined): number {
  return descriptionText(node).length
}

/** No text, or only blanks: Tiptap's empty document (one empty paragraph) is empty. */
export function isEmptyDescription(node: DescriptionNode | undefined): boolean {
  return descriptionText(node).trim() === ''
}

/** The languages whose description has text, in en, de order. */
export function descriptionLanguages(text: LocalizedDescription | null | undefined): ContentLanguage[] {
  return (['en', 'de'] as const).filter(language => !isEmptyDescription(text?.[language]))
}

/**
 * Plain text as a description: a blank line starts a paragraph, a single newline is a hard break, each line is
 * trimmed. Migration 0014 applies the same rule to the plain texts already stored. Undefined when no line has text.
 */
export function descriptionFromPlain(text: string): { type: 'doc', content: DescriptionNode[] } | undefined {
  const content = text.replace(/\r\n/g, '\n').split(SPLIT_PARAGRAPHS).flatMap((piece): DescriptionNode[] => {
    const lines = piece.split('\n').map(line => line.trim()).filter(line => line !== '')

    if (lines.length === 0)
      return []

    return [{
      type: 'paragraph',
      content: lines.flatMap((line, index): DescriptionNode[] => [...(index === 0 ? [] : [{ type: 'hardBreak' }]), { type: 'text', text: line }]),
    }]
  })

  return content.length > 0 ? { type: 'doc', content } : undefined
}
