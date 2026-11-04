// Keepsakes shown under a seeded story ("Take a piece home"), so the story page has cards on dev (T-E4.4a). The story is named
// by its English slug in `place-stories.ts`, a keepsake by its SKU code in `curated/keepsakes.json`. Up to 6 per story.
// The pairing is a first suggestion for the owner to change in the story editor; the seed only adds a link that is missing.
export interface StoryKeepsakeLinkSpec {
  story: string
  keepsakes: string[]
}

export const storyKeepsakeLinks: StoryKeepsakeLinkSpec[] = [
  { story: 'crossing-the-chapel-bridge', keepsakes: ['VICTORINOX-1.6795', 'VICTORINOX-0.6223.G'] },
  { story: 'the-dying-lion-of-lucerne', keepsakes: ['VICTORINOX-0.8150.26'] },
  { story: 'a-pause-on-the-weinmarkt', keepsakes: ['VICTORINOX-1.6703', 'VICTORINOX-0.6223.G'] },
]
