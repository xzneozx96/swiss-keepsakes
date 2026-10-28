/** Caps for one story body. First guesses (story-editor decision, 2026-10-28). */
export const STORY_BODY_LIMITS = { maxBytes: 200_000, maxDepth: 10, maxMedia: 100 } as const

export const BODY_NODE_TYPES = [
  'paragraph',
  'text',
  'hardBreak',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'image',
  'video',
  'audio',
] as const

export const BODY_MARK_TYPES = ['bold', 'italic', 'link', 'pinLink'] as const

export const BODY_LINK_PROTOCOLS = ['https:', 'http:', 'mailto:'] as const

export interface StoryBodyMark { type: string, attrs?: Record<string, unknown> }

export interface StoryBodyNode {
  type: string
  attrs?: Record<string, unknown>
  content?: StoryBodyNode[]
  text?: string
  marks?: StoryBodyMark[]
}

export interface StoryBody { type: 'doc', content: StoryBodyNode[] }

export const emptyStoryBody: StoryBody = { type: 'doc', content: [{ type: 'paragraph' }] }

function walk(nodes: StoryBodyNode[], visit: (node: StoryBodyNode) => void): void {
  for (const node of nodes) {
    visit(node)
    if (node.content !== undefined) walk(node.content, visit)
  }
}

/** Every image and audio node in document order. Duplicates stay. */
export function storyBodyMediaRefs(body: StoryBody): { id: string, kind: 'image' | 'audio' }[] {
  const refs: { id: string, kind: 'image' | 'audio' }[] = []
  walk(body.content, (node) => {
    if ((node.type === 'image' || node.type === 'audio') && typeof node.attrs?.mediaId === 'string') {
      refs.push({ id: node.attrs.mediaId, kind: node.type })
    }
  })
  return refs
}

/** The distinct pins the body links to, in order of first use. */
export function storyBodyPinIds(body: StoryBody): string[] {
  const ids = new Set<string>()
  walk(body.content, (node) => {
    for (const mark of node.marks ?? []) {
      if (mark.type === 'pinLink' && typeof mark.attrs?.pinId === 'string') ids.add(mark.attrs.pinId)
    }
  })
  return [...ids]
}

const WORDS_PER_MINUTE = 200

/** Words in the text nodes at 200 a minute, rounded up, at least 1. Media add nothing. */
export function storyBodyReadMinutes(body: StoryBody): number {
  let text = ''
  walk(body.content, (node) => {
    if (node.type === 'text') text += node.text ?? ''
    else text += ' '
  })
  const count = text.split(/\s+/).filter(word => word !== '').length
  return Math.max(1, Math.ceil(count / WORDS_PER_MINUTE))
}

// The package builds with lib ES2022 only. Node and every browser provide URL.
declare const URL: new (href: string) => { protocol: string }

export function isSafeLinkHref(href: string): boolean {
  let url: { protocol: string }
  try {
    url = new URL(href)
  }
  catch {
    return false
  }
  return (BODY_LINK_PROTOCOLS as readonly string[]).includes(url.protocol)
}

type SectionBlock
  = | { type: 'paragraph', text: string }
    | { type: 'image', mediaId: string, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | { type: 'audio', mediaId: string, title: string, caption: string }

function paragraphsOf(text: string): StoryBodyNode[] {
  const paragraphs: StoryBodyNode[] = []
  for (const piece of text.split(/\n\s*\n/)) {
    const lines = piece.split('\n').filter(line => line.trim() !== '')
    if (lines.length === 0) continue
    const content: StoryBodyNode[] = []
    for (const line of lines) {
      if (content.length > 0) content.push({ type: 'hardBreak' })
      content.push({ type: 'text', text: line })
    }
    paragraphs.push({ type: 'paragraph', content })
  }
  return paragraphs
}

function nodesOfBlock(block: SectionBlock): StoryBodyNode[] {
  switch (block.type) {
    case 'paragraph':
      return paragraphsOf(block.text)
    case 'image':
      return [{ type: 'image', attrs: { mediaId: block.mediaId, alt: '', caption: block.caption } }]
    case 'video':
      return [{ type: 'video', attrs: { youtubeId: block.youtubeId, title: block.title, caption: block.caption } }]
    case 'audio':
      return [{ type: 'audio', attrs: { mediaId: block.mediaId, title: block.title, caption: block.caption } }]
  }
}

/** Maps the old intro and sections of blocks to one body. Section ids and reading time are dropped. */
export function sectionsToBody(input: {
  intro: string
  sections: { id?: string, heading: string, blocks: SectionBlock[] }[]
}): StoryBody {
  const content = paragraphsOf(input.intro)
  for (const section of input.sections) {
    const heading = section.heading.trim()
    if (heading !== '') {
      content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] })
    }
    for (const block of section.blocks) content.push(...nodesOfBlock(block))
  }
  return { type: 'doc', content: content.length === 0 ? [{ type: 'paragraph' }] : content }
}
