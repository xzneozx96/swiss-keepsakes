import type { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { CategoryUseCases } from './category-routes.ts'
import type { PinUseCases } from './pin-routes.ts'
import type { PublicUseCases } from './public-routes.ts'
import type { StoryUseCases } from './story-routes.ts'
import type { TourUseCases } from './tour-routes.ts'
import { registerCategoryRoutes } from './category-routes.ts'
import { registerPinRoutes } from './pin-routes.ts'
import { registerPublicRoutes } from './public-routes.ts'
import { registerStoryRoutes } from './story-routes.ts'
import { registerTourRoutes } from './tour-routes.ts'

// What the routes call. main.ts builds each from the module's use cases. The write use cases are wrapped by
// guardUseCases; the public reads are not, because they return lists, not a Result.
export type ContentUseCases = PinUseCases & CategoryUseCases & StoryUseCases & TourUseCases & PublicUseCases

// One register function per aggregate.
export function registerContentRoutes(app: OpenAPIHono<AppEnv>, useCases: ContentUseCases): void {
  registerPinRoutes(app, useCases)
  registerCategoryRoutes(app, useCases)
  registerStoryRoutes(app, useCases)
  registerTourRoutes(app, useCases)
  registerPublicRoutes(app, useCases)
}
