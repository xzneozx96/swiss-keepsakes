import type { StoryGroup, StoryVersion } from '@sk/domain/content'
import type { StoryRepository } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'

const key = (groupId: string, language: string) => `${groupId}/${language}`

// An in-memory story repository. It copies what the SQL one does, but none of the database guards.
export function createFakeStories(): StoryRepository<null> & { groups: Map<string, StoryGroup>, versions: Map<string, StoryVersion> } {
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
      return putGroup({ ...group, ...changes, rowVersion: group.rowVersion + 1, updatedAt: at })
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
  }
}
