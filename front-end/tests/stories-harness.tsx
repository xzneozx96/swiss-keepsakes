import type { RouteComponent } from '@tanstack/react-router'
import { mediaSchema, storyListSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useParams } from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { StoriesScreen } from '@/features/stories/components/stories-screen'
import { media, state, storeId } from './keepsakes-harness'

export { media, problem, setUpHarness, state, storeId } from './keepsakes-harness'

export const base = `/api/store/${storeId}/story-groups`
export const uuid = (n: number) => `0198a000-0000-7000-8000-${String(n).padStart(12, '0')}`

/** One language version as the list reads it. */
export function listVersion(over: Record<string, unknown> = {}) {
  return { status: 'draft', everPublished: false, editsNotLive: false, rowVersion: 1, updatedAt: '2026-11-03T08:00:00.000Z', ...over }
}

export const publishedVersion = (over: Record<string, unknown> = {}) => listVersion({ status: 'published', everPublished: true, ...over })

/** One story row: an English draft with a ready cover, unless `over` says otherwise. */
export function listItem(n: number, over: Record<string, unknown> = {}) {
  return { groupId: uuid(n), kind: 'story', title: { en: `Story ${n}` }, cover: mediaSchema.parse(media), languages: { en: listVersion(), de: null }, updatedAt: '2026-11-03T08:00:00.000Z', ...over }
}

export const storyList = (items: Record<string, unknown>[]) => storyListSchema.parse({ items })

/**
 * Answers the list read and the session (the account name New story signs the draft with); `other` answers anything
 * else first, so a test can refuse a write.
 */
export function answerStories(items: Record<string, unknown>[], other: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = other(call)

    if (custom)
      return custom
    if (call.path === '/api/auth/get-session')
      return Response.json({ session: { id: 's-1', userId: 'u-1', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u-1', name: 'Anna Keller', email: 'anna@example.ch' } })
    if (call.method === 'GET' && call.path === base)
      return Response.json(storyList(items))

    return undefined
  }
}

/** The Stories screen at `/store/content`, and the editor route as a stub that shows the story id it opened. */
export function renderStories(initial = '/store/content', screen: RouteComponent = StoriesScreen) {
  const root = createRootRoute({ component: Outlet })
  const index = createRoute({ getParentRoute: () => root, path: '/store/content', component: screen })
  const editor = createRoute({ getParentRoute: () => root, path: '/store/content/articles/$articleId', component: function Editor() {
    const { articleId } = useParams({ strict: false }) as { articleId?: string }

    return <p data-testid="at-editor">{articleId}</p>
  } })
  const router = createRouter({ routeTree: root.addChildren([index, editor]), history: createMemoryHistory({ initialEntries: [initial] }), disableGlobalCatchBoundary: true })

  state.router = router as unknown as typeof state.router

  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )

  return router
}
