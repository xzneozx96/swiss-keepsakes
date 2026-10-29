import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const pending = { data: undefined, error: null, isError: false, isPending: true, refetch: vi.fn() }
const queries = vi.hoisted(() => ({
  useMembers: vi.fn(),
  useInvitationPreview: vi.fn(),
  useMe: vi.fn(),
  useOnboarding: vi.fn(),
}))

vi.mock('@/features/stores/api/queries', () => queries)
vi.mock('@/features/stores/hooks/use-held-store-name', () => ({ useHeldStoreName: () => undefined }))
vi.mock('@/features/stores/hooks/use-go-to-sign-in', () => ({ useGoToSignIn: () => vi.fn() }))
vi.mock('@/features/stores/hooks/use-accept-invitation', () => ({
  useAcceptInvitation: () => ({ state: { kind: 'idle' }, token: undefined, retry: vi.fn(), signIn: vi.fn() }),
}))

const { MembersTab } = await import('@/features/stores/components/members-tab')
const { InvitationPreview } = await import('@/features/stores/components/invitation-preview')
const { OnboardingScreen } = await import('@/features/stores/components/onboarding-screen')

const wrap = (node: React.ReactNode) => render(<LocaleProvider>{node}</LocaleProvider>)
const genericBox = (root: HTMLElement) => root.querySelector('.h-24.w-full.rounded-3xl, .h-32.w-full.rounded-3xl, .h-40.w-full.rounded-3xl')

beforeEach(() => {
  Object.values(queries).forEach(mock => mock.mockReset().mockReturnValue(pending))
})

describe('store screens loading', () => {
  it('members tab: two list sections and an invitations heading, with real-shaped rows', () => {
    const { container } = wrap(<MembersTab storeId="s1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Members')
    expect(genericBox(container)).toBeNull()
    expect(container.querySelectorAll('li.rounded-3xl.bg-surface.shadow-surface')).toHaveLength(3)
    expect(container.querySelectorAll('section')).toHaveLength(2)
  })

  it('invitation preview: the invitation frame with a role line, a title, an intro and the first button', async () => {
    // The frame has a Back action, so it needs a router.
    const router = createRouter({
      routeTree: createRootRoute({ component: () => <InvitationPreview audience="manager" returnTo="/" signedOut={false} token="t" onAccept={vi.fn()} /> }),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    const { container } = wrap(<RouterProvider router={router} />)

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Join a store' })).toBeInTheDocument()
    expect(genericBox(container)).toBeNull()
    expect(container.querySelector('figure img[data-photo="colour"]')).not.toBeNull()
    expect(container.querySelector('section.rounded-3xl')).toBeNull()
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4)
  })

  it('onboarding, me pending: the frame, five steps beside the page, one step with its footer, and no generic block [E2.16][E2.3]', () => {
    const { container } = wrap(<OnboardingScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('Open your store')
    expect(container.querySelector('[data-skeleton="onboarding"]')).not.toBeNull()
    expect(genericBox(container)).toBeNull()
    expect(container.querySelectorAll('aside li')).toHaveLength(5)
    expect(container.querySelectorAll('[data-skeleton="step"]')).toHaveLength(1)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('onboarding, query pending: the same layout [E2.16][E2.3]', () => {
    queries.useMe.mockReturnValue({ ...pending, isPending: false, data: { stores: [{ storeId: 's1', role: 'owner', status: 'onboarding' }] } })
    const { container } = wrap(<OnboardingScreen />)

    expect(genericBox(container)).toBeNull()
    expect(container.querySelectorAll('aside li')).toHaveLength(5)
    expect(container.querySelector('[data-skeleton="step"]')).not.toBeNull()
  })
})
