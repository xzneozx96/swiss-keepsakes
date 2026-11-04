import type { PublicStory } from '@sk/api-contract'

import { storyCard } from './story-cards'

type Body = PublicStory['body']
type Doc = Body['content']

/** A body with every node and mark the page draws. */
export function fullBody(): Body {
  const doc: Doc = [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Morning at the pier' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Plain, ' },
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' and ' },
      { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
      { type: 'text', text: ' and ' },
      { type: 'text', text: 'a link', marks: [{ type: 'link', attrs: { href: 'https://example.ch/x' } }] },
      { type: 'hardBreak' },
      { type: 'text', text: 'the Chapel Bridge', marks: [{ type: 'pinLink', attrs: { pinId: '0190a000-0000-7000-8000-00000000aaaa' } }] },
    ] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'A small detail' }] },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The lake keeps time.' }] }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bring a jacket' }] }] }] },
    { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Take the boat' }] }] }] },
    { type: 'image', attrs: { key: 'k/1', url: 'https://media.test/k/orig.jpg', variants: [{ width: 320, url: 'https://media.test/k/w320.webp' }, { width: 640, url: 'https://media.test/k/w640.webp' }], alt: 'The pier at dawn', caption: 'Dawn at the pier' } },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Afternoon on the water' }] },
    { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'Boat ride', caption: 'The ride' } },
    { type: 'audio', attrs: { key: 'k/2', url: 'https://media.test/k/a.mp3', title: 'Lake sounds', caption: 'Recorded on site' } },
  ]

  return { type: 'doc', content: doc }
}

export const PIN_ID = '0190a000-0000-7000-8000-00000000aaaa'

/** A public story as `GET /api/public/stories/{slug}` returns it. */
export function publicStory(over: Partial<PublicStory> = {}): PublicStory {
  const card = storyCard({ title: 'A day by the lake', slug: 'lake-day', ...over })

  return {
    ...card,
    authorName: 'Anna Keller',
    body: fullBody(),
    versions: [{ language: 'en', slug: 'lake-day' }, { language: 'de', slug: 'seetag' }],
    places: [{ id: PIN_ID, slug: 'chapel-bridge', name: 'Chapel Bridge' }],
    related: [],
    keepsakes: [],
    availableLanguages: ['en', 'de'],
    cover: { url: 'https://media.test/c/orig.jpg', variants: [{ width: 640, url: 'https://media.test/c/w640.webp' }, { width: 1280, url: 'https://media.test/c/w1280.webp' }] },
    ...over,
  }
}
