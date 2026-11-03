import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { StoriesClient } from './client'

import { answer, keyed, loadClient, problemOf, timeout } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { gapsOf, PublishIncomplete } from './publish-incomplete'

// The generated body type reads a heading level as 2 only (openapi.json says `enum: [2]` where the schema allows 2 and 3),
// so the domain's `emptyStoryBody` does not assign to it; the same one-paragraph document is written out here.
// The generated `StoryVersion` is also typed `| null` (`type: ['object','null']` in openapi.json, taken from the nullable
// use in StoryGroupDetail), which a 201 never is; the answers are read as the contract's `StoryVersion`.
const emptyBody = { type: 'doc' as const, content: [{ type: 'paragraph' as const }] }

export function createStoriesClient(): StoriesClient {
  return {
    list: async ({ storeId }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/story-groups', { ...timeout(), params: { path: { storeId } } })),
    group: async ({ storeId, groupId }) =>
      answer((await loadClient()).GET('/api/store/{storeId}/story-groups/{groupId}', { ...timeout(), params: { path: { storeId, groupId } } })) as Promise<StoryGroupDetail>,
    createStory: async ({ storeId, authorName, idempotencyKey, versionIdempotencyKey }) => {
      try {
        const client = await loadClient()
        const group = await answer(client.POST('/api/store/{storeId}/story-groups', { ...keyed(idempotencyKey), params: { path: { storeId } }, body: { kind: 'story' } }))
        // The version needs the id of the group, so the two calls wait for each other.
        const version = await answer(client.POST('/api/store/{storeId}/story-groups/{groupId}/versions', {
          ...keyed(versionIdempotencyKey),
          params: { path: { storeId, groupId: group.id } },
          body: { language: 'en', draft: { title: '', excerpt: '', authorName, coverMediaId: null, body: emptyBody } },
        }))

        return { group, version: version as StoryVersion }
      }
      catch (error) {
        // The screen says one thing for either half: the story was not created. A lost connection passes through.
        throw error instanceof ApiProblem ? new ApiProblem(error.status, 'story-not-created', error.message, error.requestId) : error
      }
    },
    createVersion: async ({ storeId, groupId, idempotencyKey, ...body }) =>
      // `as never` and `as StoryVersion`: see the note on `emptyBody` and below.
      answer((await loadClient()).POST('/api/store/{storeId}/story-groups/{groupId}/versions', { ...keyed(idempotencyKey), params: { path: { storeId, groupId } }, body: body as never })) as Promise<StoryVersion>,
    saveVersion: async ({ storeId, groupId, language, ifMatch, idempotencyKey, ...body }) =>
      // `as never` and `as StoryVersion`: see the note on `emptyBody`.
      answer((await loadClient()).PATCH('/api/store/{storeId}/story-groups/{groupId}/versions/{language}', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, groupId, language }, header: { 'If-Match': String(ifMatch) } },
        body: body as never,
      })) as Promise<StoryVersion>,
    publishVersion: async ({ storeId, groupId, language, ifMatch, idempotencyKey }) => {
      const { data, error, response } = await (await loadClient()).POST('/api/store/{storeId}/story-groups/{groupId}/versions/{language}/publish', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, groupId, language }, header: { 'If-Match': String(ifMatch) } },
      })

      if (data === undefined) {
        const problem = problemOf(response, error)

        throw problem.type === 'publish-incomplete' ? new PublishIncomplete(problem, gapsOf(error)) : problem
      }

      return data as StoryVersion
    },
    unpublishVersion: async ({ storeId, groupId, language, ifMatch, idempotencyKey }) =>
      answer((await loadClient()).POST('/api/store/{storeId}/story-groups/{groupId}/versions/{language}/unpublish', {
        ...keyed(idempotencyKey),
        params: { path: { storeId, groupId, language }, header: { 'If-Match': String(ifMatch) } },
      })) as Promise<StoryVersion>,
    removeStory: async ({ storeId, groupId, versions }) => {
      const client = await loadClient()
      // One DELETE per version, none depends on another.
      const results = await Promise.all(versions.map(({ language, ifMatch, idempotencyKey }) =>
        client.DELETE('/api/store/{storeId}/story-groups/{groupId}/versions/{language}', {
          ...keyed(idempotencyKey),
          params: { header: { 'If-Match': String(ifMatch) }, path: { storeId, groupId, language } },
        }),
      ))
      const failed = results.find(({ response }) => !response.ok)

      if (failed)
        throw problemOf(failed.response, failed.error)
    },
  }
}
