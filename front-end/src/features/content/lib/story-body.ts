import type { PublicStory } from '@sk/api-contract'

import { slugify } from '@sk/domain/shared'

type Body = PublicStory['body']
type Heading = Extract<Body['content'][number], { type: 'heading' }>

export interface BodyHeading { node: Heading, id: string, text: string, level: 2 | 3 }

const textOf = (node: Heading) => (node.content ?? []).map(inline => (inline.type === 'text' ? inline.text : ' ')).join('').trim()

/**
 * Every heading of the body in order, each with an anchor id made from its text. A counter keeps equal texts apart
 * (decision 2026-10-28, "Contents list and reading time"). Headings sit at the top level of the body.
 */
export function headingsOf(body: Body): BodyHeading[] {
  const seen = new Map<string, number>()

  return body.content.flatMap((node) => {
    if (node.type !== 'heading')
      return []
    const text = textOf(node)
    const base = slugify(text) || 'section'
    const count = (seen.get(base) ?? 0) + 1

    seen.set(base, count)

    return [{ node, id: count > 1 ? `${base}-${count}` : base, text, level: node.attrs.level }]
  })
}

/** The contents list: the H2 headings with text, and only from two of them. */
export function contentsOf(body: Body): { id: string, heading: string }[] {
  const entries = headingsOf(body).filter(h => h.level === 2 && h.text !== '').map(h => ({ id: h.id, heading: h.text }))

  return entries.length >= 2 ? entries : []
}
