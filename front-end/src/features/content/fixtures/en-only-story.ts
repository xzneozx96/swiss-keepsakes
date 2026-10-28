import type { Article } from '@sk/domain/content'

// Test fixtures for stories that exist in one language only (E3.11). They are not in the seed, so lists, search and the route checks do not change. `story-versions.ts` adds them outside production.
export const enOnlyStory: Article = {
  id: 'a-quiet-morning-on-the-reuss-en',
  slug: 'a-quiet-morning-on-the-reuss',
  language: 'en',
  title: 'A quiet morning on the Reuss',
  excerpt: 'Walk the river path before the first boats, and watch the old town wake up.',
  author: { name: 'Sonja', role: 'Owner, Swiss Keepsakes Luzern' },
  intro: 'The Reuss leaves the lake at the heart of Luzerne, and early in the day its banks are almost empty. Bring a coffee and walk upstream.',
  sections: [
    {
      id: 'along-the-river',
      heading: 'Along the river',
      blocks: [
        { type: 'paragraph', text: 'The path starts at the weir and follows the water past the covered bridges. Swans drift under the arches, and the only sound is the current.' },
        { type: 'paragraph', text: 'By eight the first cafes open their shutters, and the quiet is over. Until then the river is yours.' },
      ],
    },
  ],
  photo: 'musegg-wall',
  category: 'town',
  place: 'Old Town',
  readMinutes: 2,
  links: [],
  related: [],
  publication: { status: 'published', publishedAt: '2026-10-01T08:00:00.000Z' },
  updatedAt: '2026-10-01T08:00:00.000Z',
}

export const deOnlyStory: Article = {
  id: 'ein-ruhiger-morgen-an-der-reuss-de',
  slug: 'ein-ruhiger-morgen-an-der-reuss',
  language: 'de',
  title: 'Ein ruhiger Morgen an der Reuss',
  excerpt: 'Gehen Sie vor dem ersten Boot am Fluss entlang und sehen Sie zu, wie die Altstadt erwacht.',
  author: { name: 'Sonja', role: 'Inhaberin, Swiss Keepsakes Luzern' },
  intro: 'Die Reuss verlässt den See mitten in Luzern, und früh am Tag sind ihre Ufer fast leer. Nehmen Sie einen Kaffee mit und gehen Sie flussaufwärts.',
  sections: [
    {
      id: 'am-fluss-entlang',
      heading: 'Am Fluss entlang',
      blocks: [
        { type: 'paragraph', text: 'Der Weg beginnt am Wehr und folgt dem Wasser an den gedeckten Brücken vorbei. Schwäne treiben unter den Bögen, und zu hören ist nur die Strömung.' },
        { type: 'paragraph', text: 'Um acht Uhr öffnen die ersten Cafés, und die Ruhe ist vorbei. Bis dahin gehört der Fluss Ihnen.' },
      ],
    },
  ],
  photo: 'musegg-wall',
  category: 'town',
  place: 'Altstadt',
  readMinutes: 2,
  links: [],
  related: [],
  publication: { status: 'published', publishedAt: '2026-10-01T08:00:00.000Z' },
  updatedAt: '2026-10-01T08:00:00.000Z',
}

export const storyFixtures: Article[] = [enOnlyStory, deOnlyStory]
