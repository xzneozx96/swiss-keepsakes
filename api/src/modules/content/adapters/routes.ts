import type { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { PinUseCases } from './pin-routes.ts'
import { registerPinRoutes } from './pin-routes.ts'

// What the routes call. main.ts builds each from the module's use cases, wrapped by guardUseCases.
export type ContentUseCases = PinUseCases

// One register function per aggregate; the story and tour routes add theirs here.
export function registerContentRoutes(app: OpenAPIHono<AppEnv>, useCases: ContentUseCases): void {
  registerPinRoutes(app, useCases)
}
