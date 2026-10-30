import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { CreateProductInput } from '../application/create-product.ts'
import type { Result } from '../application/failure.ts'
import type { ProductListEntry } from '../application/list-products.ts'
import type { ProductDetail } from '../application/product-detail.ts'
import type { OptionInput, OptionsSave, ProductChanges, VariantChanges, VariantInput } from '../ports.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { optionsSaveBodySchema, productCreateBodySchema, productListSchema, productSaveBodySchema, productSchema, variantCreateBodySchema, variantSaveBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { readIfMatch } from './if-match.ts'
import { failureProblem } from './problems.ts'
import { productListItemView, productView } from './product-view.ts'
import { etag, etagHeaders, json, storeParams, withIfMatch } from './route-parts.ts'

// What the catalog routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface CatalogUseCases {
  listProducts: (actor: Actor, storeId: string) => Promise<Result<ProductListEntry[]>>
  getProduct: (actor: Actor, storeId: string, productId: string) => Promise<Result<ProductDetail>>
  createProduct: (actor: Actor, storeId: string, input: CreateProductInput, requestId: string | null) => Promise<Result<ProductDetail>>
  saveProduct: (actor: Actor, storeId: string, productId: string, ifMatch: number, changes: ProductChanges, requestId: string | null) => Promise<Result<ProductDetail>>
  publishProduct: (actor: Actor, storeId: string, productId: string, ifMatch: number, requestId: string | null) => Promise<Result<ProductDetail>>
  unpublishProduct: (actor: Actor, storeId: string, productId: string, ifMatch: number, requestId: string | null) => Promise<Result<ProductDetail>>
  saveVariant: (actor: Actor, storeId: string, productId: string, skuId: string, changes: VariantChanges, requestId: string | null) => Promise<Result<ProductDetail>>
  saveOptions: (actor: Actor, storeId: string, productId: string, ifMatch: number, input: OptionsSave, requestId: string | null) => Promise<Result<ProductDetail>>
  createVariant: (actor: Actor, storeId: string, productId: string, input: VariantInput, requestId: string | null) => Promise<Result<ProductDetail>>
}

const productParams = z.object({ storeId: z.uuid(), productId: z.uuid() })
const variantParams = z.object({ storeId: z.uuid(), productId: z.uuid(), skuId: z.uuid() })

const productsPath = '/api/store/{storeId}/products'

const listRoute = createRoute({
  method: 'get',
  path: productsPath,
  request: { params: storeParams },
  responses: {
    200: { description: 'The keepsakes of the store, newest first', headers: requestIdHeader, content: json(productListSchema) },
    ...problemResponses,
  },
})

const createRoutePart = createRoute({
  method: 'post',
  path: productsPath,
  request: { params: storeParams, body: { required: true, content: json(productCreateBodySchema) } },
  responses: {
    201: { description: 'The new draft keepsake with its options and its variants for sale', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const getRoute = createRoute({
  method: 'get',
  path: `${productsPath}/{productId}`,
  request: { params: productParams },
  responses: {
    200: { description: 'The keepsake with its working copy and publish checks', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const saveRoute = createRoute({
  method: 'patch',
  path: `${productsPath}/{productId}`,
  request: { params: productParams, ...withIfMatch, body: { required: true, content: json(productSaveBodySchema) } },
  responses: {
    200: { description: 'The keepsake with the change saved. A left-out field stays, a list replaces', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const publishRoute = createRoute({
  method: 'post',
  path: `${productsPath}/{productId}/publish`,
  request: { params: productParams, ...withIfMatch },
  responses: {
    200: { description: 'The keepsake is live with its working copy', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const unpublishRoute = createRoute({
  method: 'post',
  path: `${productsPath}/{productId}/unpublish`,
  request: { params: productParams, ...withIfMatch },
  responses: {
    200: { description: 'The keepsake is a draft again. Its live text is kept', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const optionsRoute = createRoute({
  method: 'put',
  path: `${productsPath}/{productId}/options`,
  request: { params: productParams, ...withIfMatch, body: { required: true, content: json(optionsSaveBodySchema) } },
  responses: {
    200: { description: 'The options are saved with the new values of the variants, all or nothing. The row version moves', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const createVariantRoute = createRoute({
  method: 'post',
  path: `${productsPath}/{productId}/variants`,
  request: { params: productParams, body: { required: true, content: json(variantCreateBodySchema) } },
  responses: {
    201: { description: 'The keepsake with the new variant. It is live at once and takes no row version', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

const variantRoute = createRoute({
  method: 'patch',
  path: `${productsPath}/{productId}/variants/{skuId}`,
  request: { params: variantParams, body: { required: true, content: json(variantSaveBodySchema) } },
  responses: {
    200: { description: 'The keepsake with the variant changed. The change is live at once and takes no row version. Archiving is final', headers: etagHeaders, content: json(productSchema) },
    ...problemResponses,
  },
})

type OptionBody = NonNullable<z.infer<typeof optionsSaveBodySchema>['options']>[number]

function optionInput(option: OptionBody): OptionInput {
  return {
    ref: option.ref,
    name: option.name,
    values: option.values.map(value => ({ ref: value.ref, label: value.label, swatch: value.swatch ?? null })),
  }
}

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerCatalogRoutes(app: OpenAPIHono<AppEnv>, useCases: CatalogUseCases): void {
  app.openapi(listRoute, async (c) => {
    const result = await useCases.listProducts(c.get('actor'), c.get('store').storeId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json({ items: result.value.map(productListItemView) }, 200)
  })

  app.openapi(createRoutePart, async (c) => {
    const { name, text, photoIds, commissionRate, options, variants } = c.req.valid('json')
    const result = await useCases.createProduct(c.get('actor'), c.get('store').storeId, {
      name,
      text: text ?? {},
      photoIds: photoIds ?? [],
      commissionRate: commissionRate ?? 0,
      options: (options ?? []).map(optionInput),
      variants: variants.map(({ skuCode, priceRappen, values }) => ({ skuCode, priceRappen, status: 'published' as const, values: values ?? {} })),
    }, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 201, etag(result.value.product))
  })

  app.openapi(getRoute, async (c) => {
    const result = await useCases.getProduct(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(saveRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { name, text, photoIds, commissionRate } = c.req.valid('json')
    const changes: ProductChanges = {
      ...(name !== undefined && { name }),
      ...(text !== undefined && { text }),
      ...(photoIds !== undefined && { media: photoIds }),
      ...(commissionRate !== undefined && { commissionRate }),
    }
    const result = await useCases.saveProduct(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId, ifMatch.version, changes, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(publishRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.publishProduct(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(unpublishRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const result = await useCases.unpublishProduct(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId, ifMatch.version, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(variantRoute, async (c) => {
    const { productId, skuId } = c.req.valid('param')
    const { skuCode, priceRappen, status, values } = c.req.valid('json')
    const changes: VariantChanges = {
      ...(skuCode !== undefined && { skuCode }),
      ...(priceRappen !== undefined && { priceRappen }),
      ...(status !== undefined && { status }),
      ...(values !== undefined && { values }),
    }
    const result = await useCases.saveVariant(c.get('actor'), c.get('store').storeId, productId, skuId, changes, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(optionsRoute, async (c) => {
    const ifMatch = readIfMatch(c)
    if (!ifMatch.ok)
      return ifMatch.response
    const { options, variantValues } = c.req.valid('json')
    const result = await useCases.saveOptions(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId, ifMatch.version, {
      options: options.map(optionInput),
      variantValues: variantValues ?? [],
    }, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 200, etag(result.value.product))
  })

  app.openapi(createVariantRoute, async (c) => {
    const { skuCode, priceRappen, status, values } = c.req.valid('json')
    const result = await useCases.createVariant(c.get('actor'), c.get('store').storeId, c.req.valid('param').productId, {
      skuCode,
      priceRappen,
      status: status ?? 'published',
      values: values ?? {},
    }, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(productView(result.value), 201, etag(result.value.product))
  })
}
