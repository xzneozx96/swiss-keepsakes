import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MerchantShell } from '@/components/layout/merchant-shell'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { EditorSkeleton } from '@/features/keepsakes/components/editor-skeleton'
import { StoryEditorSkeleton } from '@/features/stories/components/story-editor-skeleton'
import { StoryHeader } from '@/features/stories/components/story-header'

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

/** Renders the screen's top bar inside the real merchant shell, with or without the store notice. */
async function renderInShell(bar: React.ReactNode, notice?: React.ReactNode) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/store',
    component: () => (
      <MerchantShell notice={notice}>
        {bar}
        <p>page</p>
      </MerchantShell>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ['/store'] }),
    disableGlobalCatchBoundary: true,
  })
  render(
    <DataClientProvider client={demo.dataClient}>
      <LocaleProvider>
        <DemoProvider store={demo.store}>
          <RouterProvider router={router} />
        </DemoProvider>
      </LocaleProvider>
    </DataClientProvider>,
  )
  await screen.findByText('page')
}

const header = (
  <StoryHeader language="en" save={{ status: 'Saved', tone: 'success' }} screen="write" title="The Chapel Bridge" switchNode={<span>EN | DE</span>} versionState="draft" onBack={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />
)

/** The shell's own rule: the variant prefix under which the main column drops its desktop top padding. */
function noticeVariant() {
  const main = document.querySelector('main')!
  const match = /(group-has-\[\[data-merchant-notice\]\S*\/content):lg:pt-0/.exec(main.className)

  expect(match).not.toBeNull()

  return match![1]
}

describe('top bars under the store notice', () => {
  it('the story header drops its desktop pull-up when the notice is shown', async () => {
    await renderInShell(header, <p>Store not open</p>)
    const bar = document.querySelector('.sticky.top-0.z-30')!

    expect(document.querySelector('[data-merchant-notice]:not(:empty)')).not.toBeNull()
    expect(bar.className).toContain(`${noticeVariant()}:lg:mt-0`)
    expect(bar.className).toContain('lg:-mt-8')
    expect(bar.className).toContain('-mt-4')
  })

  it('the story header keeps the pull-up when there is no notice', async () => {
    await renderInShell(header)

    expect(document.querySelector('[data-merchant-notice]:not(:empty)')).toBeNull()
    expect(document.querySelector('.sticky.top-0.z-30')!.className).toContain('lg:-mt-8')
  })

  it.each([
    ['story skeleton', <StoryEditorSkeleton key="s" />],
    ['keepsake skeleton', <EditorSkeleton key="k" />],
  ])('the %s bar drops its desktop pull-up when the notice is shown', async (_name, skeleton) => {
    await renderInShell(skeleton, <p>Store not open</p>)
    const bar = document.querySelector('[aria-busy] > div:first-child')!

    expect(bar.className).toContain(`${noticeVariant()}:lg:mt-0`)
    expect(bar.className).toContain('-mt-4')
  })
})
