import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './app.ts'
import { canonicalId, storeRole } from '@sk/domain/identity'
import { unauthenticated } from './authenticate.ts'
import { problem } from './problem.ts'

// Mounted on /api/store/:storeId/*, after authenticate: every store route needs a membership in that store
// (architecture section 9, D9, AC02). Anonymous gets 401. A guest, a member of another store and the Super Admin
// get 403, and so does a store id that is no store of theirs, a non-uuid one included. The id is compared in lower
// case, and the handler reads the verified id and role with `c.get('store')`.
export const requireStoreMember: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get('actor')
  if (actor.kind === 'anonymous')
    return unauthenticated(c)
  const storeId = c.req.param('storeId')
  const role = storeId ? storeRole(actor, storeId) : undefined
  if (!storeId || !role)
    return problem(c, { type: 'forbidden', status: 403, title: 'Only a member of this store may do this' })
  // What the handler uses, never the raw path parameter, the body or the query: the id is canonical (lower
  // case) and the role is the one this guard verified.
  c.set('store', { storeId: canonicalId(storeId), role })
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
