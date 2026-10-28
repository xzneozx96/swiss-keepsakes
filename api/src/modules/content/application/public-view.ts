import type { ContentLanguage, StayTag } from '@sk/domain/content'
import type { PublicCategoryRow, PublicStoryRow, PublicStoryVersionRow } from '../read-ports.ts'
import { pickLanguage } from './language.ts'

// Rows to the public response shapes. Nothing here reads a store or a price. The application layer may not import
// the API contract, so the shapes are written here; the tests parse every output with the contract schemas.

export interface PublicCategory { id: string, slug: string, name: { en: string, de: string }, parentId: string | null, position: number }
export interface PublicCategoryList { items: PublicCategory[] }

interface LanguageNotice { language: ContentLanguage, requestedLanguage: ContentLanguage, fallback: boolean, availableLanguages: ContentLanguage[] }

export interface PublicStoryCard extends LanguageNotice {
  id: string
  slug: string
  title: string
  excerpt: string
  readMinutes: number | null
  coverKey: string | null
  stayTag: StayTag
  interests: string[]
  categories: { id: string, slug: string, name: string }[]
  publishedAt: string
}

export type PublicStoryBlock
  = | { type: 'paragraph', text: string }
    | { type: 'image', key: string | null, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | { type: 'audio', key: string | null, title: string, caption: string }

export interface PublicStory extends PublicStoryCard {
  intro: string
  authorName: string
  authorRole: string
  sections: { id: string, heading: string, blocks: PublicStoryBlock[] }[]
}

export interface PublicStoryList { items: PublicStoryCard[] }

const keyOf = (version: PublicStoryVersionRow, mediaId: string | null) => (mediaId ? version.mediaKeys[mediaId] ?? null : null)

export function toPublicCategory(row: PublicCategoryRow): PublicCategory {
  const name = row.name.en ?? row.name.de ?? ''
  return { id: row.id, slug: row.slug, name: { en: row.name.en ?? name, de: row.name.de ?? name }, parentId: row.parentId, position: row.position }
}

// The version carried and the notice about it, or null when the story has no published version.
function carried(row: PublicStoryRow, requested: ContentLanguage) {
  const choice = pickLanguage(row.versions.map(v => v.language), requested)
  const version = choice && row.versions.find(v => v.language === choice.language)
  if (!choice || !version)
    return null
  return {
    version,
    notice: {
      language: choice.language,
      requestedLanguage: requested,
      fallback: choice.fallback,
      availableLanguages: row.versions.map(v => v.language).sort(),
    },
  }
}

function toCard(row: PublicStoryRow, version: PublicStoryVersionRow, notice: NonNullable<ReturnType<typeof carried>>['notice']): PublicStoryCard {
  const { published } = version
  return {
    id: row.id,
    slug: version.slug,
    title: published.title,
    excerpt: published.excerpt,
    readMinutes: published.readMinutes,
    coverKey: keyOf(version, published.coverMediaId),
    stayTag: row.stayTag,
    interests: row.interests,
    categories: row.categories.map(c => ({ id: c.id, slug: c.slug, name: c.name[notice.language] ?? c.name.en ?? c.name.de ?? '' })),
    publishedAt: version.publishedAt.toISOString(),
    ...notice,
  }
}

export function toStoryCard(row: PublicStoryRow, requested: ContentLanguage): PublicStoryCard | null {
  const pick = carried(row, requested)
  return pick && toCard(row, pick.version, pick.notice)
}

export function toPublicStory(row: PublicStoryRow, requested: ContentLanguage): PublicStory | null {
  const pick = carried(row, requested)
  if (!pick)
    return null
  const { version } = pick
  const { published } = version
  return {
    ...toCard(row, version, pick.notice),
    intro: published.intro,
    authorName: published.authorName,
    authorRole: published.authorRole,
    sections: published.sections.map(section => ({
      id: section.id,
      heading: section.heading,
      blocks: section.blocks.map((block) => {
        if (block.type === 'image')
          return { type: 'image' as const, key: keyOf(version, block.mediaId), caption: block.caption }
        if (block.type === 'audio')
          return { type: 'audio' as const, key: keyOf(version, block.mediaId), title: block.title, caption: block.caption }
        return block
      }),
    })),
  }
}
