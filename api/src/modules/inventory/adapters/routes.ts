import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor } from '@sk/domain/identity'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { Result } from '../application/failure.ts'
import type { StockItemEntry } from '../application/get-stock-item.ts'
import type { StockFilter, StockListEntry } from '../application/list-stock.ts'
import type { StockEntry } from '../application/stock-entry.ts'
import { createRoute } from '@hono/zod-openapi'
import { stockItemSchema, stockListQuerySchema, stockListSchema, stockManySchema, stockManySetBodySchema, stockRowSchema, stockSetBodySchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'
import { failureProblem } from './problems.ts'
import { itemParams, json, storeParams } from './route-parts.ts'
import { stockItemView, stockListView, stockRowView } from './stock-view.ts'

// What the inventory routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export interface InventoryUseCases {
  listStock: (actor: Actor, storeId: string, query: { filter?: StockFilter, q?: string }) => Promise<Result<StockListEntry>>
  getStockItem: (actor: Actor, storeId: string, skuId: string) => Promise<Result<StockItemEntry>>
  setStock: (actor: Actor, storeId: string, skuId: string, onHand: number, requestId: string | null) => Promise<Result<StockEntry>>
  setManyStock: (actor: Actor, storeId: string, items: { skuId: string, onHand: number }[], requestId: string | null) => Promise<Result<StockEntry[]>>
}

const inventoryPath = '/api/store/{storeId}/inventory'

const listRoute = createRoute({
  method: 'get',
  path: inventoryPath,
  request: { params: storeParams, query: stockListQuerySchema },
  responses: {
    200: { description: 'The live variants of the store with their stock, and the tab counts of the whole store', headers: requestIdHeader, content: json(stockListSchema) },
    ...problemResponses,
  },
})

const setManyRoute = createRoute({
  method: 'put',
  path: inventoryPath,
  request: { params: storeParams, body: { required: true, content: json(stockManySetBodySchema) } },
  responses: {
    200: { description: 'The stock of every listed variant is set, all or nothing. A value below the reserved units refuses the whole request with stock-below-reserved, naming the variant', headers: requestIdHeader, content: json(stockManySchema) },
    ...problemResponses,
  },
})

const getRoute = createRoute({
  method: 'get',
  path: `${inventoryPath}/{skuId}`,
  request: { params: itemParams },
  responses: {
    200: { description: 'One variant with the open orders that hold its units', headers: requestIdHeader, content: json(stockItemSchema) },
    ...problemResponses,
  },
})

const setRoute = createRoute({
  method: 'put',
  path: `${inventoryPath}/{skuId}`,
  request: { params: itemParams, body: { required: true, content: json(stockSetBodySchema) } },
  responses: {
    200: { description: 'The stock is set. A value below the reserved units is refused with stock-below-reserved and the reserved count. The same value changes nothing', headers: requestIdHeader, content: json(stockRowSchema) },
    ...problemResponses,
  },
})

// The Idempotency-Key middleware and the store guard sit before these (createApp), so the handlers read the
// verified store from `c.get('store')`, never from the path.
export function registerInventoryRoutes(app: OpenAPIHono<AppEnv>, useCases: InventoryUseCases): void {
  app.openapi(listRoute, async (c) => {
    const { filter, q } = c.req.valid('query')
    const result = await useCases.listStock(c.get('actor'), c.get('store').storeId, { ...(filter && { filter }), ...(q && { q }) })
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(stockListView(result.value), 200)
  })

  app.openapi(setManyRoute, async (c) => {
    const result = await useCases.setManyStock(c.get('actor'), c.get('store').storeId, c.req.valid('json').items, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json({ items: result.value.map(stockRowView) }, 200)
  })

  app.openapi(getRoute, async (c) => {
    const result = await useCases.getStockItem(c.get('actor'), c.get('store').storeId, c.req.valid('param').skuId)
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(stockItemView(result.value), 200)
  })

  app.openapi(setRoute, async (c) => {
    const result = await useCases.setStock(c.get('actor'), c.get('store').storeId, c.req.valid('param').skuId, c.req.valid('json').onHand, c.get('requestId'))
    if (!result.ok)
      return problem(c, failureProblem(result))
    return c.json(stockRowView(result.value), 200)
  })
}
