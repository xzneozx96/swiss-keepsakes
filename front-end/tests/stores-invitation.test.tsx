import { invitationPreviewSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { InvitationScreen } from '@/features/stores/components/invitation-screen'
import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'
import { heldInvitationToken } from '@/features/stores/lib/invitation-token'
import { storesEn } from '@/features/stores/messages'
import { storesDe } from '@/features/stores/messages.de'
import { writeStored } from '@/lib/storage'

// The real screens, hooks and DataClient, with the HTTP answered here (as in stores-screens.test.tsx).
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, body: unknown }

const token = 'tok_abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'
const longName = `Maison ${'Très-Longue-Boutique-'.repeat(5)}`.slice(0, 120)

type Role = 'owner' | 'manager'
type Preview = Partial<{ storeName: string, role: Role, inviterName: string | null, state: 'open' | 'expired' | 'revoked' | 'accepted' }>

let calls: Call[]
let demo: ReturnType<typeof startDemo>
let answer: (call: Call) => Response

const previewBody = (overrides: Preview = {}) => Response.json(invitationPreviewSchema.parse({ storeName: 'Chi Ngoc', role: 'owner', inviterName: null, state: 'open', ...overrides }))
const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

/** A visitor with no session: the preview answers, everything else is 401 and the session is null. */
function signedOutAnswers(overrides: Preview = {}) {
  return (call: Call): Response => {
    if (call.path === '/api/public/invitations/preview')
      return previewBody(overrides)

    return call.path === '/api/auth/get-session' ? Response.json(null) : problem(401, 'unauthenticated')
  }
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  answer = () => Response.json({})
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = { method: request.method, path: url.pathname + url.search, body: text ? JSON.parse(text) : undefined }

    calls.push(call)

    return answer(call)
  })
  demo = startDemo()
  await demo.ready
})

function renderAt(path: string, Screen: () => React.ReactNode) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path, component: Screen })
  const signIn = createRoute({ getParentRoute: () => root, path: '/sign-in', component: () => <p>Sign-in screen</p> })
  const home = createRoute({ getParentRoute: () => root, path: '/$lang', component: () => <p>Home</p> })
  const router = createRouter({
    routeTree: root.addChildren([page, signIn, home]),
    history: createMemoryHistory({ initialEntries: [path] }),
    disableGlobalCatchBoundary: true,
  })

  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )

  return router
}

const screens = {
  owner: { path: '/store/onboarding', Screen: OnboardingScreen },
  manager: { path: '/invitation', Screen: InvitationScreen },
} as const

function open(role: Role) {
  sessionStorage.setItem('sk.invitationToken', token)

  return renderAt(screens[role].path, screens[role].Screen)
}

const photo = () => document.querySelector('img[data-photo]')?.getAttribute('data-photo')
const signedIn = () => demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'guest-1' } }))

describe('[E2.15][AC02] the invitation on the sign-in layout, signed out', () => {
  it.each([
    ['owner', 'You’re invited to open Chi Ngoc', 'Owner invitation'],
    ['manager', 'Join Chi Ngoc', 'Store Manager invitation'],
  ] as const)('shows the %s the store, the role, Google and the email field, with one h1 and no expiry', async (role, title, label) => {
    answer = signedOutAnswers({ role, inviterName: role === 'manager' ? 'Ngoc' : null })
    const router = open(role)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(document.querySelector('figure')!).getByText('Chi Ngoc')).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByText('Sign in with the email address this invitation was sent to.')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/valid until|expires|gültig bis/i)
    expect(photo()).toBe('colour')
    expect(router.state.location.pathname).toBe(screens[role].path)
    expect(router.state.location.href).not.toContain(token)
    expect(heldInvitationToken()).toBe(token)
    expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(false)
  })

  it('wraps a 120-character store name in the title and the caption, with no sideways scroll classes', async () => {
    answer = signedOutAnswers({ storeName: longName })
    open('owner')

    const title = await screen.findByRole('heading', { level: 1 })

    expect(title).toHaveTextContent(longName)
    expect(title.className).toContain('[overflow-wrap:anywhere]')
    expect(within(document.querySelector('figure')!).getByText(longName).className).toContain('[overflow-wrap:anywhere]')
    expect(document.body.innerHTML).not.toMatch(/overflow-x/)
  })

  it('accepts for the Owner as soon as the embedded sign-in finishes', async () => {
    answer = signedOutAnswers()
    open('owner')

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    answer = (call) => {
      if (call.path === '/api/me/invitations/accept')
        return Response.json({ storeId: '0198a000-0000-7000-8000-000000000001', role: 'owner', storeStatus: 'onboarding' })

      return signedOutAnswers()(call)
    }
    signedIn()

    await waitFor(() => expect(calls.filter(call => call.path === '/api/me/invitations/accept')).toHaveLength(1))
  })
})

describe('[E2.15][AC02] signed in', () => {
  it('shows the accept button, and no sign-in form, to a signed-in Manager', async () => {
    signedIn()
    answer = call => call.path === '/api/public/invitations/preview' ? previewBody({ role: 'manager', inviterName: 'Ngoc' }) : Response.json({})
    open('manager')

    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(photo()).toBe('colour')
  })

  it.each(['owner', 'manager'] as const)('refuses a wrong address for a %s in colour, with the invitation open, and sign-out shows the embedded sign-in with the token held', async (role) => {
    let signedOut = false

    signedIn()
    answer = (call) => {
      if (call.path === '/api/auth/sign-out') {
        signedOut = true

        return Response.json({ success: true })
      }
      if (call.path === '/api/auth/get-session')
        return signedOut ? Response.json(null) : Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'x@example.ch', name: 'Mia' } })
      if (call.path === '/api/me/invitations/accept')
        return problem(403, 'invitation-email-mismatch')

      return previewBody({ role })
    }
    open(role)
    if (role === 'manager')
      await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'This invitation is for another email address' })).toHaveFocus()
    expect(screen.getByText('Wrong account')).toBeInTheDocument()
    expect(screen.getByText(/The invitation is still open/)).toBeInTheDocument()
    expect(photo()).toBe('colour')
    expect(heldInvitationToken()).toBe(token)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out and use another account' }))

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(heldInvitationToken()).toBe(token)
    expect(photo()).toBe('colour')
  })
})

describe('[E2.15][AC02] links that can no longer work', () => {
  it.each([
    ['owner', 'expired', 'Expired', 'This invitation has expired', 'Ask the platform team to send the invitation again.'],
    ['owner', 'revoked', 'Withdrawn', 'This invitation was withdrawn', 'Ask the platform team for a new invitation.'],
    ['manager', 'expired', 'Expired', 'This invitation has expired', 'Ask the store Owner to send the invitation again.'],
    ['manager', 'revoked', 'Withdrawn', 'This invitation was withdrawn', 'Ask the store Owner for a new invitation.'],
  ] as const)('shows a %s link %s in grey, with the wording of its role', async (role, state, chip, title, text) => {
    answer = signedOutAnswers({ role, state })
    open(role)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByText(chip)).toBeInTheDocument()
    expect(screen.getByText(storesEn['stores.refusal.spentNote'])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toBeInTheDocument()
    expect(photo()).toBe('grey')
    expect(heldInvitationToken()).toBeUndefined()
  })

  it.each(['owner', 'manager'] as const)('shows an unknown %s link as not found, in grey, with the token dropped', async (role) => {
    answer = call => call.path === '/api/public/invitations/preview' ? problem(404, 'invitation-not-found') : Response.json({})
    open(role)

    expect(await screen.findByRole('heading', { level: 1, name: 'This invitation link is not valid' })).toBeInTheDocument()
    expect(photo()).toBe('grey')
    expect(heldInvitationToken()).toBeUndefined()
  })
})

describe('[E2.15][AC09] German', () => {
  it('has a German line for every stores key, and a German line of its own for each new key', () => {
    expect(Object.keys(storesDe).sort()).toEqual(Object.keys(storesEn).sort())
    const ownKeys = Object.keys(storesEn).filter(key => /^stores\.(?:invite\.(?:ownerTitle|ownerIntro|managerTitle|roleOwner|roleManager)|refusal\.(?:chip|spentNote))/.test(key)) as Array<keyof typeof storesEn>

    expect(ownKeys.length).toBeGreaterThanOrEqual(9)
    for (const key of ownKeys)
      expect(storesDe[key], key).not.toBe(storesEn[key])
  })

  type Setup = () => void
  const states: Array<[string, Setup, string, string]> = [
    ['signed-out Owner', () => { answer = signedOutAnswers() }, 'owner', 'stores.invite.ownerTitle'],
    ['expired Owner link', () => { answer = signedOutAnswers({ state: 'expired' }) }, 'owner', 'stores.refusal.expired.title'],
    ['withdrawn Manager link', () => { answer = signedOutAnswers({ role: 'manager', state: 'revoked' }) }, 'manager', 'stores.refusal.revoked.manager.title'],
    ['unknown link', () => { answer = call => call.path === '/api/public/invitations/preview' ? problem(404, 'invitation-not-found') : Response.json({}) }, 'manager', 'stores.refusal.notFound.title'],
  ]

  it.each(states)('renders the %s in German with no English line left', async (_name, setup, role, titleKey) => {
    writeStored('sk.language', 'de')
    setup()
    open(role as Role)

    const title = storesDe[titleKey as keyof typeof storesDe].replace('{store}', 'Chi Ngoc')

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    const text = document.body.textContent ?? ''

    for (const english of ['Sign in with the email address', 'Back to Explore', 'Owner invitation', 'Store Manager invitation', 'This invitation has expired', 'This invitation was withdrawn', 'This invitation link is not valid', 'Wrong account', 'Withdrawn', 'Continue with Google'])
      expect(text).not.toContain(english)
  })
})
