import type { ContentLanguage, Localized, StoryGroup } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, MediaRepository, StoryListRow, StoryRepository, UnitOfWork } from '../ports.ts'
import type { Result } from './failure.ts'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

const languages: ContentLanguage[] = ['en', 'de']

export interface StoryListEntry {
  groupId: string
  kind: StoryGroup['kind']
  title: Localized
  cover: MediaRecord | null
  languages: Record<ContentLanguage, StoryListRow['versions'][number] | null>
  updatedAt: Date
}

// One entry per story group that has a version, newest update first. The title is the non-empty one of each language;
// the cover is the first ready file of English, then German (a processing or retired file reads as none).
export function makeListStoryGroups<T>({ uow, stories, media }: { uow: UnitOfWork<T>, stories: Pick<StoryRepository<T>, 'listGroups'>, media: Pick<MediaRepository<T>, 'findMany'> }) {
  return async (actor: Actor, storeId: string): Promise<Result<StoryListEntry[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const rows = await stories.listGroups(tx, storeId)
      const ids = [...new Set(rows.flatMap(row => row.versions.flatMap(version => version.coverMediaId ? [version.coverMediaId.toLowerCase()] : [])))]
      // One read for every cover of the list.
      const files = ids.length > 0 ? await media.findMany(tx, storeId, ids) : []
      const byId = new Map(files.filter(file => file.status === 'ready').map(file => [file.id, file]))
      const entries = rows.map((row): StoryListEntry => {
        const by = Object.fromEntries(languages.map(language => [language, row.versions.find(version => version.language === language) ?? null])) as StoryListEntry['languages']
        const present = languages.flatMap(language => by[language] ?? [])
        const title: Localized = {}
        for (const language of languages) {
          const text = by[language]?.title.trim()
          if (text)
            title[language] = text
        }
        const coverId = present.find(version => version.coverMediaId && byId.has(version.coverMediaId.toLowerCase()))?.coverMediaId
        return {
          groupId: row.groupId,
          kind: row.kind,
          title,
          cover: coverId ? byId.get(coverId.toLowerCase()) ?? null : null,
          languages: by,
          updatedAt: new Date(Math.max(...present.map(version => version.updatedAt.getTime()))),
        }
      })
      return ok(entries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.groupId.localeCompare(b.groupId)))
    })
  }
}
