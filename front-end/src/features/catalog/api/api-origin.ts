import process from 'node:process'
import { createIsomorphicFn } from '@tanstack/react-start'

// Server rendering has no origin of its own, so the loader reads the API at its internal address (tanstack-start.md, rule 4).
export const apiOrigin = createIsomorphicFn()
  .server(() => process.env.API_ORIGIN || process.env.API_PROXY_TARGET || 'http://127.0.0.1:5002')
  .client(() => window.location.origin)
