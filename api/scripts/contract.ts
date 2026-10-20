import type { OpenAPIHono } from '@hono/zod-openapi'
import type { OpenAPI3 } from 'openapi-typescript'
import type { AppEnv } from '../src/platform/http/app.ts'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'
import { z } from 'zod'
import { createApp } from '../src/platform/http/app.ts'
import { createLogger } from '../src/platform/logger.ts'

export const generatedDir = fileURLToPath(new URL('../../packages/api-contract/generated/', import.meta.url))

const header = `// Generated from the API routes by \`pnpm contract:build\`. Do not edit: the [E1.10] contract test fails on any difference.
/* eslint-disable */
`

// The real routes. Building the document calls neither the logger nor the health check.
export function contractApp(): OpenAPIHono<AppEnv> {
  // Building the document runs no handler, so the identity stand-ins are never called.
  return createApp(createLogger('silent'), async () => ({ database: true, jobs: true }), {
    authHandler: async () => new Response(null, { status: 404 }),
    origin: 'http://localhost',
    readSession: async () => ({ headers: new Headers(), response: null }),
    loadIdentity: async () => ({ guestId: '', access: { platformAdmin: false, memberships: [] } }),
  })
}

// Sorted by code unit, not by locale, so every machine writes the same bytes.
function sortKeys<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(sortKeys) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys((value as Record<string, unknown>)[key])])) as T
  return value
}

// zod-to-openapi makes one component per name and silently points every schema of that name at the first one.
// So each `.meta({ id })` must belong to one schema object, and each component must be named that way.
function assertOneSchemaPerName(app: OpenAPIHono<AppEnv>, components: string[]) {
  const ids = new Set<string>()
  // Each object is visited once, so a second schema with an id already seen is a different schema.
  const seen = new Set<object>()
  function visit(value: unknown) {
    if (typeof value !== 'object' || value === null || seen.has(value))
      return
    seen.add(value)
    if (value instanceof z.ZodType) {
      const id = z.globalRegistry.get(value)?.id
      if (id !== undefined && ids.has(id))
        throw new Error(`Two different schemas are named "${id}". Give one of them another id, or use the same schema object for both.`)
      if (id !== undefined)
        ids.add(id)
      visit(value._zod.def)
      return
    }
    for (const child of Object.values(value))
      visit(child)
  }
  visit(app.openAPIRegistry.definitions)
  const unnamed = components.filter(name => !ids.has(name))
  if (unnamed.length > 0)
    throw new Error(`Schema components ${unnamed.join(', ')} are not named with .meta({ id }). Name a shared schema in packages/api-contract with .meta({ id }), not .openapi(name).`)
}

export function openApiDocument(app: OpenAPIHono<AppEnv>) {
  const document = app.getOpenAPI31Document({ openapi: '3.1.0', info: { title: 'Swiss Keepsakes API', version: '0.0.0' } })
  assertOneSchemaPerName(app, Object.keys(document.components?.schemas ?? {}))
  return sortKeys(document)
}

// The OpenAPI document of the app and the types openapi-typescript makes from it, by file name in generated/.
// `pnpm contract:build` writes them for the real app, and the contract test compares them with the committed files.
export async function generateContract(app = contractApp()): Promise<Record<string, string>> {
  const document = openApiDocument(app)
  const types = astToString(await openapiTS(document as OpenAPI3, { alphabetize: true }))
  return {
    'openapi.json': `${JSON.stringify(document, null, 2)}\n`,
    'schema.ts': `${header}\n${types}`,
  }
}
