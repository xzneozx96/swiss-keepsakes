import type { paths } from '../generated/schema.ts'
import createClient from 'openapi-fetch'

// Written by hand, because everything under generated/ is rewritten by `pnpm contract:build`.
// Add auth headers and the like with `client.use(middleware)`.
export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl })
}
