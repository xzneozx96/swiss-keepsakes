/* eslint-disable react-refresh/only-export-components -- a test helper, not a hot-reloaded module */
import type { RouteComponent } from '@tanstack/react-router'
import { mediaSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { StoriesScreen } from '@/features/stories/components/stories-screen'
import { StoryEditorScreen } from '@/features/stories/components/story-editor-screen'
import { parseStoriesSearch } from '@/features/stories/lib/list-search'
import { storySearch } from '@/features/stories/lib/search-params'
import { media, state, storeId } from './keepsakes-harness'
import { item as mediaFile, page as mediaPage, other, photoId } from './media-harness'
import { serverStoryPage, storyPage } from './support/pages'

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

export const storyList = (items: Record<string, unknown>[], over: Record<string, unknown> = {}) => storyPage(items, over)

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
    if (call.method === 'GET' && call.path.split('?')[0] === base)
      return Response.json(serverStoryPage(items as never, new URL(call.path, 'http://x')))

    return undefined
  }
}

/** The Stories screen the way the route mounts it: its tab, search and page are in the URL (`status`, `q`, `page`). */
function StoriesAtRoute() {
  const search = parseStoriesSearch(useSearch({ strict: false }))
  const navigate = useNavigate()

  return <StoriesScreen search={search} onSearch={patch => void navigate({ to: '/store/content', search: (previous: Record<string, unknown>) => ({ ...previous, ...patch }), replace: true } as never)} />
}

/** The Stories screen at `/store/content`, and the editor route as a stub that shows the story id it opened. */
export function renderStories(initial = '/store/content', screen: RouteComponent = StoriesAtRoute) {
  const root = createRootRoute({ component: Outlet })
  const index = createRoute({ getParentRoute: () => root, path: '/store/content', validateSearch: parseStoriesSearch, component: screen })
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

// ---------------------------------------------------------------------------------------------
// The story editor

export const groupId = uuid(100)
export { photoId as coverId, other as secondPhotoId }

/** One language's document, as the API stores it. */
export function storyDoc(over: Record<string, unknown> = {}) {
  return {
    title: 'A morning on the Musegg wall',
    excerpt: 'Up early, before the town wakes.',
    authorName: 'Anna Keller',
    coverMediaId: null,
    checkedOn: null,
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The body.' }] }] },
    ...over,
  }
}

/** One language version: an English draft at row version 3 unless `over` says otherwise. */
export function storyVersion(language: 'en' | 'de', over: Record<string, unknown> = {}) {
  return { groupId, storeId, language, status: 'draft', slug: null, draft: storyDoc(), published: null, publishedAt: null, rowVersion: 3, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z', ...over }
}

type Detail = Record<string, unknown> & { versions: Record<'en' | 'de', Record<string, unknown> | null> }

export function storyGroupDetail(versions: Partial<Detail['versions']>, over: Record<string, unknown> = {}): Detail {
  return { id: groupId, storeId, kind: 'story', subjectPlaceId: null, stayTag: 'both', interests: [], categoryIds: [], placeIds: [], keepsakeProductIds: [], relatedGroupIds: [], rowVersion: 1, createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z', ...over, versions: { en: null, de: null, ...versions } }
}

/**
 * A fake server for one story group: the group read, a save of a version (one row version on, the draft replaced, the published copy untouched),
 * a new version, the account, and the media library. `extra` answers first, so a test can refuse a write. `gate` holds every save until it settles.
 */
export function serveStory(initial: Detail, extra: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  const server = {
    group: initial,
    gate: undefined as Promise<void> | undefined,
  }
  const path = `${base}/${groupId}`
  const patch = (call: (typeof state.calls)[number]) => {
    const language = call.path.split('/').at(-1) as 'en' | 'de'
    const version = server.group.versions[language]!
    const next = { ...version, draft: (call.body as { draft: unknown }).draft, rowVersion: (version.rowVersion as number) + 1, updatedAt: new Date().toISOString() }

    server.group = { ...server.group, versions: { ...server.group.versions, [language]: next } }

    return Response.json(next)
  }

  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.path === '/api/auth/get-session')
      return Response.json({ session: { id: 's-1', userId: 'u-1', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u-1', name: 'Anna Keller', email: 'anna@example.ch' } })
    if (call.method === 'GET' && call.path === path)
      return Response.json(server.group)
    if (call.method === 'PATCH' && call.path.startsWith(`${path}/versions/`))
      return server.gate ? (server.gate.then(() => patch(call)) as never) : patch(call)
    if (call.method === 'POST' && call.path === `${path}/versions`) {
      const body = call.body as { language: 'en' | 'de', draft: unknown }
      const created = storyVersion(body.language, { draft: body.draft, rowVersion: 1 })

      server.group = { ...server.group, versions: { ...server.group.versions, [body.language]: created } }

      return Response.json(created, { status: 201 })
    }
    if (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media?`))
      return Response.json(mediaPage([mediaFile({ name: 'Ready.JPG' }), mediaFile({ id: other, name: 'Second.JPG' })]))

    return undefined
  }

  return server
}

export const patches = () => state.calls.filter(call => call.method === 'PATCH')

/** The editor route as the app mounts it, and a stub for the list the editor leaves to. */
export function renderStoryEditor(initial: string) {
  const root = createRootRoute({ component: Outlet })
  const list = createRoute({ getParentRoute: () => root, path: '/store/content', component: () => <p>Stories list</p> })
  const editor = createRoute({
    getParentRoute: () => root,
    path: '/store/content/articles/$articleId',
    validateSearch: storySearch,
    component: function Editor() {
      const { articleId } = editor.useParams()
      const { lang, screen } = editor.useSearch()
      const navigate = editor.useNavigate()

      return (
        <StoryEditorScreen
          groupId={articleId}
          language={lang}
          screen={screen ?? 'write'}
          onLanguage={next => void navigate({ search: previous => ({ ...previous, lang: next }), replace: true })}
          onScreen={next => void navigate({ search: previous => ({ ...previous, screen: next === 'review' ? 'review' : undefined }) })}
        />
      )
    },
  })
  const router = createRouter({ routeTree: root.addChildren([list, editor]), history: createMemoryHistory({ initialEntries: [initial] }), disableGlobalCatchBoundary: true })

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
