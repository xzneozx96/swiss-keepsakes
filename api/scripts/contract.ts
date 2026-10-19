import type { OpenAPI3 } from 'openapi-typescript'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'
import { createApp } from '../src/platform/http/app.ts'
import { createLogger } from '../src/platform/logger.ts'

export const generatedDir = fileURLToPath(new URL('../../packages/api-contract/generated/', import.meta.url))

const header = `// Generated from the API routes by \`pnpm contract:build\`. Do not edit: the [E1.10] contract test fails on any difference.
/* eslint-disable */
`

// Sorted by code unit, not by locale, so every machine writes the same bytes.
function sortKeys<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(sortKeys) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys((value as Record<string, unknown>)[key])])) as T
  return value
}

// The OpenAPI document of the real app and the types openapi-typescript makes from it, by file name in generated/.
// `pnpm contract:build` writes them, and the contract test compares them with the committed files.
export async function generateContract(): Promise<Record<string, string>> {
  // Neither is called: building the document runs no request.
  const app = createApp(createLogger('silent'), async () => ({ database: true, jobs: true }))
  const document = sortKeys(app.getOpenAPI31Document({ openapi: '3.1.0', info: { title: 'Swiss Keepsakes API', version: '0.0.0' } }))
  const types = astToString(await openapiTS(document as OpenAPI3, { alphabetize: true }))
  return {
    'openapi.json': `${JSON.stringify(document, null, 2)}\n`,
    'schema.ts': `${header}\n${types}`,
  }
}
