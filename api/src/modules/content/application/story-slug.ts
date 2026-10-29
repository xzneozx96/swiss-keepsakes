import type { ContentLanguage, StoryVersion } from '@sk/domain/content'
import type { StoryRepository } from '../ports.ts'
import type { Failure } from './failure.ts'
import { storyVersionCheckGaps } from '@sk/domain/content'

// The language versions of one story share one link (G-E214-SLUG, option A). The use cases write a link to every
// version of the group in one transaction, so the database's UNIQUE (language, slug) checks each language and a
// clash rolls the whole save back. Lock order is always group, then English, then German.
export const otherLanguage = (language: ContentLanguage): ContentLanguage => (language === 'en' ? 'de' : 'en')

// The version to lock and the one beside it, English first.
export async function lockVersions<T>(stories: StoryRepository<T>, tx: T, storeId: string, groupId: string, language: ContentLanguage): Promise<{ version?: StoryVersion, sibling?: StoryVersion }> {
  const sibling = otherLanguage(language)
  if (language === 'de') {
    const first = await stories.findVersionForUpdate(tx, storeId, groupId, sibling)
    return { sibling: first, version: await stories.findVersionForUpdate(tx, storeId, groupId, language) }
  }
  const version = await stories.findVersionForUpdate(tx, storeId, groupId, language)
  return { version, sibling: await stories.findVersionForUpdate(tx, storeId, groupId, sibling) }
}

// Writes the link to the version beside the saved one when it differs. A published sibling must keep a link, which
// the database CHECK reads, so clearing it there is refused as incomplete instead of reaching the database.
export async function alignSibling<T>(stories: StoryRepository<T>, tx: T, sibling: StoryVersion | undefined, slug: string | null, at: Date): Promise<Extract<Failure, { reason: 'incomplete' }> | undefined> {
  if (!sibling || sibling.slug === slug)
    return undefined
  if (sibling.status === 'published') {
    const gaps = storyVersionCheckGaps({ slug, title: sibling.published?.title ?? '' })
    if (gaps.length > 0)
      return { reason: 'incomplete', gaps }
  }
  await stories.saveVersion(tx, sibling, { slug }, at)
  return undefined
}
