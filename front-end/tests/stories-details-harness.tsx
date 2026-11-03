import { merchantCategoryListSchema } from '@sk/api-contract'

import { groupId, problem, servePublish, state, storeId } from './stories-publish-harness'

export { coverId, groupId, patches, problem, renderStoryEditor, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-publish-harness'

type Detail = Parameters<typeof servePublish>[0]
type Call = (typeof state.calls)[number]

const GROUP_PATH = `/api/store/${storeId}/story-groups/${groupId}`

/** One blog category as the API lists it (`useCategories(storeId, 'blog')`). */
export function categoryItem(id: string, en: string | null, de: string | null = null, parentId: string | null = null, position = 0) {
  return { id, slug: id, name: { en, de }, parentId, showOnHome: false, position, childCount: 0, useCount: 0 }
}

/** The PATCHes of the group row itself (not of a version), in the order they were sent. */
export const groupPatches = () => state.calls.filter(call => call.method === 'PATCH' && call.path === GROUP_PATH)

/**
 * `servePublish` plus the group row: a PATCH on `story-groups/{groupId}` answers 412 `precondition-failed` when `If-Match` is
 * not the group's row version, else merges the body (a list replaces), moves the row version on and answers the group without
 * its versions. The blog categories are `server.categories`. `extra` answers first.
 */
export function serveDetails(initial: Detail, extra: (call: Call) => Response | undefined = () => undefined) {
  const own = { categories: [] as ReturnType<typeof categoryItem>[] }
  const server: ReturnType<typeof servePublish> & typeof own = Object.assign(servePublish(initial, (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'PATCH' && call.path === GROUP_PATH) {
      if (call.ifMatch !== String(server.group.rowVersion))
        return problem(412, 'precondition-failed')
      const { versions, ...group } = { ...server.group, ...(call.body as object), rowVersion: (server.group.rowVersion as number) + 1, updatedAt: new Date().toISOString() }

      server.group = { ...server.group, ...group }

      return Response.json(group)
    }
    if (call.method === 'GET' && call.path === `/api/store/${storeId}/categories/blog`)
      return Response.json(merchantCategoryListSchema.parse({ items: server.categories }))

    return undefined
  }), own)

  return server
}
