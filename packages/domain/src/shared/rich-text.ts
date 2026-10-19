import type { Language } from './language'

const BLANK_LINE = /\n{2,}/
const SAFE_LINK_SCHEME = /^(?:https?:\/\/|mailto:)/i

/**
 * A rich-text document as Tiptap (ProseMirror) JSON: the long story behind a gift or tour
 * (owner, 15.10.2026). Stored as JSON, not HTML, so guests' screens render it from a fixed
 * list of nodes and marks without innerHTML or a sanitizer, and photos keep their slug (or
 * an uploaded data URL) instead of a hashed asset URL.
 */
export interface RichNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: RichNode[]
  marks?: { type: string, attrs?: Record<string, unknown> }[]
  text?: string
}

export type LocalizedRich = Partial<Record<Language, RichNode>>

const UPLOAD = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

/** An uploaded photo, kept in demo data as a data URL (M12/M13). */
export const isUploadedPhoto = (value: string) => UPLOAD.test(value)

/** Only web and mail links are kept, in the editor and on guests' screens. */
export function safeHref(href: unknown): string | undefined {
  if (typeof href !== 'string')
    return undefined
  const value = href.trim()

  return SAFE_LINK_SCHEME.test(value) ? value : undefined
}

export function richDoc(content: RichNode[]): RichNode {
  return {
    type: 'doc',
    content,
  }
}
export function richParagraph(text: string): RichNode {
  return {
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  }
}
export function richHeading(text: string): RichNode {
  return {
    type: 'heading',
    attrs: { level: 3 },
    content: [{ type: 'text', text }],
  }
}
export function richPhoto(photo: string): RichNode {
  return {
    type: 'image',
    attrs: { photo, alt: '' },
  }
}

/** Depth-first; stops at the first node `visit` accepts. */
function walk(
  node: RichNode | undefined,
  visit: (n: RichNode) => boolean,
): boolean {
  if (!node)
    return false
  if (visit(node))
    return true

  return (node.content ?? []).some((child): boolean => walk(child, visit))
}

/** Plain text of a node and its children. */
export function nodeText(node: RichNode | undefined): string {
  if (!node)
    return ''
  if (node.type === 'text')
    return node.text ?? ''

  return (node.content ?? []).map(nodeText).join('')
}

/** No text and no photo: Tiptap's empty document (one empty paragraph) counts as empty. */
export function isEmptyDoc(doc: RichNode | undefined): boolean {
  return !walk(
    doc,
    n => n.type === 'image' || (n.type === 'text' && Boolean(n.text?.trim())),
  )
}

/** The first photo of a story, for the teaser card on C03 and C09. */
export function firstPhoto(doc: RichNode | undefined): string | undefined {
  let photo: string | undefined

  walk(doc, (n) => {
    if (n.type === 'image' && typeof n.attrs?.photo === 'string') {
      photo = n.attrs.photo

      return true
    }

    return false
  })

  return photo
}

/** The first paragraph with text, for the teaser's opening lines. */
export function openingText(doc: RichNode | undefined): string {
  let text = ''

  walk(doc, (n) => {
    if (n.type === 'paragraph' && nodeText(n).trim()) {
      text = nodeText(n).trim()

      return true
    }

    return false
  })

  return text
}

/** The story body in the requested language, or the version that exists (R02). */
export function pickDoc(
  body: LocalizedRich,
  language: Language,
): { doc: RichNode, language: Language, isFallback: boolean } | undefined {
  const order: Language[] = [language, language === 'en' ? 'de' : 'en']

  for (const lang of order) {
    const doc = body[lang]

    if (doc && !isEmptyDoc(doc)) {
      return { doc, language: lang, isFallback: lang !== language }
    }
  }

  return undefined
}

/** The story shape before 15.10.2026: illustrated chapters with plain text. */
export interface ChapterStory {
  title: Partial<Record<Language, string>>
  chapters: {
    title: Partial<Record<Language, string>>
    body: Partial<Record<Language, string>>
    photo?: string
  }[]
}

export function isChapterStory(value: unknown): value is ChapterStory {
  return Array.isArray((value as ChapterStory | undefined)?.chapters)
}

/**
 * Chapters as one rich body per language: each chapter's photo, its title as a heading and
 * its text as paragraphs. Used by the seeds and by the one-time upgrade of stored stories.
 */
export function storyFromChapters(story: ChapterStory): {
  title: Partial<Record<Language, string>>
  body: LocalizedRich
} {
  const body: LocalizedRich = {}

  for (const language of ['en', 'de'] as const) {
    const blocks = story.chapters.flatMap((chapter) => {
      const title = chapter.title[language]
      const text = chapter.body[language]

      if (!title && !text)
        return []

      return [
        ...(chapter.photo ? [richPhoto(chapter.photo)] : []),
        ...(title ? [richHeading(title)] : []),
        ...(text ?? '')
          .split(BLANK_LINE)
          .filter(Boolean)
          .map(richParagraph),
      ]
    })

    if (blocks.length)
      body[language] = richDoc(blocks)
  }

  return { title: story.title, body }
}
