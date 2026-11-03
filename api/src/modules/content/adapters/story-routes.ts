import type { Hook, OpenAPIHono } from '@hono/zod-openapi'
import type { StoryGroup, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { StoryGroupInput } from '../application/create-story-group.ts'
import type { StoryGroupDeleted } from '../application/delete-story-group.ts'
import type { Result } from '../application/failure.ts'
import type { StoryGroupRead } from '../application/get-story-group.ts'
import type { StoryVersionText } from '../application/get-story-version-text.ts'
import type { StoryListEntry } from '../application/list-story-groups.ts'
import type { StoryGroupChanges, StoryLinkCounts, StoryVersionChanges } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { storyDeletedSchema, storyGroupCreateBodySchema, storyGroupDetailSchema, storyGroupSaveBodySchema, storyGroupSchema, storyLinksSchema, storyListSchema, storyVersionCreateBodySchema, storyVersionMoveBodySchema, storyVersionSaveBodySchema, storyVersionSchema, storyVersionTextSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { readIfMatch } from './if-match.ts'
import { failureProblem } from './problems.ts'
import { etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'
import { storyGroupDetailView, storyGroupView, storyListView, storyVersionTextView, storyVersionView } from './story-view.ts'

type Language = StoryVersion['language']

// What the story routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface StoryUseCases {
  createStoryGroup: (actor: Actor, storeId: string, input: StoryGroupInput, requestId: string | null) => Promise<Result<StoryGroup>>
  saveStoryGroup: (actor: Actor, storeId: string, groupId: string, ifMatch: number, changes: StoryGroupChanges, requestId: string | null) => Promise<Result<StoryGroup>>
  createStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, changes: StoryVersionChanges, requestId: string | null) => Promise<Result<StoryVersion>>
  saveStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, ifMatch: number, changes: StoryVersionChanges, requestId: string | null) => Promise<Result<StoryVersion>>
  publishStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, ifMatch: number, requestId: string | null) => Promise<Result<StoryVersion>>
  unpublishStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, ifMatch: number, requestId: string | null) => Promise<Result<StoryVersion>>
  moveStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, ifMatch: number, targetGroupId: string, requestId: string | null) => Promise<Result<StoryVersion>>
  listStoryGroups: (actor: Actor, storeId: string) => Promise<Result<StoryListEntry[]>>
  getStoryGroup: (actor: Actor, storeId: string, groupId: string) => Promise<Result<StoryGroupRead>>
  getStoryVersionText: (actor: Actor, storeId: string, groupId: string, language: Language) => Promise<Result<StoryVersionText>>
  getStoryLinks: (actor: Actor, storeId: string, groupId: string) => Promise<Result<StoryLinkCounts>>
  deleteStoryGroup: (actor: Actor, storeId: string, groupId: string, requestId: string | null) => Promise<Result<StoryGroupDeleted>>
  // Turns a stored file key into its public URL, for the files a text names.
  publicUrl: (key: string) => string
  deleteStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, ifMatch: number, requestId: string | null) => Promise<Result<{ groupId: string, language: Language }>>
}

const groupParams = z.object({ storeId: z.uuid(), groupId: z.uuid() })
const versionParams = z.object({ storeId: z.uuid(), groupId: z.uuid(), language: z.enum(['en', 'de']) })

// A body document outside the allow-list is 422 (the request is well formed and the content is refused), with the
// path of the first fault. Every other validation fault keeps the platform's 400 and its shape.
// A body can hold thousands of faults; the answer names the first few, so the problem body stays small.
const maxIssuesShown = 20

function bodyRefused<I>(...[result, c]: Parameters<Hook<I, AppEnv, string, never>>): never | undefined {
  if (result.success)
    return undefined
  const first = result.error.issues[0]
  // The route's own document lists only its success status, so the problem response is typed as never, as with the defaultHook.
  return problem(c, {
    type: 'validation-failed',
    status: first?.path[0] === 'draft' && first.path[1] === 'body' ? 422 : 400,
    title: 'The request is not valid',
    errors: result.error.issues.slice(0, maxIssuesShown).map(issue => ({ in: result.target, path: issue.path.join('.'), message: issue.message })),
  }) as never
}

const groupsPath = '/api/store/{storeId}/story-groups'
const versionPath = `${groupsPath}/{groupId}/versions/{language}`

const getVersionTextRoute = createRoute({
  method: 'get',
  path: versionPath,
  request: { params: versionParams },
  responses: {
    200: { description: 'The text of the version as the editor last left it, for a preview. 404 when the group has no version in the language', headers: requestIdHeader, content: json(storyVersionTextSchema) },
    ...problemResponses,
  },
})

const listGroupsRoute = createRoute({
  method: 'get',
  path: groupsPath,
  request: { params: storeParams },
  responses: {
    200: { description: 'The story groups of the store that have a version, with the state of each language version, most recently updated first', headers: requestIdHeader, content: json(storyListSchema) },
    ...problemResponses,
  },
})

const getGroupRoute = createRoute({
  method: 'get',
  path: `${groupsPath}/{groupId}`,
  request: { params: groupParams },
  responses: {
    200: { description: 'The group with its English and German versions. The ETag is the group\'s row version', headers: etagHeaders, content: json(storyGroupDetailSchema) },
    ...problemResponses,
  },
})

const getLinksRoute = createRoute({
  method: 'get',
  path: `${groupsPath}/{groupId}/links`,
  request: { params: groupParams },
  responses: {
    200: { description: 'How many pins name the story as their main story and how many other stories list it as related, for the Delete story confirm', headers: requestIdHeader, content: json(storyLinksSchema) },
    ...problemResponses,
  },
})

const deleteGroupRoute = createRoute({
  method: 'delete',
  path: `${groupsPath}/{groupId}`,
  request: { params: groupParams },
  responses: {
    200: { description: 'The story is deleted with both language versions, whatever their status, in one transaction. Pins that named it lose their main story, other stories stop listing it. No If-Match: the story goes whatever its row version', headers: requestIdHeader, content: json(storyDeletedSchema) },
    ...problemResponses,
  },
})

const createGroupRoute = createRoute({
  method: 'post',
  path: groupsPath,
  request: { params: storeParams, body: { required: true, content: json(storyGroupCreateBodySchema) } },
  responses: {
    201: { description: 'The new story group, with no version yet', headers: etagHeaders, content: json(storyGroupSchema) },
    ...problemResponses,
  },
})

const saveGroupRoute = createRoute({
  method: 'patch',
  path: `${groupsPath}/{groupId}`,
  request: { params: groupParams, ...withIfMatch, body: { required: true, content: json(storyGroupSaveBodySchema) } },
  responses: {
    200: { description: 'The group with the change saved. A left-out field stays, a list replaces', headers: etagHeaders, content: json(storyGroupSchema) },
    ...problemResponses,
  },
})

const createVersionRoute = createRoute({
  method: 'post',
  path: `${groupsPath}/{groupId}/versions`,
  request: { params: groupParams, body: { required: true, content: json(storyVersionCreateBodySchema) } },
  responses: {
    201: { description: 'The new draft version in that language', headers: etagHeaders, content: json(storyVersionSchema) },
    ...problemResponses,
  },
})

const saveVersionRoute = createRoute({
  method: 'patch',
  path: versionPath,
  request: { params: versionParams, ...withIfMatch, body: { required: true, content: json(storyVersionSaveBodySchema) } },
  responses: {
    200: { description: 'The version with the draft saved. A save replaces the whole draft document', headers: etagHeaders, content: json(storyVersionSchema) },
    ...problemResponses,
  },
})

const publishVersionRoute = createRoute({
  method: 'post',
  path: `${versionPath}/publish`,
  request: { params: versionParams, ...withIfMatch },
  responses: {
    200: { description: 'This language is live with its draft. Other languages are not touched', headers: etagHeaders, content: json(storyVersionSchema) },
    ...problemResponses,
  },
})

const unpublishVersionRoute = createRoute({
  method: 'post',
  path: `${versionPath}/unpublish`,
  request: { params: versionParams, ...withIfMatch },
  responses: {
    200: { description: 'The version is a draft again. Its published text is kept', headers: etagHeaders, content: json(storyVersionSchema) },
    ...problemResponses,
  },
})

const moveVersionRoute = createRoute({
  method: 'post',
  path: `${versionPath}/move`,
  request: { params: versionParams, ...withIfMatch, body: { required: true, content: json(storyVersionMoveBodySchema) } },
  responses: {
    200: { description: 'The draft version now belongs to the target group. A published version cannot move', headers: etagHeaders, content: json(storyVersionSchema) },
    ...problemResponses,
  },
})

const deleteVersionRoute = createRoute({
  method: 'delete',
  path: versionPath,
  request: { params: versionParams, ...withIfMatch },
  responses: {
    204: { description: 'The version is deleted. Only a version that never held published text can be', headers: requestIdHeader },
    ...problemResponses,
  },
})

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerStoryRoutes(app: OpenAPIHono<AppEnv>, useCases: StoryUseCases): void {
  app.openapi(listGroupsRoute, async (c) => {
    const result = await useCases.listStoryGroups(c.get('actor'), c.get('store').storeId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyListView(result.value, useCases.publicUrl), 200)
  })

  app.openapi(getGroupRoute, async (c) => {
    const result = await useCases.getStoryGroup(c.get('actor'), c.get('store').storeId, c.req.valid('param').groupId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyGroupDetailView(result.value), 200, etag(result.value.group))
  })

  app.openapi(getLinksRoute, async (c) => {
    const result = await useCases.getStoryLinks(c.get('actor'), c.get('store').storeId, c.req.valid('param').groupId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })

  app.openapi(deleteGroupRoute, async (c) => {
    const result = await useCases.deleteStoryGroup(c.get('actor'), c.get('store').storeId, c.req.valid('param').groupId, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(result.value, 200)
  })

  app.openapi(getVersionTextRoute, async (c) => {
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.getStoryVersionText(c.get('actor'), c.get('store').storeId, groupId, language)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionTextView(result.value, useCases.publicUrl), 200)
  })

  app.openapi(createGroupRoute, async (c) => {
    const { kind, subjectPlaceId, ...changes } = c.req.valid('json')
    const result = await useCases.createStoryGroup(c.get('actor'), c.get('store').storeId, { kind, subjectPlaceId: subjectPlaceId ?? null, ...changes }, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyGroupView(result.value), 201, etag(result.value))
  })

  app.openapi(saveGroupRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.saveStoryGroup(c.get('actor'), c.get('store').storeId, c.req.valid('param').groupId, ifMatch.version, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyGroupView(result.value), 200, etag(result.value))
  })

  app.openapi(createVersionRoute, async (c) => {
    const { language, ...changes } = c.req.valid('json')
    const result = await useCases.createStoryVersion(c.get('actor'), c.get('store').storeId, c.req.valid('param').groupId, language, changes, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 201, etag(result.value))
  }, bodyRefused)

  app.openapi(saveVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.saveStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 200, etag(result.value))
  }, bodyRefused)

  app.openapi(publishVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.publishStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 200, etag(result.value))
  })

  app.openapi(unpublishVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.unpublishStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 200, etag(result.value))
  })

  app.openapi(moveVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.moveStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.req.valid('json').targetGroupId, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 200, etag(result.value))
  })

  app.openapi(deleteVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.deleteStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.body(null, 204)
  })
}
