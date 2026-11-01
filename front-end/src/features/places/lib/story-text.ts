import type { StoryVersionText } from '@sk/api-contract'

import type { StoryBodyNode as BodyNode } from '@sk/domain/content'

import { safeHref } from '@sk/domain/shared'

type Media = StoryVersionText['media'][number]

/** A run of text with the marks the story editor allows. A pin link draws as plain text: the preview has no pin to open. */
export interface Inline { text: string, bold?: true, italic?: true, href?: string }

export type StoryBlock
  = | { type: 'heading', level: 2 | 3, inlines: (Inline | 'break')[] }
    | { type: 'paragraph', inlines: (Inline | 'break')[] }
    | { type: 'quote', blocks: StoryBlock[] }
    | { type: 'list', ordered: boolean, items: StoryBlock[][] }
    | { type: 'image', src: string, alt: string, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | { type: 'audio', src: string, title: string, caption: string }

/** The smallest copy that is sharp across a phone sheet, else the original. */
const IMAGE_WIDTH = 800

const text = (value: unknown) => (typeof value === 'string' ? value : '')

function inlinesOf(nodes: BodyNode[] | undefined): (Inline | 'break')[] {
  return (nodes ?? []).flatMap((node): (Inline | 'break')[] => {
    if (node.type === 'hardBreak')
      return ['break']
    if (node.type !== 'text' || typeof node.text !== 'string')
      return []
    const inline: Inline = { text: node.text }

    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold')
        inline.bold = true
      else if (mark.type === 'italic')
        inline.italic = true
      else if (mark.type === 'link') {
        const href = safeHref(mark.attrs?.href)

        if (href)
          inline.href = href
      }
    }

    return [inline]
  })
}

function imageUrl(file: Media) {
  const copy = file.variants.find(variant => variant.width >= IMAGE_WIDTH) ?? file.variants.at(-1)

  return copy?.url ?? file.publicUrl ?? undefined
}

/**
 * The stored Tiptap document as blocks the sheet draws, walking only the nodes the story editor allows (ADR-014):
 * a node it does not know, and an image or audio whose file is not among `media`, is skipped and never throws.
 */
export function storyBlocks(body: StoryVersionText['body'], media: readonly Media[]): StoryBlock[] {
  const files = new Map(media.map(file => [file.id.toLowerCase(), file]))
  const fileOf = (node: BodyNode) => files.get(text(node.attrs?.mediaId).toLowerCase())

  function blockOf(node: BodyNode): StoryBlock[] {
    switch (node.type) {
      case 'paragraph':
        return [{ type: 'paragraph', inlines: inlinesOf(node.content) }]
      case 'heading':
        return [{ type: 'heading', level: node.attrs?.level === 3 ? 3 : 2, inlines: inlinesOf(node.content) }]
      case 'blockquote':
        return [{ type: 'quote', blocks: blocksOf(node.content) }]
      case 'bulletList':
      case 'orderedList':
        return [{ type: 'list', ordered: node.type === 'orderedList', items: (node.content ?? []).filter(item => item.type === 'listItem').map(item => blocksOf(item.content)) }]
      case 'image': {
        const src = fileOf(node) && imageUrl(fileOf(node)!)

        return src ? [{ type: 'image', src, alt: text(node.attrs?.alt) || text(node.attrs?.caption), caption: text(node.attrs?.caption) }] : []
      }
      case 'video':
        return text(node.attrs?.youtubeId) ? [{ type: 'video', youtubeId: text(node.attrs?.youtubeId), title: text(node.attrs?.title), caption: text(node.attrs?.caption) }] : []
      case 'audio': {
        const src = fileOf(node)?.publicUrl

        return src ? [{ type: 'audio', src, title: text(node.attrs?.title), caption: text(node.attrs?.caption) }] : []
      }
      default:
        return []
    }
  }

  function blocksOf(nodes: BodyNode[] | undefined): StoryBlock[] {
    return Array.isArray(nodes) ? nodes.flatMap(blockOf) : []
  }

  // The contract types the nested nodes as unknown (it is recursive); they are the domain's `StoryBodyNode`.
  return blocksOf(body.content as BodyNode[])
}
