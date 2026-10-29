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

  it('invitation preview: one card with chip, heading, from line and action button', () => {
    const { container } = wrap(<InvitationPreview actionLabel="Accept" audience="manager" returnTo="/" signedOut={false} token="t" onAction={vi.fn()} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(genericBox(container)).toBeNull()
    const card = container.querySelector('section.rounded-3xl.bg-surface.shadow-surface')

    expect(card).not.toBeNull()
    expect(card!.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(4)
  })

  it('onboarding, me pending: checklist with 3 rows, a form card with fields, and the open-for-sale button', () => {
    const { container } = wrap(<OnboardingScreen />)

    expect(genericBox(container)).toBeNull()
    expect(container.querySelectorAll('li.rounded-2xl')).toHaveLength(3)
    expect(container.querySelectorAll('div.rounded-3xl.bg-surface.shadow-surface')).toHaveLength(1)
    expect(container.querySelector('[data-skeleton="open-for-sale"]')).not.toBeNull()
  })

  it('onboarding, query pending: the same layout', () => {
    queries.useMe.mockReturnValue({ ...pending, isPending: false, data: { stores: [{ storeId: 's1', role: 'owner' }] } })
    const { container } = wrap(<OnboardingScreen />)

    expect(genericBox(container)).toBeNull()
    expect(container.querySelectorAll('li.rounded-2xl')).toHaveLength(3)
    expect(container.querySelector('[data-skeleton="open-for-sale"]')).not.toBeNull()
  })
})
