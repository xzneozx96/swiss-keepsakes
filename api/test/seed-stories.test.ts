import type { StoryBody, StoryBodyNode } from '@sk/domain/content'
import { storyDraftSchema } from '@sk/api-contract'
import { storyBodyMediaRefs } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { seedStoryDraft } from '../scripts/seed-content.ts'
import { seedStories } from '../scripts/seed-data/stories.ts'

const versions = seedStories.flatMap(story =>
  (['en', 'de'] as const).flatMap(language => (story.versions[language] ? [{ slug: story.slug, language, doc: story.versions[language]! }] : [])),
)

function texts(nodes: StoryBodyNode[]): string[] {
  return nodes.flatMap(n => [...(n.type === 'text' ? [n.text ?? ''] : []), ...texts(n.content ?? [])])
}

describe('[E2.13] the seed stories map to body documents', () => {
  it('[E2.13] seeds at least one story version', () => {
    expect(versions.length).toBeGreaterThan(0)
  })

  it.each(versions)('[E2.13][E2.14][AC30] $slug/$language draft passes storyDraftSchema with a body and no old keys, no authorRole', ({ doc }) => {
    const draft = seedStoryDraft(doc)
    const parsed = storyDraftSchema.safeParse(draft)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true)
    expect((draft.body as StoryBody).type).toBe('doc')
    for (const key of ['intro', 'sections', 'readMinutes'])
      expect(draft).not.toHaveProperty(key)
    expect(draft).not.toHaveProperty('authorRole')
    expect(Object.keys(draft).sort()).toEqual(['authorName', 'body', 'coverMediaId', 'excerpt', 'title'])
  })

  it.each(versions)('[E2.13] $slug/$language body is media-free, text nodes are short, and it starts with the intro', ({ doc }) => {
    const body = seedStoryDraft(doc).body as StoryBody
    expect(storyBodyMediaRefs(body)).toEqual([])
    for (const text of texts(body.content))
      expect(text.length).toBeLessThanOrEqual(20_000)
    const intro = body.content.slice(0, 1)
    expect(intro[0]!.type).toBe('paragraph')
    expect(texts(intro).join('\n')).toBe(doc.intro)
  })

  it.each(versions)('[E2.13] $slug/$language keeps every heading and paragraph, in order', ({ doc }) => {
    const body = seedStoryDraft(doc).body as StoryBody
    const expected = doc.sections.flatMap(s => [
      ...(s.heading.trim() === '' ? [] : [s.heading.trim()]),
      ...s.blocks.flatMap(b => (b.type === 'paragraph' ? [b.text] : [])),
    ])
    const actual = body.content.slice(1).filter(n => n.type === 'heading' || n.type === 'paragraph').map(n => texts([n]).join('\n'))
    expect(actual).toEqual(expected)
  })
})
