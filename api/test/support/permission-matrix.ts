import type { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from '../../src/platform/http/app.ts'
import { randomUUID } from 'node:crypto'

// The permission matrix (delivery plan section 2, architecture section 12). It is generated from the OpenAPI
// document of the app that serves the requests, so a new /api/store/* route is checked without anyone writing
// a test for it.

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])
const pathParameter = /\{[^}]+\}/g
const storeLikeParameter = /\{[^}]*store[^}]*\}/i
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

// The one middleware that is meant to sit under /api/store/: the guard mounted in createApp.
const storeGuardPath = '/api/store/:storeId/*'

const toDocumentPath = (path: string) => path.replace(routeParameter, '{$1}')

// Routes the app serves under /api/store/ that the document lacks. A route registered with a plain `app.get`
// instead of `app.openapi` is one. A route registered with `app.all` is one too: it answers every method, and
// the document has no operation for it. The matrix would never call them, so the test fails and says why.
// Any other middleware under /api/store/ is reported as well, and the test names it so it can be allowed on purpose.
export function unlistedStoreRoutes(app: Pick<OpenAPIHono<AppEnv>, 'routes'>, document: { paths?: Record<string, object> }): string[] {
  const listed = new Set(storeOperations(document).map(({ method, path }) => `${method} ${path}`))
  const served = app.routes
    .filter(route => route.path.startsWith(storeRoutePrefix) && route.path !== storeGuardPath)
    .map(route => `${route.method} ${toDocumentPath(route.path)}`)
  return [...new Set(served)].filter(route => !listed.has(route)).sort()
}

// Public routes of a store are `/api/stores/{slug}/*` (architecture section 10). They carry a slug, not a store id,
// and no store guard. This is the only path family allowed to mention a store outside /api/store/{storeId}.
const publicStorePrefix = '/api/stores/{slug}/'

// Every path of the document or the app with a store-like parameter (`{storeId}`, `{store_id}`, `{store}`) that
// is not under /api/store/{storeId}, so the store guard would never see it.
export function storeParametersOutsideGuard(app: Pick<OpenAPIHono<AppEnv>, 'routes'>, document: { paths?: Record<string, object> }): string[] {
  const paths = [...Object.keys(document.paths ?? {}), ...app.routes.map(route => toDocumentPath(route.path))]
  return [...new Set(paths)]
    .filter(path => !path.startsWith(publicStorePrefix) && !path.startsWith('/api/store/{storeId}') && storeLikeParameter.test(path))
    .sort()
}

// Store operations in the contract that the matrix inventory lacks.
export function missingFromMatrix(contract: StoreOperation[], matrix: StoreOperation[]): string[] {
  const inMatrix = new Set(matrix.map(({ method, path }) => `${method} ${path}`))
  return contract.map(({ method, path }) => `${method} ${path}`).filter(route => !inMatrix.has(route))
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

// A body that passes the validation of each operation that takes one, so the answer comes from the guards and
// the permission check and not from a 400. Any other operation gets an empty object.
const exampleBodies: Record<string, object> = {
  'PATCH /api/store/{storeId}/information': { name: 'Name set by the matrix' },
}

// Calls one operation of the store as a caller. The request carries our own origin, JSON content type, a fresh
// Idempotency-Key for a command and a body that passes validation, so the answer is the guards' or the
// permission check's own and not the Origin rule's, the key middleware's or the validator's.
export async function callAs(app: Pick<OpenAPIHono<AppEnv>, 'request'>, operation: StoreOperation, storeId: string, caller: Caller, origin: string) {
  const isCommand = operation.method !== 'GET'
  const response = await app.request(storeUrl(operation.path, storeId), {
    method: operation.method,
    headers: { 'Origin': origin, 'Content-Type': 'application/json', ...(isCommand ? { 'Idempotency-Key': randomUUID() } : {}), ...caller.headers },
    body: isCommand ? JSON.stringify(exampleBodies[`${operation.method} ${operation.path}`] ?? {}) : undefined,
  })
  const problem = response.headers.get('Content-Type') === 'application/problem+json' ? await response.json() as { type: string, title: string } : undefined
  return { who: caller.who, status: response.status, type: problem?.type, title: problem?.title }
}

export async function outsiderAnswers(app: Pick<OpenAPIHono<AppEnv>, 'request'>, operation: StoreOperation, storeId: string, outsiders: Record<Outsider, Record<string, string>>, origin: string) {
  const answers = await Promise.all(outsiderOutcomes.map(({ who }) => callAs(app, operation, storeId, { who, headers: outsiders[who] }, origin)))
  return answers.map(({ who, status, type }) => ({ who, status, type }))
}

// What the store guard says to a caller who is not a member, so a test can tell it from the permission check's 403.
export const guardRefusalTitle = 'Only a member of this store may do this'

export const expectedOutsiderAnswers = outsiderOutcomes.map(({ who, status, type }) => ({ who, status, type }))

// The store's own owner must get past the guard: any answer but 401, 403 or 404 (a route that is not served).
export const refusedToTheOwner = new Set([401, 403, 404])
