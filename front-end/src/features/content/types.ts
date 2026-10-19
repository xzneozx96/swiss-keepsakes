import type { Language } from '@/contexts/locale-context'

/** A draft is visible only to the merchant (M17); publishing makes it show on C19 in its language. */
export type ArticlePublication
  = { status: 'draft' } | { status: 'published', publishedAt: string }

/**
 * One language version of a story (C19, C20, M17). A story may exist in EN, DE or both
 * (R02); each version is its own record so it can be drafted and published on its own.
 */
export interface Article {
  /** Unique per language version. */
  id: string
  /** Shared by the EN and DE versions of one story, so one link opens either (outline D6). */
  slug: string
  language: Language
  title: string
  excerpt: string
  author: ArticleAuthor
  /** The lead paragraph under the byline, before the first section. */
  intro: string
  /** In reading order; each heading is a stop in the C20 contents bar. */
  sections: ArticleSection[]
  /** Cover photo slug in src/assets/photos (see lib/photos.ts). */
  photo: string
  /** Filters the C19 list and labels the C01 cards (owner, stories-first home 17.10.2026). */
  category: StoryCategory
  /** Where the story happens, in this version's language, e.g. "Old Town" / "Altstadt". */
  place: string
  readMinutes: number
  /** Up to 6 gifts and tours in the merchant's order, per language version (R16). */
  links: ArticleLink[]
  /** Up to 3 story slugs for "More to discover" (R18); empty means the newest others. */
  related: string[]
  publication: ArticlePublication
  updatedAt: string
}

/**
 * Sights and local spots were one category from the start (owner, 17.10.2026): "town" is
 * anything in the city, "lake" anything out on the lake or up a mountain.
 */
export const STORY_CATEGORIES = ['eat', 'town', 'lake', 'craft'] as const

export type StoryCategory = (typeof STORY_CATEGORIES)[number]

/** A gift (`Product.id`) or tour (`Tour.id`, e.g. "things-that-remain") linked from a story (R16). */
export interface ArticleLink {
  kind: 'gift' | 'tour'
  id: string
}

export const MAX_ARTICLE_LINKS = 6
export const MAX_RELATED_STORIES = 3

/** A shop staff member; guests never author stories (AC16). */
export interface ArticleAuthor {
  name: string
  role: string
}

export interface ArticleSection {
  /** Anchor for the contents bar, unique within the article. */
  id: string
  heading: string
  blocks: ArticleBlock[]
}

/**
 * Body content (owner request 14.10.2026): text, photos, a YouTube video loaded from
 * youtube-nocookie.com, and pre-recorded audio from src/assets/audio. Never AI audio (PRD §11).
 */
export type ArticleBlock
  = | { type: 'paragraph', text: string }
    | { type: 'image', photo: string, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | {
      type: 'audio'
      /** File name in src/assets/audio without extension (see lib/audio.ts). */
      audio: string
      title: string
      caption: string
    }

/** Guests comment after sign-in (AC16); the shop replies as a named staff member. */
export type CommentAuthor
  = { kind: 'guest', guestId: string } | { kind: 'shop', staffName: string }

export interface ArticleComment {
  id: string
  articleId: string
  author: CommentAuthor
  text: string
  createdAt: string
  /** Hidden by the merchant (D11): kept in M18, not shown on C20. */
  hidden: boolean
  /** Replies are one level deep (outline A3): a parent is always a top-level comment. */
  parentId?: string
}
