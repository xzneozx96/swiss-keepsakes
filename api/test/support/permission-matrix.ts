import type { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from '../../src/platform/http/app.ts'
import { randomUUID } from 'node:crypto'

// The permission matrix (delivery plan section 2, architecture section 12). It is generated from the OpenAPI
// document of the app that serves the requests, so a new /api/store/* route is checked without anyone writing
// a test for it.

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])
const pathParameter = /\{[^}]+\}/g
const routeParameter = /:(\w+)(\{[^}]*\})?/g
const storeRoutePrefix = '/api/store/'

export interface StoreOperation {
  method: string
  path: string
}

// Every operation whose path is under /api/store/, which is what the store guard of createApp covers.
export function storeOperations(document: { paths?: Record<string, object> }): StoreOperation[] {
  return Object.entries(document.paths ?? {})
    .filter(([path]) => path.startsWith(storeRoutePrefix))
    .flatMap(([path, item]) => Object.keys(item).filter(method => httpMethods.has(method)).map(method => ({ method: method.toUpperCase(), path })))
}

// Routes the app serves under /api/store/ that the document lacks. A route registered with a plain `app.get`
// instead of `app.openapi` is one. The matrix would never call it, so the test fails on it and says why.
export function unlistedStoreRoutes(app: Pick<OpenAPIHono<AppEnv>, 'routes'>, document: { paths?: Record<string, object> }): string[] {
  const listed = new Set(storeOperations(document).map(({ method, path }) => `${method} ${path}`))
  const served = app.routes
    .filter(route => route.method !== 'ALL' && route.path.startsWith(storeRoutePrefix))
    .map(route => `${route.method} ${route.path.replace(routeParameter, '{$1}')}`)
  return [...new Set(served)].filter(route => !listed.has(route)).sort()
}

// Paths under /api/store/ whose first parameter is not the store id, so the store guard would not cover them.
export function storeOperationsOutsideGuard(operations: StoreOperation[]): StoreOperation[] {
  return operations.filter(({ path }) => path.split('/')[3] !== '{storeId}')
}

// The operation's URL in the given store. Every other path parameter gets a uuid, since the guard answers first.
export function storeUrl(path: string, storeId: string): string {
  const [, api, store, , ...rest] = path.split('/')
  return ['', api, store, storeId, ...rest.map(segment => segment.replace(pathParameter, randomUUID()))].join('/')
}

export interface Caller {
  who: string
  headers: Record<string, string>
}

// The people who must never get past the guard of a store they do not belong to, with what they get.
export const outsiderOutcomes = [
  { who: 'anonymous', status: 401, type: 'unauthenticated' },
  { who: 'guest', status: 403, type: 'forbidden' },
  { who: 'superAdmin', status: 403, type: 'forbidden' },
  { who: 'ownerElsewhere', status: 403, type: 'forbidden' },
  { who: 'managerElsewhere', status: 403, type: 'forbidden' },
] as const

export type Outsider = (typeof outsiderOutcomes)[number]['who']

// Calls one operation of the store as a caller. The request carries our own origin and, for a method with a
// body, JSON content type, so the Origin rule never answers in the guard's place. No body and no
// Idempotency-Key: the guard runs before both.
export async function callAs(app: Pick<OpenAPIHono<AppEnv>, 'request'>, operation: StoreOperation, storeId: string, caller: Caller, origin: string) {
  const response = await app.request(storeUrl(operation.path, storeId), {
    method: operation.method,
    headers: { 'Origin': origin, 'Content-Type': 'application/json', ...caller.headers },
  })
  const problem = response.headers.get('Content-Type') === 'application/problem+json' ? await response.json() as { type: string } : undefined
  return { who: caller.who, status: response.status, type: problem?.type }
}

export async function outsiderAnswers(app: Pick<OpenAPIHono<AppEnv>, 'request'>, operation: StoreOperation, storeId: string, outsiders: Record<Outsider, Record<string, string>>, origin: string) {
  return Promise.all(outsiderOutcomes.map(({ who }) => callAs(app, operation, storeId, { who, headers: outsiders[who] }, origin)))
}

export const expectedOutsiderAnswers = outsiderOutcomes.map(({ who, status, type }) => ({ who, status, type }))

// The store's own owner must get past the guard: any answer but 401, 403 or 404 (a route that is not served).
export const refusedToTheOwner = new Set([401, 403, 404])
