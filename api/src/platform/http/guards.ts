import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './app.ts'
import { storeRole } from '@sk/domain/identity'
import { unauthenticated } from './authenticate.ts'
import { problem } from './problem.ts'

// Mounted on /api/store/:storeId/*, after authenticate: every store route needs a membership in that store
// (architecture section 9, D9, AC02). Anonymous gets 401. A guest, a member of another store and the Super Admin
// get 403, and so does a store id that is no store of theirs, a non-uuid one included. The id is compared in lower case.
export const requireStoreMember: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get('actor')
  if (actor.kind === 'anonymous')
    return unauthenticated(c)
  const storeId = c.req.param('storeId')
  if (!storeId || !storeRole(actor, storeId))
    return problem(c, { type: 'forbidden', status: 403, title: 'Only a member of this store may do this' })
  await next()
}

// Mounted on /api/admin/*, after authenticate: only a row in identity.platform_admins passes. A store owner does not.
export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get('actor')
  if (actor.kind === 'anonymous')
    return unauthenticated(c)
  if (actor.kind !== 'super_admin')
    return problem(c, { type: 'forbidden', status: 403, title: 'Only the Super Admin may do this' })
  await next()
}
