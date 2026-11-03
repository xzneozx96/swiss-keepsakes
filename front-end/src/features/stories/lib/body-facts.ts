import type { StoryDraft } from '@sk/api-contract'

export interface BodyFacts { hasText: boolean, photosWithoutAlt: number, mediaWithoutCaption: number }

interface Node { type: string, attrs?: Record<string, unknown>, content?: Node[], text?: string }

const MEDIA = new Set(['image', 'video', 'audio'])
const blank = (value: unknown) => typeof value !== 'string' || value.trim() === ''

/**
 * What the publish checks read from a body. A photo, video or recording counts as content, so a body of one photo is not
 * "empty" (design section 9: "the body has no text" means no text and no media).
 */
export function bodyFacts(body: StoryDraft['body']): BodyFacts {
  const facts: BodyFacts = { hasText: false, photosWithoutAlt: 0, mediaWithoutCaption: 0 }
  const visit = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === 'text' && !blank(node.text))
        facts.hasText = true
      if (MEDIA.has(node.type)) {
        facts.hasText = true
        if (blank(node.attrs?.caption))
          facts.mediaWithoutCaption += 1
        if (node.type === 'image' && blank(node.attrs?.alt))
          facts.photosWithoutAlt += 1
      }
      if (node.content)
        visit(node.content)
    }
  }

  visit(body.content as Node[])

  return facts
}
