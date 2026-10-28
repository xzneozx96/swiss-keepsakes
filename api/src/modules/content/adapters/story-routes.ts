import type { OpenAPIHono } from '@hono/zod-openapi'
import type { StoryGroup, StoryVersion } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { StoryGroupInput } from '../application/create-story-group.ts'
import type { Result } from '../application/failure.ts'
import type { StoryGroupChanges, StoryVersionChanges } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { storyGroupCreateBodySchema, storyGroupSaveBodySchema, storyGroupSchema, storyVersionCreateBodySchema, storyVersionMoveBodySchema, storyVersionSaveBodySchema, storyVersionSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { readIfMatch } from './if-match.ts'
import { failureProblem } from './problems.ts'
import { json, withIfMatch } from './route-parts.ts'
import { storyGroupView, storyVersionView } from './story-view.ts'

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
  deleteStoryVersion: (actor: Actor, storeId: string, groupId: string, language: Language, requestId: string | null) => Promise<Result<{ groupId: string, language: Language }>>
}

const storeParams = z.object({ storeId: z.uuid() })
const groupParams = z.object({ storeId: z.uuid(), groupId: z.uuid() })
const versionParams = z.object({ storeId: z.uuid(), groupId: z.uuid(), language: z.enum(['en', 'de']) })
const etagHeaders = { ...requestIdHeader, ETag: { description: 'The row version, as `"<rowVersion>"`', schema: { type: 'string' } } } as const

const groupsPath = '/api/store/{storeId}/story-groups'
const versionPath = `${groupsPath}/{groupId}/versions/{language}`

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
  request: { params: versionParams },
  responses: {
    204: { description: 'The version is deleted. Only a version that never held published text can be', headers: requestIdHeader },
    ...problemResponses,
  },
})

const etag = (row: { rowVersion: number }) => ({ ETag: `"${row.rowVersion}"` })

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerStoryRoutes(app: OpenAPIHono<AppEnv>, useCases: StoryUseCases): void {
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
  })

  app.openapi(saveVersionRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.saveStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, ifMatch.version, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(storyVersionView(result.value), 200, etag(result.value))
  })

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
    const { groupId, language } = c.req.valid('param')
    const result = await useCases.deleteStoryVersion(c.get('actor'), c.get('store').storeId, groupId, language, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.body(null, 204)
  })
}
