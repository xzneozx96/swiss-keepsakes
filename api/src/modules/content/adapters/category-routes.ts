import type { OpenAPIHono } from '@hono/zod-openapi'
import type { CategoryKind } from '@sk/api-contract'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { CategoryRow } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { categoryKindSchema, categoryOrderBodySchema, categoryPatchBodySchema, categoryWriteBodySchema, merchantCategoryListSchema, merchantCategorySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { categoryView } from './category-view.ts'
import { failureProblem } from './problems.ts'
import { json } from './route-parts.ts'

interface Name { en?: string | null, de?: string | null }

// What the category routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface CategoryUseCases {
  listMerchantCategories: (actor: Actor, storeId: string, kind: CategoryKind) => Promise<Result<CategoryRow[]>>
  createCategory: (actor: Actor, storeId: string, kind: CategoryKind, input: { name: Name, parentId?: string | null }, requestId: string | null) => Promise<Result<CategoryRow>>
  saveCategory: (actor: Actor, storeId: string, kind: CategoryKind, id: string, input: { name?: Name, parentId?: string | null }, requestId: string | null) => Promise<Result<CategoryRow>>
  reorderCategories: (actor: Actor, storeId: string, kind: CategoryKind, input: { parentId: string | null, ids: string[] }, requestId: string | null) => Promise<Result<CategoryRow[]>>
  deleteCategory: (actor: Actor, storeId: string, kind: CategoryKind, id: string, requestId: string | null) => Promise<Result<{ id: string }>>
}

const listParams = z.object({ storeId: z.uuid(), kind: categoryKindSchema })
const itemParams = z.object({ storeId: z.uuid(), kind: categoryKindSchema, categoryId: z.uuid() })

const listRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/categories/{kind}',
  request: { params: listParams },
  responses: { 200: { description: 'Every category of the list, top level first, each by position', headers: requestIdHeader, content: json(merchantCategoryListSchema) }, ...problemResponses },
})

const createCategoryRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/categories/{kind}',
  request: { params: listParams, body: { required: true, content: json(categoryWriteBodySchema) } },
  responses: { 201: { description: 'The new category, last among its siblings', headers: requestIdHeader, content: json(merchantCategorySchema) }, ...problemResponses },
})

// Registered before the {categoryId} routes, so `order` is never read as a category id.
const reorderRoute = createRoute({
  method: 'put',
  path: '/api/store/{storeId}/categories/{kind}/order',
  request: { params: listParams, body: { required: true, content: json(categoryOrderBodySchema) } },
  responses: { 200: { description: 'The whole list in its new order', headers: requestIdHeader, content: json(merchantCategoryListSchema) }, ...problemResponses },
})

const saveRoute = createRoute({
  method: 'patch',
  path: '/api/store/{storeId}/categories/{kind}/{categoryId}',
  request: { params: itemParams, body: { required: true, content: json(categoryPatchBodySchema) } },
  responses: { 200: { description: 'The category with the change saved. The last write wins', headers: requestIdHeader, content: json(merchantCategorySchema) }, ...problemResponses },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/store/{storeId}/categories/{kind}/{categoryId}',
  request: { params: itemParams },
  responses: { 204: { description: 'The category is deleted. Refused while it has a sub-category or content tagged with it', headers: requestIdHeader }, ...problemResponses },
})

// The store guard and the Idempotency-Key middleware sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerCategoryRoutes(app: OpenAPIHono<AppEnv>, useCases: CategoryUseCases): void {
  app.openapi(listRoute, async (c) => {
    const result = await useCases.listMerchantCategories(c.get('actor'), c.get('store').storeId, c.req.valid('param').kind)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json({ items: result.value.map(categoryView) }, 200)
  })

  app.openapi(createCategoryRoute, async (c) => {
    const result = await useCases.createCategory(c.get('actor'), c.get('store').storeId, c.req.valid('param').kind, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(categoryView(result.value), 201)
  })

  app.openapi(reorderRoute, async (c) => {
    const result = await useCases.reorderCategories(c.get('actor'), c.get('store').storeId, c.req.valid('param').kind, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json({ items: result.value.map(categoryView) }, 200)
  })

  app.openapi(saveRoute, async (c) => {
    const { kind, categoryId } = c.req.valid('param')
    const result = await useCases.saveCategory(c.get('actor'), c.get('store').storeId, kind, categoryId, c.req.valid('json'), c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(categoryView(result.value), 200)
  })

  app.openapi(deleteRoute, async (c) => {
    const { kind, categoryId } = c.req.valid('param')
    const result = await useCases.deleteCategory(c.get('actor'), c.get('store').storeId, kind, categoryId, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result.reason === 'in-use' ? { reason: 'category-in-use' } : result))
    return c.body(null, 204)
  })
}
