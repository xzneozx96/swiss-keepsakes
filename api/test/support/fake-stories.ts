import type { StoryGroup, StoryVersion } from '@sk/domain/content'
import type { StoryListRow, StoryRepository } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'

const key = (groupId: string, language: string) => `${groupId}/${language}`

// An in-memory story repository. It copies what the SQL one does, but none of the database guards.
export function createFakeStories(): StoryRepository<null> & { groups: Map<string, StoryGroup>, versions: Map<string, StoryVersion>, mainStoryOf: Map<string, { storeId: string, groupId: string | null }> } {
  // pin id -> the main story it names; the pins themselves live in another repository.
  const mainStoryOf = new Map<string, { storeId: string, groupId: string | null }>()
  const groups = new Map<string, StoryGroup>()
  const versions = new Map<string, StoryVersion>()
  const putGroup = (group: StoryGroup) => {
    groups.set(group.id, group)
    return group
  }
  const putVersion = (version: StoryVersion) => {
    versions.set(key(version.groupId, version.language), version)
    return version
  }
  return {
    groups,
    versions,
    mainStoryOf,
    async insertGroup(_tx, storeId, input, at) {
      return putGroup({
        id: randomUUID(),
        storeId,
        stayTag: 'both',
        interests: [],
        categoryIds: [],
        placeIds: [],
        keepsakeProductIds: [],
        relatedGroupIds: [],
        ...input,
        rowVersion: 1,
        createdAt: at,
        updatedAt: at,
      })
    },
    async findGroupForUpdate(_tx, storeId, groupId) {
      const group = groups.get(groupId)
      return group?.storeId === storeId ? group : undefined
    },
    async saveGroup(_tx, group, changes, at) {
      // As the SQL: a kind with no place stores no place, and a save that leaves kind out keeps both.
      return putGroup({ ...group, ...changes, subjectPlaceId: changes.kind === undefined ? group.subjectPlaceId : (changes.subjectPlaceId ?? null), rowVersion: group.rowVersion + 1, updatedAt: at })
    },
    async insertVersion(_tx, storeId, groupId, language, changes, at) {
      if (versions.has(key(groupId, language)))
        return undefined
      return putVersion({
        groupId,
        storeId,
        language,
        status: 'draft',
        slug: changes.slug ?? null,
        draft: changes.draft ?? null,
        published: null,
        publishedAt: null,
        rowVersion: 1,
        createdAt: at,
        updatedAt: at,
      })
    },
    async findVersionForUpdate(_tx, storeId, groupId, language) {
      const version = versions.get(key(groupId, language))
      return version?.storeId === storeId ? version : undefined
    },
    async findVersion(_tx, storeId, groupId, language) {
      const version = versions.get(key(groupId, language))
      return version?.storeId === storeId ? version : undefined
    },
    async saveVersion(_tx, version, changes, at) {
      return putVersion({
        ...version,
        slug: changes.slug !== undefined ? changes.slug : version.slug,
        draft: changes.draft ?? version.draft,
        rowVersion: version.rowVersion + 1,
        updatedAt: at,
      })
    },
    async publishVersion(_tx, version, at) {
      return putVersion({ ...version, status: 'published', published: version.draft ?? version.published, draft: null, publishedAt: version.publishedAt ?? at, rowVersion: version.rowVersion + 1, updatedAt: at })
    },
    async unpublishVersion(_tx, version, at) {
      return putVersion({ ...version, status: 'draft', rowVersion: version.rowVersion + 1, updatedAt: at })
    },
    async moveVersion(_tx, version, targetGroupId, at) {
      versions.delete(key(version.groupId, version.language))
      return putVersion({ ...version, groupId: targetGroupId, rowVersion: version.rowVersion + 1, updatedAt: at })
    },
    async removeVersion(_tx, storeId, groupId, language) {
      if (versions.get(key(groupId, language))?.storeId !== storeId)
        return false
      return versions.delete(key(groupId, language))
    },
    async linkCounts(_tx, storeId, groupId) {
      return {
        pins: [...mainStoryOf.values()].filter(pin => pin.storeId === storeId && pin.groupId === groupId).length,
        stories: [...groups.values()].filter(other => other.storeId === storeId && other.id !== groupId && other.relatedGroupIds.includes(groupId)).length,
      }
    },
    async deleteGroup(_tx, storeId, groupId, at) {
      if (groups.get(groupId)?.storeId !== storeId)
        return undefined
      const named = [...mainStoryOf.values()].filter(pin => pin.storeId === storeId && pin.groupId === groupId)
      for (const pin of named)
        pin.groupId = null
      const listing = [...groups.values()].filter(other => other.storeId === storeId && other.relatedGroupIds.includes(groupId))
      for (const other of listing)
        putGroup({ ...other, relatedGroupIds: other.relatedGroupIds.filter(id => id !== groupId), rowVersion: other.rowVersion + 1, updatedAt: at })
      const gone: { language: StoryVersion['language'], status: StoryVersion['status'] }[] = []
      for (const [k, version] of versions) {
        if (version.storeId === storeId && version.groupId === groupId) {
          gone.push({ language: version.language, status: version.status })
          versions.delete(k)
        }
      }
      groups.delete(groupId)
      return { pinsUnlinked: named.length, storiesUnlinked: listing.length, versions: gone }
    },
    // Mirrors the SQL: groups with a version, the search on either title, the tab, then the sort ending in id desc, then the page.
    async listGroups(_tx, storeId, query) {
      const needle = query.q?.toLowerCase()
      const rows = [...groups.values()].filter(group => group.storeId === storeId).flatMap((group) => {
        const own = [...versions.values()].filter(version => version.storeId === storeId && version.groupId === group.id)
        if (own.length === 0)
          return []
        return [{
          group,
          updatedAt: Math.max(...own.map(version => version.updatedAt.getTime())),
          row: {
            groupId: group.id,
            kind: group.kind,
            versions: own.map((version) => {
              const doc = version.draft ?? version.published
              return { language: version.language, status: version.status, title: doc?.title ?? '', coverMediaId: doc?.coverMediaId ?? null, everPublished: version.published !== null, editsNotLive: version.status === 'published' && version.draft !== null, rowVersion: version.rowVersion, updatedAt: version.updatedAt }
            }),
          } satisfies StoryListRow,
        }]
      }).filter(({ row }) => needle === undefined || needle === '' || row.versions.some(version => version.title.toLowerCase().includes(needle)))
      const live = (entry: (typeof rows)[number]) => entry.row.versions.some(version => version.status === 'published')
      const tabs = { all: rows.length, published: rows.filter(live).length, drafts: rows.filter(entry => !live(entry)).length }
      const shown = rows.filter(entry => query.status === 'all' || live(entry) === (query.status === 'published'))
      const key = (entry: (typeof rows)[number]) => (query.sort === 'created' ? entry.group.createdAt.getTime() : entry.updatedAt)
      shown.sort((a, b) => key(b) - key(a) || b.group.id.localeCompare(a.group.id))
      return { rows: shown.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(entry => entry.row), total: shown.length, tabs }
    },
    async findGroup(_tx, storeId, groupId) {
      const group = groups.get(groupId)
      return group?.storeId === storeId ? group : undefined
    },
  }
}
