import { problem, serveStory, state, storeId } from './stories-harness'

export { coverId, groupId, patches, renderStoryEditor, secondPhotoId, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-harness'
export { problem }

type Call = (typeof state.calls)[number]
type Detail = Parameters<typeof serveStory>[0]

const VERSION_PATH = /\/story-groups\/[^/]+\/versions\/(en|de)(?:\/(publish|unpublish))?$/

export const PUBLISHED_AT = '2026-11-03T10:00:00.000Z'

/** The POSTs of the calls so far whose path ends with `suffix` (`en/publish`). */
export const posts = (suffix: string) => state.calls.filter(call => call.method === 'POST' && call.path.endsWith(suffix))

/**
 * `serveStory` plus the three writes the Review screen makes: publish (the draft becomes the published copy), unpublish
 * (back to a draft, the published text stays) and a slug-only PATCH. Each moves the row version on and refuses an
 * `If-Match` that is not the current one with a 412, as the API does. `extra` answers first.
 */
export function servePublish(initial: Detail, extra: (call: Call) => Response | undefined = () => undefined) {
  const base = `/api/store/${storeId}/story-groups`
  const server: ReturnType<typeof serveStory> = serveStory(initial, (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    const match = VERSION_PATH.exec(call.path)

    if (!match || !call.path.startsWith(base))
      return undefined
    const language = match[1] as 'en' | 'de'
    const action = match[2]
    const version = server.group.versions[language]!
    const isSlugOnly = call.method === 'PATCH' && call.body && typeof call.body === 'object' && !('draft' in call.body)

    if (!(action || isSlugOnly))
      return undefined
    if (call.ifMatch !== String(version.rowVersion))
      return problem(412, 'precondition-failed')
    const next = { ...version, rowVersion: (version.rowVersion as number) + 1, updatedAt: new Date().toISOString() }

    if (action === 'publish')
      Object.assign(next, { status: 'published', published: version.draft ?? version.published, draft: null, publishedAt: PUBLISHED_AT })
    else if (action === 'unpublish')
      Object.assign(next, { status: 'draft' })
    else
      Object.assign(next, { slug: (call.body as { slug: string | null }).slug })
    server.group = { ...server.group, versions: { ...server.group.versions, [language]: next } }

    return Response.json(next)
  })

  return server
}
