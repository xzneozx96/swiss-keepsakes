import type { StoryBody, StoryBodyNode } from '@sk/domain/content'
import type { SeedStory } from '../scripts/seed-data/stories.ts'
import { storyDraftSchema } from '@sk/api-contract'
import { storyBodyMediaRefs } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { seedStoryDraft } from '../scripts/seed-content.ts'
import { seedStories } from '../scripts/seed-data/stories.ts'

// The prototype stories are gone (owner, 2026-11-03), so db:seed adds none. The mapping from the old intro and sections to a
// body document stays, and is tested on a small story of its own.
const sample: SeedStory = {
  slug: 'sample',
  versions: {
    en: {
      title: 'Sample',
      excerpt: 'A sample story.',
      intro: 'The intro.',
      authorName: 'Sonja',
      readMinutes: 4,
      coverMediaId: null,
      sections: [{ id: 'one', heading: 'First', blocks: [{ type: 'paragraph', text: 'One.' }, { type: 'paragraph', text: 'Two.' }] }, { id: 'two', heading: '', blocks: [{ type: 'paragraph', text: 'Three.' }] }],
    },
  },
}

function texts(nodes: StoryBodyNode[]): string[] {
  return nodes.flatMap(n => [...(n.type === 'text' ? [n.text ?? ''] : []), ...texts(n.content ?? [])])
}

describe('[E2.13] the seed stories', () => {
  it('[E2.13] the prototype stories are removed, so db:seed adds no story', () => {
    expect(seedStories).toEqual([])
  })

  it('[E2.13][E2.14][AC30] a story maps to a draft that passes storyDraftSchema, with a body and no old keys, no authorRole', () => {
    const draft = seedStoryDraft(sample.versions.en!)
    const parsed = storyDraftSchema.safeParse(draft)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true)
    expect((draft.body as StoryBody).type).toBe('doc')
    for (const key of ['intro', 'sections', 'readMinutes'])
      expect(draft).not.toHaveProperty(key)
    expect(draft).not.toHaveProperty('authorRole')
    expect(Object.keys(draft).sort()).toEqual(['authorName', 'body', 'coverMediaId', 'excerpt', 'title'])
  })

  it('[E2.13] the body is media-free, starts with the intro and keeps every heading and paragraph in order', () => {
    const body = seedStoryDraft(sample.versions.en!).body as StoryBody
    expect(storyBodyMediaRefs(body)).toEqual([])
    expect(body.content[0]!.type).toBe('paragraph')
    expect(texts(body.content.slice(0, 1)).join('\n')).toBe('The intro.')
    expect(body.content.slice(1).filter(n => n.type === 'heading' || n.type === 'paragraph').map(n => texts([n]).join('\n'))).toEqual(['First', 'One.', 'Two.', 'Three.'])
  })
})
