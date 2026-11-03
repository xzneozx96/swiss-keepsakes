import type { StoryDraft } from '@sk/api-contract'
import type { StoryBodyMark, StoryBodyNode } from '@sk/domain/content'

import { emptyStoryBody, isSafeLinkHref } from '@sk/domain/content'

export const TEXT_NODE_MAX = 20_000
export const LINK_HREF_MAX = 2000
const MARKS_MAX = 4

const ATTRIBUTES: Record<string, readonly string[]> = {
  image: ['mediaId', 'alt', 'caption'],
  video: ['youtubeId', 'title', 'caption'],
  audio: ['mediaId', 'title', 'caption'],
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const childrenOf = (node: StoryBodyNode): StoryBodyNode[] => (Array.isArray(node.content) ? node.content : [])

/**
 * Tiptap's JSON carries more than the contract's strict objects accept: a link has target, rel and class, an ordered list
 * its start and type. This keeps the nodes and marks of the story body's allow-list and only the attributes the contract
 * names, and fits what is left to the contract's shape: no empty text, a text node of at most 20,000 characters, a quote
 * of paragraphs, a list item of paragraphs and lists. What is not in the allow-list becomes its text.
 */
function cleanMarks(marks: StoryBodyMark[] | undefined): StoryBodyMark[] {
  const kept: StoryBodyMark[] = []

  for (const mark of Array.isArray(marks) ? marks : []) {
    const attrs = isRecord(mark.attrs) ? mark.attrs : {}
    let next: StoryBodyMark | undefined

    if (mark.type === 'bold' || mark.type === 'italic')
      next = { type: mark.type }
    else if (mark.type === 'link' && typeof attrs.href === 'string' && attrs.href.length <= LINK_HREF_MAX && isSafeLinkHref(attrs.href))
      next = { type: 'link', attrs: { href: attrs.href } }
    else if (mark.type === 'pinLink' && typeof attrs.pinId === 'string')
      next = { type: 'pinLink', attrs: { pinId: attrs.pinId } }

    if (next && !kept.some(other => other.type === next.type))
      kept.push(next)
  }

  // A pin link replaces a plain link on the same text (the mark excludes it; a paste or an old body may carry both).
  const unique = kept.some(mark => mark.type === 'pinLink') ? kept.filter(mark => mark.type !== 'link') : kept

  return unique.slice(0, MARKS_MAX)
}

/** Cuts at `max` code units without splitting a surrogate pair. */
function pieces(text: string): string[] {
  const out: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + TEXT_NODE_MAX, text.length)

    if (end < text.length && text.charCodeAt(end - 1) >= 0xD800 && text.charCodeAt(end - 1) <= 0xDBFF)
      end -= 1
    out.push(text.slice(start, end))
    start = end
  }

  return out
}

/** The inline nodes of a node: its text and hard breaks, whatever wraps them. */
function inlineOf(node: StoryBodyNode): StoryBodyNode[] {
  if (node.type === 'hardBreak')
    return [{ type: 'hardBreak' }]
  if (node.type === 'text') {
    const marks = cleanMarks(node.marks)

    return typeof node.text === 'string'
      ? pieces(node.text).map(text => ({ type: 'text', text, ...(marks.length > 0 && { marks }) }))
      : []
  }

  return childrenOf(node).flatMap(inlineOf)
}

function textBlock(type: 'paragraph' | 'heading', node: StoryBodyNode, attrs?: Record<string, unknown>): StoryBodyNode {
  const content = inlineOf(node)

  return { type, ...(attrs && { attrs }), ...(content.length > 0 && { content }) }
}

/** Any block as paragraphs: the text of a heading, a table or a code block under a quote or a list item. */
function paragraphsOf(node: StoryBodyNode): StoryBodyNode[] {
  const blocks = childrenOf(node)

  if (node.type === 'paragraph' || !blocks.some(child => child.type !== 'text' && child.type !== 'hardBreak'))
    return [textBlock('paragraph', node)]

  return blocks.flatMap(paragraphsOf)
}

function listOf(node: StoryBodyNode): StoryBodyNode[] {
  const items = childrenOf(node).flatMap((item) => {
    const content = childrenOf(item).flatMap(child => (child.type === 'bulletList' || child.type === 'orderedList' ? listOf(child) : paragraphsOf(child)))

    return item.type === 'listItem' && content.length > 0 ? [{ type: 'listItem', content }] : []
  })

  return items.length > 0 ? [{ type: node.type, content: items }] : []
}

function blockOf(node: StoryBodyNode): StoryBodyNode[] {
  switch (node.type) {
    case 'paragraph':
      return [textBlock('paragraph', node)]
    case 'heading': {
      const level = isRecord(node.attrs) ? node.attrs.level : undefined

      return level === 2 || level === 3 ? [textBlock('heading', node, { level })] : [textBlock('paragraph', node)]
    }
    case 'blockquote': {
      const content = childrenOf(node).flatMap(paragraphsOf)

      return content.length > 0 ? [{ type: 'blockquote', content }] : []
    }
    case 'bulletList':
    case 'orderedList':
      return listOf(node)
    case 'image':
    case 'video':
    case 'audio': {
      const attrs = isRecord(node.attrs) ? node.attrs : {}

      return [{ type: node.type, attrs: Object.fromEntries(ATTRIBUTES[node.type]!.map(name => [name, typeof attrs[name] === 'string' ? attrs[name] : ''])) }]
    }
    default:
      return paragraphsOf(node)
  }
}

export function cleanBody(json: unknown): StoryDraft['body'] {
  const content = isRecord(json) && Array.isArray(json.content) ? (json.content as StoryBodyNode[]).flatMap(blockOf) : []

  return (content.length > 0 ? { type: 'doc', content } : emptyStoryBody) as StoryDraft['body']
}
