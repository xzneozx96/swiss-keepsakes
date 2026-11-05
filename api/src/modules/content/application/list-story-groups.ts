import type { ContentLanguage, Localized, StoryGroup } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MediaRecord, MediaRepository, StoryListQuery, StoryListRow, StoryRepository, StoryTab, UnitOfWork } from '../ports.ts'
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

export interface StoryListResult {
  entries: StoryListEntry[]
  total: number
  page: number
  pageSize: number
  tabs: Record<StoryTab, number>
}

type Deps<T> = { uow: UnitOfWork<T>, stories: Pick<StoryRepository<T>, 'listGroups' | 'listGroupsByIds'>, media: Pick<MediaRepository<T>, 'findMany'> }

// The title is the non-empty one of each language; the cover is the first ready file of English, then German (a processing or
// retired file reads as none). One read for every cover of the rows.
async function entriesOf<T>(tx: T, storeId: string, rows: StoryListRow[], media: Deps<T>['media']): Promise<StoryListEntry[]> {
  const ids = [...new Set(rows.flatMap(row => row.versions.flatMap(version => version.coverMediaId ? [version.coverMediaId.toLowerCase()] : [])))]
  const files = ids.length > 0 ? await media.findMany(tx, storeId, ids) : []
  const byId = new Map(files.filter(file => file.status === 'ready').map(file => [file.id, file]))
  return rows.map((row): StoryListEntry => {
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
}

// One page of entries, one per story group that has a version, in the order the query names.
export function makeListStoryGroups<T>({ uow, stories, media }: Deps<T>) {
  return async (actor: Actor, storeId: string, query: StoryListQuery): Promise<Result<StoryListResult>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const { rows, total, tabs } = await stories.listGroups(tx, storeId, query)
      return ok({ entries: await entriesOf(tx, storeId, rows, media), total, tabs, page: query.page, pageSize: query.pageSize })
    })
  }
}

// The stories the editor already references, read by id (at most 50): the names of the related stories, their state for the publish checks.
export function makeListStoryGroupsByIds<T>({ uow, stories, media }: Deps<T>) {
  return async (actor: Actor, storeId: string, ids: string[]): Promise<Result<StoryListEntry[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const rows = ids.length === 0 ? [] : await stories.listGroupsByIds(tx, storeId, ids)
      return ok(await entriesOf(tx, storeId, rows, media))
    })
  }
}
