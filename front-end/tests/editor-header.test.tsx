import type { EditorHeaderProps } from '@/components/layout/editor-header'

import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HiddenIcon, TrashIcon } from '@/components/icons'
import { EditorHeader } from '@/components/layout/editor-header'
import { MerchantShell } from '@/components/layout/merchant-shell'
import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const DELETE = { id: 'delete', label: 'Delete keepsake', icon: TrashIcon, isDanger: true }
const HIDE = { id: 'hide', label: 'Hide from the map', icon: HiddenIcon }

beforeEach(() => {
  view.wide = true
})

function renderHeader(props: Partial<EditorHeaderProps> = {}) {
  const handlers = { onBack: vi.fn(), onAction: vi.fn(), onPrimary: vi.fn() }

  render(
    <LocaleProvider>
      <EditorHeader
        backLabel="Back to Keepsakes"
        save={{ text: 'No changes', tone: 'muted' }}
        status={{ tone: 'success', label: 'Published' }}
        title="Classic SD"
        onAction={handlers.onAction}
        onBack={handlers.onBack}
        {...props}
      />
    </LocaleProvider>,
  )

  return handlers
}

describe('the shared editor header', () => {
  it('renders Back, the name and one line with the status and the save state', async () => {
    const { onBack } = renderHeader({ languageSwitch: <span>EN | DE</span> })

    expect(screen.getByRole('heading', { level: 1, name: 'Classic SD' })).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No changes')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('EN | DE')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('autosave: "Saved 10:07" with a tick, and the review action as the one red button', async () => {
    const onPress = vi.fn()

    renderHeader({ save: { text: 'Saved 10:07', tone: 'success' }, primary: { label: 'Review and publish', shortLabel: 'Review', onPress } })

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Saved 10:07')
    expect(status.querySelector('svg')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Review and publish' }))
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('explicit save: "No changes" with Save changes switched off, "Unsaved changes" with it on', () => {
    renderHeader({ primary: { label: 'Save changes', onPress: vi.fn(), isDisabled: true } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('status').querySelector('svg')).toBeNull()

    document.body.innerHTML = ''
    renderHeader({ save: { text: 'Unsaved changes', tone: 'warning' }, primary: { label: 'Save changes', onPress: vi.fn() } })
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('one secondary action is its own icon button in the danger tone, not a menu', async () => {
    const { onAction } = renderHeader({ actions: [DELETE] })
    const button = screen.getByRole('button', { name: 'Delete keepsake' })

    expect(screen.queryByRole('button', { name: /more actions/i })).toBeNull()
    expect(button.className).toContain('button--danger-soft')
    await userEvent.click(button)
    expect(onAction).toHaveBeenCalledWith('delete')
  })

  it('two or more secondary actions sit in the ⋯ menu', async () => {
    const { onAction } = renderHeader({ actions: [HIDE, DELETE], moreLabel: 'More actions for Classic SD' })

    expect(screen.queryByRole('button', { name: 'Delete keepsake' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More actions for Classic SD' }))
    await userEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Delete keepsake' }))
    expect(onAction).toHaveBeenCalledWith('delete')
  })

  it('the step arrows call the editor, and an arrow shows only with its handler', async () => {
    const onNext = vi.fn()

    renderHeader({ steps: { onNext } })

    expect(screen.queryByRole('button', { name: 'Previous step' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('phones: the switch and the arrows leave the header (the page and the step line have them), the short label shows', () => {
    view.wide = false
    renderHeader({ languageSwitch: <span>EN | DE</span>, steps: { onNext: vi.fn() }, primary: { label: 'Review and publish', shortLabel: 'Review', onPress: vi.fn() } })

    expect(screen.queryByText('EN | DE')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Review and publish' })).toHaveTextContent('Review')
  })

  it('the red action and the icon buttons have one size at every width (owner, 04.11.2026)', () => {
    renderHeader({ actions: [DELETE], steps: { onNext: vi.fn() }, primary: { label: 'Save changes', shortLabel: 'Save', onPress: vi.fn() } })

    const primary = screen.getByRole('button', { name: 'Save changes' })

    expect(primary.className.split(' ')).toContain('h-9')
    for (const button of [primary, screen.getByRole('button', { name: 'Delete keepsake' }), screen.getByRole('button', { name: 'Next' })])
      expect(button.className).not.toMatch(/(?:^|\s)(?:max-)?(?:sm|md|lg):(?:h|size|min-h)-/)
    for (const name of ['Delete keepsake', 'Next'])
      expect(screen.getByRole('button', { name }).className.split(' ')).toContain('size-9')
  })

  it('pins under the store notice on desktop: its top is the notice height the shell measures', () => {
    renderHeader()

    const bar = screen.getByRole('heading', { level: 1 }).closest('[data-editor-header]')!

    expect(bar.className).toContain('sticky')
    expect(bar.className).toContain('lg:top-[var(--merchant-notice-height,0px)]')
  })
})

describe('the shell measures the store notice for the bars under it', () => {
  let demo: ReturnType<typeof startDemo>

  beforeEach(async () => {
    window.scrollTo = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    demo = startDemo()
    await demo.ready
  })

  async function renderShell(notice?: React.ReactNode) {
    const root = createRootRoute({ component: Outlet })
    const page = createRoute({ getParentRoute: () => root, path: '/store', component: () => (
      <MerchantShell notice={notice}>
        <p>page</p>
      </MerchantShell>
    ) })
    const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ['/store'] }), disableGlobalCatchBoundary: true })

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

  it('writes the notice height to --merchant-notice-height on the content column', async () => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-merchant-notice') && this.childElementCount > 0 ? 106 : 0
    })

    await renderShell(<p>Store not open</p>)

    const column = document.querySelector('[data-merchant-notice]')!.parentElement!

    expect(column.style.getPropertyValue('--merchant-notice-height')).toBe('106px')
    height.mockRestore()
  })

  it('writes 0px without a notice', async () => {
    await renderShell()

    const column = document.querySelector('[data-merchant-notice]')!.parentElement!

    expect(column.style.getPropertyValue('--merchant-notice-height')).toBe('0px')
  })
})
