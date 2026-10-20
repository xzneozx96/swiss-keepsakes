import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Clock } from '../../src/platform/clock.ts'
import type { AppEnv } from '../../src/platform/http/app.ts'
import type { SigningKey } from './identity.ts'
import { randomUUID } from 'node:crypto'
import { signToken } from './identity.ts'

// The permission matrix (delivery plan section 2, architecture section 12) is generated from the OpenAPI
// document, so a new /api/store/* route is checked without anyone writing a test for it.

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])
const pathParameter = /\{[^}]+\}/g

export interface StoreOperation {
  method: string
  path: string
}

// Every operation whose path is under /api/store/, which is what the store guard in createApp covers.
export function storeOperations(document: { paths?: Record<string, object> }): StoreOperation[] {
  return Object.entries(document.paths ?? {})
    .filter(([path]) => path.startsWith('/api/store/'))
    .flatMap(([path, item]) => Object.keys(item).filter(method => httpMethods.has(method)).map(method => ({ method: method.toUpperCase(), path })))
}

// The operation's URL in the given store. Every other path parameter gets a uuid, since the guard answers first.
export function storeUrl(path: string, storeId: string): string {
  const [, api, store, , ...rest] = path.split('/')
  return ['', api, store, storeId, ...rest.map(segment => segment.replace(pathParameter, randomUUID()))].join('/')
}

// The people who must never get past the guard of a store they do not belong to, with what they get.
export const outsiderOutcomes = [
  { who: 'anonymous', status: 401, type: 'unauthenticated' },
  { who: 'guest', status: 403, type: 'forbidden' },
  { who: 'superAdmin', status: 403, type: 'forbidden' },
  { who: 'ownerElsewhere', status: 403, type: 'forbidden' },
  { who: 'managerElsewhere', status: 403, type: 'forbidden' },
] as const

export type Outsider = Exclude<(typeof outsiderOutcomes)[number]['who'], 'anonymous'>

// Calls one operation of the store as each outsider. No body and no Idempotency-Key: the guard runs before both.
export async function outsiderAnswers(app: Pick<OpenAPIHono<AppEnv>, 'request'>, operation: StoreOperation, storeId: string, key: SigningKey, clock: Clock, userIds: Record<Outsider, string>) {
  const url = storeUrl(operation.path, storeId)
  return Promise.all(outsiderOutcomes.map(async ({ who }) => {
    const headers: Record<string, string> = who === 'anonymous' ? {} : { Authorization: `Bearer ${await signToken(key, clock, { sub: userIds[who] })}` }
    const response = await app.request(url, { method: operation.method, headers })
    const problem = response.headers.get('Content-Type') === 'application/problem+json' ? await response.json() as { type: string } : undefined
    return { who, status: response.status, type: problem?.type }
  }))
}
