import { toast } from '@heroui/react'
import { acceptedInvitationSchema, adminStoreListSchema, adminStoreSchema, invitationPreviewSchema, meSchema, onboardingSchema, problemSchema, storeSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { AdminStoresScreen } from '@/features/stores/components/admin-stores-screen'
import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'
import { heldInvitationToken, takeInvitationFromHash } from '@/features/stores/lib/invitation-token'

// The real screens, hooks, DataClient and generated client, with the HTTP answered here. The bodies copy
// what the API sends (api/src/modules/identity/adapters/routes.ts).

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const token = 'tok_abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'
const store = storeSchema.parse({ id: storeId, slug: 'chi-ngoc', name: 'Chi Ngoc', status: 'onboarding', defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z' })

interface Condition { key: 'store-information' | 'payment-account' | 'catalogue' | 'policies', state: 'met' | 'unmet' | 'pending' }
function conditions(payment: Condition['state'] = 'pending'): Condition[] {
  return [
    { key: 'store-information', state: 'met' },
    { key: 'payment-account', state: payment },
    { key: 'catalogue', state: 'pending' },
    { key: 'policies', state: 'pending' },
  ]
}

const ownerEntry = { storeId, role: 'owner' as const, status: 'onboarding' as const }
const meBody = (stores: Array<typeof ownerEntry | { storeId: string, role: 'manager', status: 'onboarding' }>) => Response.json(meSchema.parse({ guestId: '0198a000-0000-7000-8000-0000000000f1', stores }))
function previewBody(overrides: Partial<{ storeName: string, role: 'owner' | 'manager', inviterName: string | null, state: 'open' | 'expired' | 'revoked' | 'accepted' }> = {}) {
  return Response.json(invitationPreviewSchema.parse({ storeName: 'Chi Ngoc', role: 'owner', inviterName: null, state: 'open', ...overrides }))
}

let meStores: Parameters<typeof meBody>[0]
let calls: Call[]
let answer: (call: Call) => Response
let demo: ReturnType<typeof startDemo>
let hold: Promise<void> | undefined
let fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function problem(status: number, type: string) {
  return Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })
}

// Every API body in this file is parsed by the contract's own schema first, so a fixture cannot drift from what the API can send.
function onboardingBody(overrides: { store?: Partial<typeof store>, conditions?: Condition[], mayOpenForSale?: boolean } = {}) {
  return Response.json(onboardingSchema.parse({
    store: { ...store, ...overrides.store },
    conditions: overrides.conditions ?? conditions(),
    mayOpenForSale: overrides.mayOpenForSale ?? false,
  }))
}

const accepted = (role: 'owner' | 'manager' = 'owner') => Response.json(acceptedInvitationSchema.parse({ storeId, role, storeStatus: 'onboarding' }))

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  meStores = []
  hold = undefined
  answer = () => Response.json({})
  fetchImpl = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const call = {
      method: request.method,
      path: new URL(request.url).pathname + new URL(request.url).search,
      key: request.headers.get('idempotency-key'),
      body: text ? JSON.parse(text) : undefined,
    }

    calls.push(call)
    if (hold && request.method !== 'GET' && call.path !== '/api/public/invitations/preview')
      await hold

    return answer(call)
  }
  // The client keeps the `fetch` it first saw, so every test goes through this one stub.
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init))
  demo = startDemo()
  await demo.ready
})

function renderAt(path: string, Screen: () => React.ReactNode) {
  const root = createRootRoute({ component: Outlet, notFoundComponent: () => <p>No such page</p> })
  const page = createRoute({ getParentRoute: () => root, path: path.split('?')[0], component: Screen })
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: () => <p>Sign-in screen</p>,
  })
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>Home</p> })
  const invitation = createRoute({ getParentRoute: () => root, path: '/invitation', component: () => <p>Manager invitation</p> })
  const router = createRouter({
    routeTree: root.addChildren([page, signIn, home, invitation]),
    history: createMemoryHistory({ initialEntries: [path] }),
    disableGlobalCatchBoundary: true,
  })

  const view = render(
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

  return Object.assign(router, { unmount: view.unmount })
}

const signedInSession = (name = 'Mia') => Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'o@example.ch', name } })

/** The accept answered with `onAccept`, and every other call as `onboardingAnswers` does. */
function acceptAnswers(onAccept: (call: Call) => Response) {
  const rest = onboardingAnswers()

  return (call: Call): Response => call.path === '/api/me/invitations/accept' ? onAccept(call) : rest(call)
}

function onboardingAnswers(overrides: Partial<Record<string, () => Response>> = {}) {
  return (call: Call): Response => {
    const handler = overrides[`${call.method} ${call.path}`]

    if (handler)
      return handler()
    if (call.method === 'POST' && call.path === '/api/me/invitations/accept')
      return accepted()
    if (call.method === 'GET' && call.path === '/api/me')
      return meBody(meStores)
    if (call.path === '/api/public/invitations/preview')
      return previewBody()
    if (call.path === '/api/auth/get-session')
      return signedInSession()
    if (call.path === `/api/store/${storeId}/onboarding`)
      return onboardingBody()

    return Response.json({})
  }
}

describe('[E2.3][S8] A02, the invited Owner accepts and opens the store', () => {
  it('accepts the held token once, drops it, and shows the four conditions with Open for sale locked', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    const accepts = calls.filter(call => call.path === '/api/me/invitations/accept')

    expect(accepts).toHaveLength(1)
    expect(accepts[0].body).toEqual({ token })
    expect(accepts[0].key).toBeTruthy()
    expect(heldInvitationToken()).toBeUndefined()
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open for sale' })).toBeDisabled()
    expect(screen.getByText('Finish every step above to open for sale.')).toBeInTheDocument()
  })

  it('shows the store from the preview and a sign-in button when the API answers 401, and the button goes to sign-in with the fixed returnTo, the token in sessionStorage only', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = (call) => {
      if (call.path === '/api/public/invitations/preview')
        return previewBody({ storeName: 'Chi Ngoc Shop' })

      return call.path === '/api/auth/get-session' ? Response.json(null) : problem(401, 'unauthenticated')
    }
    const router = renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Chi Ngoc Shop' })).toBeInTheDocument()
    expect(screen.getByText('You are invited to open Chi Ngoc Shop.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store/onboarding')
    const preview = calls.find(call => call.path === '/api/public/invitations/preview')

    expect(preview?.body).toEqual({ token })
    expect(preview?.key).toBeNull()
    expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(false)
    expect(calls.map(call => call.path).join('\n')).not.toContain(token)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in to continue' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/onboarding' })
    expect(router.state.location.href).not.toContain(token)
    expect(heldInvitationToken()).toBe(token)
  })

  it.each([
    [404, 'invitation-not-found', 'This invitation link is not valid', true],
    [410, 'invitation-expired', 'This invitation has expired', true],
    [410, 'invitation-revoked', 'This invitation was withdrawn', true],
    [409, 'invitation-already-accepted', 'This invitation was already used', true],
    [403, 'invitation-email-mismatch', 'This invitation is for another email address', false],
    [403, 'invitation-super-admin', 'Use a store account', false],
    [403, 'invitation-email-unverified', 'Your email is not verified', false],
    [409, 'already-a-member', 'You already belong to this store', true],
    [400, 'validation-failed', 'This invitation link is not valid', true],
  ])('shows its own state for %i %s', async (status, type, title, spent) => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = acceptAnswers(() => problem(status, type))
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(heldInvitationToken()).toBe(spent ? undefined : token)
  })

  it('offers sign-out for a wrong account, and the invitation stays open for the right one', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path.startsWith('/api/auth/') && call.path !== '/api/auth/get-session' ? Response.json({ success: true }) : acceptAnswers(() => problem(403, 'invitation-email-mismatch'))(call)
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and use another account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/onboarding' })
    expect(heldInvitationToken()).toBe(token)
  })

  it('says to open the email link when there is no token and the signed-in visitor has no store', async () => {
    answer = call => call.path === '/api/me' ? meBody([]) : problem(404, 'not-found')
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(calls.map(call => call.path)).toEqual(['/api/me'])
  })

  it('sends a signed-out visitor with no token to sign-in and back to A02, not to the missing-link state', async () => {
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/onboarding' })
    expect(screen.queryByRole('heading', { name: 'Open the link from your email' })).not.toBeInTheDocument()
  })

  it('does not accept a Manager invitation on A02, and sends the Manager to M01 with the token kept', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path === '/api/public/invitations/preview' ? previewBody({ role: 'manager', inviterName: 'Ngoc' }) : onboardingAnswers()(call)
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await waitFor(() => expect(router.state.location.pathname).toBe('/invitation'))
    expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(false)
    expect(screen.queryByText(/You joined the store/)).not.toBeInTheDocument()
    expect(heldInvitationToken()).toBe(token)
  })

  it('sends no accept for a visitor whose session is gone, and shows the sign-in button', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path === '/api/auth/get-session' ? Response.json(null) : onboardingAnswers()(call)
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('button', { name: 'Sign in to continue' })).toBeInTheDocument()
    expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(false)
  })

  it.each([
    ['expired', 'This invitation has expired'],
    ['revoked', 'This invitation was withdrawn'],
  ] as const)('shows the %s preview as a refusal, sends no accept, drops the token, and leaves no token in a query key', async (state, title) => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path === '/api/public/invitations/preview' ? previewBody({ state }) : onboardingAnswers()(call)
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(false)
    expect(heldInvitationToken()).toBeUndefined()
    expect(JSON.stringify(demo.queryClient.getQueryCache().getAll().map(query => query.queryKey))).not.toContain(token)
  })

  it('shows the unknown-link refusal from the preview and drops the token', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path === '/api/public/invitations/preview' ? problem(404, 'invitation-not-found') : onboardingAnswers()(call)
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'This invitation link is not valid' })).toBeInTheDocument()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('removes the preview from the query cache once the invitation is accepted', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    expect(JSON.stringify(demo.queryClient.getQueryCache().getAll().map(query => query.queryKey))).not.toContain(token)
  })

  it('finds the Owner\'s store from GET /api/me on a new device, with no token and no stored id', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    expect(calls.map(call => call.path).filter(path => path !== '/api/auth/get-session')).toEqual(['/api/me', `/api/store/${storeId}/onboarding`])
    expect(localStorage.getItem('sk.ownerStore')).toBeNull()
  })

  it('says to open the email link when the store the API listed answers 403', async () => {
    meStores = [ownerEntry]
    answer = call => call.path === '/api/me' ? meBody(meStores) : problem(403, 'forbidden')
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
  })

  it('shows the already-a-member state with a way into the store when the visitor has no Owner store', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path === '/api/me' ? meBody([{ storeId, role: 'manager', status: 'onboarding' }]) : acceptAnswers(() => problem(409, 'already-a-member'))(call)
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'You already belong to this store' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the store' })).toBeInTheDocument()
  })

  it('shows the Owner\'s store for already-a-member when /api/me lists it', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    meStores = [ownerEntry]
    answer = (call) => {
      return acceptAnswers(() => problem(409, 'already-a-member'))(call)
    }
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
  })

  it('asks for a display name when the account has none, and saves it with updateUser, as plain text capped at 80 characters', async () => {
    meStores = [ownerEntry]
    answer = (call) => {
      if (call.path === '/api/auth/get-session')
        return Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'o@example.ch', name: '' } })
      if (call.path === '/api/auth/update-user')
        return Response.json({ status: true })

      return onboardingAnswers()(call)
    }
    renderAt('/store/onboarding', OnboardingScreen)

    const field = await screen.findByRole('textbox', { name: 'Your name' })

    expect(field).toHaveAttribute('maxlength', '80')
    await userEvent.type(field, '  <b>Ngoc</b>  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() => expect(calls.some(call => call.path === '/api/auth/update-user')).toBe(true))
    expect(calls.find(call => call.path === '/api/auth/update-user')?.body).toEqual({ name: '<b>Ngoc</b>' })
  })

  it('does not ask for a name when the account has one', async () => {
    meStores = [ownerEntry]
    answer = (call) => {
      if (call.path === '/api/auth/get-session')
        return Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'o@example.ch', name: 'Ngoc' } })

      return onboardingAnswers()(call)
    }
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    await waitFor(() => expect(calls.some(call => call.path === '/api/auth/get-session')).toBe(true))
    expect(screen.queryByRole('textbox', { name: 'Your name' })).not.toBeInTheDocument()
  })

  it('saves the store information, with a new Idempotency-Key once the first save is done', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers({
      [`PATCH /api/store/${storeId}/information`]: () => Response.json(storeSchema.parse({ ...store, name: 'Chi Ngoc Shop' })),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    const name = await screen.findByRole('textbox', { name: 'Store name' })

    await userEvent.clear(name)
    await userEvent.type(name, 'Chi Ngoc Shop')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.some(call => call.method === 'PATCH')).toBe(true))
    await userEvent.type(name, '!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.method === 'PATCH')

    expect(first.body).toEqual({ name: 'Chi Ngoc Shop', defaultLanguage: 'en' })
    expect(first.key).toBeTruthy()
    expect(second.key).not.toBe(first.key)
  })

  it('opens the store when every condition is met', async () => {
    meStores = [ownerEntry]
    let live = false

    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({
        store: { status: live ? 'live' : 'onboarding' },
        conditions: conditions('met').map(condition => ({ ...condition, state: 'met' })),
        mayOpenForSale: !live,
      }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => {
        live = true

        return Response.json(storeSchema.parse({ ...store, status: 'live' }))
      },
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Open for sale' }))

    expect(await screen.findByText('Your store is open for sale.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open for sale' })).not.toBeInTheDocument()
  })

  it('shows the 409 onboarding-incomplete state with the steps still open, then reads the conditions again', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({ mayOpenForSale: true }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => problem(409, 'onboarding-incomplete'),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Open for sale' }))

    const alert = await screen.findByRole('alert')

    expect(within(alert).getByText(/The store cannot open yet\. Still open: Payment account, A product or a tour, Policies\./)).toBeInTheDocument()
    await waitFor(() => expect(calls.filter(call => call.path === `/api/store/${storeId}/onboarding`)).toHaveLength(2))
    await userEvent.click(screen.getByRole('button', { name: 'Open for sale' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.path.endsWith('/open-for-sale'))

    expect(second.key).not.toBe(first.key)
  })
})

const listed = adminStoreListSchema.parse({
  items: [
    { ...store, status: 'invited', invitation: { email: 'owner@example.ch', state: 'open', expiresAt: '2026-10-29T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000002', slug: 'old', name: 'Old Shop', status: 'invited', createdAt: '2026-09-15T08:00:00.000Z', invitation: { email: 'late@example.ch', state: 'expired', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000003', slug: 'live', name: 'Live Shop', status: 'live', createdAt: '2026-08-03T08:00:00.000Z', invitation: { email: 'done@example.ch', state: 'accepted', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'met' },
  ],
  nextCursor: null,
})

const emptyList = () => Response.json(adminStoreListSchema.parse({ items: [], nextCursor: null }))

/** The list answered, and the session answered as a signed-in Super Admin would see it. */
const adminAnswers = (list: () => Response) => (call: Call): Response => call.path === '/api/auth/get-session' ? signedInSession() : list()

async function openInviteSheet() {
  const [button] = await screen.findAllByRole('button', { name: 'Invite an Owner' })

  await waitFor(() => expect(button).toBeEnabled())
  await userEvent.click(button)

  return screen.findByRole('dialog', { name: 'Invite an Owner' })
}

const storeCards = () => screen.getByRole('list', { name: 'All stores' })
const storeTable = () => screen.getByRole('grid', { name: 'All stores' })

describe('[E2.3][S8] A01, the Super Admin invites the Owner', () => {
  it('lists stores with their status and invitation state, and offers a resend only while the Owner has not accepted', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('Invitation sent to owner@example.ch. It expires on 29.10.2026.')).toBeInTheDocument()
    expect(screen.getByText('Invitation to late@example.ch expired on 01.10.2026.')).toBeInTheDocument()
    expect(screen.getByText('done@example.ch accepted the invitation.')).toBeInTheDocument()
    expect(within(storeCards()).getAllByRole('button', { name: 'Send invitation again' })).toHaveLength(2)
    expect(within(storeCards()).getByText('Created 15.09.2026')).toBeInTheDocument()
    expect(within(storeTable()).getAllByRole('button', { name: 'Send invitation again' })).toHaveLength(2)
  })

  it('lists the stores in a table with the Owner, the status, the invitation and its expiry, and the payment account', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Old Shop')
    const table = within(storeTable())

    expect(table.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Store', 'Owner', 'Status', 'Invitation', 'Payment account', 'Created', 'Actions'])
    const [, first, second, third] = table.getAllByRole('row')

    expect(within(first).getByText('owner@example.ch')).toBeInTheDocument()
    expect(within(first).getByText('Sent')).toBeInTheDocument()
    expect(within(first).getByText('Expires 29.10.2026')).toBeInTheDocument()
    expect(within(second).getByText('Expired')).toBeInTheDocument()
    expect(within(second).getByText('Expired 01.10.2026')).toBeInTheDocument()
    expect(within(third).getByText('Accepted')).toBeInTheDocument()
    expect(within(first).getByText('20.10.2026')).toBeInTheDocument()
    expect(within(second).getByText('15.09.2026')).toBeInTheDocument()
    expect(within(third).getByText('03.08.2026')).toBeInTheDocument()
    expect(within(third).getByText('Open for sale')).toBeInTheDocument()
    expect(within(third).getByText('Done')).toBeInTheDocument()
    expect(within(third).queryByRole('button', { name: 'Send invitation again' })).not.toBeInTheDocument()
  })

  it('shows one card per store for a phone, with the store address name and the invitation sentence', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    await within(await screen.findByRole('list', { name: 'All stores' })).findByText('Old Shop')
    const cards = within(storeCards()).getAllByRole('listitem')

    expect(cards).toHaveLength(3)
    expect(cards[1]).toHaveAttribute('data-store', 'old')
    expect(cards[1].querySelector('[data-invitation]')).toHaveAttribute('data-invitation', 'expired')
    expect(within(cards[2]).getByText('Open for sale')).toBeInTheDocument()
    expect(within(cards[2]).getByText('Done')).toBeInTheDocument()
  })

  it('counts the stores of the list in four tiles', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    await screen.findByText('Old Shop', { selector: 'h3' })
    const tiles = screen.getByLabelText('Stores at a glance')

    expect(within(tiles).getByText('Stores')).toBeInTheDocument()
    expect(within(tiles).getByText('Waiting for the Owner')).toBeInTheDocument()
    expect(within(tiles).getByText('Onboarding')).toBeInTheDocument()
    expect(within(tiles).getByText('Open for sale')).toBeInTheDocument()
    expect(tiles.querySelector('[data-tile=total]')).toHaveTextContent('3')
    expect(tiles.querySelector('[data-tile=waiting]')).toHaveTextContent('2')
    expect(tiles.querySelector('[data-tile=onboarding]')).toHaveTextContent('0')
    expect(tiles.querySelector('[data-tile=live]')).toHaveTextContent('1')
  })

  it('says the total is what was loaded so far while another page waits', async () => {
    answer = () => Response.json(adminStoreListSchema.parse({ items: [listed.items[0]], nextCursor: '0198a000-0000-7000-8000-0000000000aa' }))
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('Stores loaded so far')).toBeInTheDocument()
  })

  it('shows loading bars in place of the figures and the rows until the list arrives', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    const tiles = await screen.findByLabelText('Stores at a glance')

    expect(tiles.querySelector('[data-tile]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Invite an Owner' })).toBeDisabled()
    await screen.findByText('Old Shop', { selector: 'h3' })
    expect(tiles.querySelector('[data-tile=total]')).toHaveTextContent('3')
  })

  it('shows the empty state with the way to the first invitation, and the sheet opens from it', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText(/No store yet\. Invite the first Owner/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Stores at a glance')).not.toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Invite an Owner' })

    expect(buttons).toHaveLength(2)
    await userEvent.click(buttons[1])

    expect(await screen.findByRole('dialog', { name: 'Invite an Owner' })).toBeInTheDocument()
  })

  it('shows the account of the signed-in Super Admin, the one page, and signs out to the home screen', async () => {
    answer = call => call.path === '/api/auth/sign-out' ? Response.json({ success: true }) : adminAnswers(() => Response.json(listed))(call)
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('o@example.ch')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Stores' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(calls.some(call => call.path === '/api/auth/sign-out')).toBe(true)
  })

  it('creates the store with a slug from its name and the chosen language, then shows the new list', async () => {
    let created = false

    answer = (call) => {
      if (call.method === 'POST') {
        created = true

        return Response.json(adminStoreSchema.parse(listed.items[0]), { status: 201 })
      }

      return created ? Response.json(listed) : emptyList()
    }
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chị Ngọc Keepsakes')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('radio', { name: 'Deutsch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Invitation sent to owner@example.ch. It expires on 29.10.2026.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const post = calls.find(call => call.method === 'POST')

    expect(post?.path).toBe('/api/admin/stores')
    expect(post?.key).toBeTruthy()
    expect(post?.body).toEqual({ slug: 'chi-ngoc-keepsakes', name: 'Chị Ngọc Keepsakes', defaultLanguage: 'de', language: 'de', ownerEmail: 'owner@example.ch' })
  })

  it.each([
    ['store-slug-taken', 'Another store has a name too close to this one. Change the name a little.'],
    ['owner-is-super-admin', 'This email belongs to a Super Admin, who cannot own a store. Use another email address.'],
  ])('shows %s next to its field', async (type, message) => {
    answer = call => call.method === 'POST' ? problem(409, type) : emptyList()
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('does not send a form with a bad email', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'nobody')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST')).toBe(false)
  })

  it('opens the sheet with the three fields from the primary button, and Cancel closes it and gives the focus back', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    const dialog = await openInviteSheet()

    expect(within(dialog).getByRole('textbox', { name: 'Store name' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Owner email' })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: 'English' })).toBeChecked()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls.some(call => call.method === 'POST')).toBe(false)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invite an Owner' })).toHaveFocus())
  })

  it('names the invalid fields in the sheet and sends nothing for an empty form', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    const dialog = await openInviteSheet()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Create store and send invitation' }))

    expect(await within(dialog).findByText('Enter a store name of at least two letters or digits.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST')).toBe(false)
  })

  it('closes the sheet once the store is created, shows the toast, and reads the list again', async () => {
    let created = false

    answer = (call) => {
      if (call.method === 'POST') {
        created = true

        return Response.json(adminStoreSchema.parse(listed.items[0]), { status: 201 })
      }

      return created ? Response.json(listed) : emptyList()
    }
    const success = vi.spyOn(toast, 'success')

    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    await waitFor(() => expect(success).toHaveBeenCalledWith('Store created. The invitation goes to owner@example.ch.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Old Shop', { selector: 'h3' })).toBeInTheDocument()
    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('resends the Owner invitation with a new Idempotency-Key each time', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[0])) : Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    await screen.findByText('Old Shop', { selector: 'h3' })
    const [button] = within(storeCards()).getAllByRole('button', { name: 'Send invitation again' })

    await userEvent.click(button)
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await userEvent.click(within(storeTable()).getAllByRole('button', { name: 'Send invitation again' })[0])
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.method === 'POST')

    expect(first.path).toBe(`/api/admin/stores/${storeId}/owner-invitation/resend`)
    expect(first.body).toEqual({ language: 'en' })
    expect(second.key).not.toBe(first.key)
  })

  it('pages with the cursor the API sent', async () => {
    const next = '0198a000-0000-7000-8000-0000000000aa'

    answer = call => call.path.includes('cursor=')
      ? Response.json(adminStoreListSchema.parse({ items: [listed.items[2]], nextCursor: null }))
      : Response.json(adminStoreListSchema.parse({ items: [listed.items[0]], nextCursor: next }))
    renderAt('/admin', AdminStoresScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Show more stores' }))

    expect(await screen.findByText('Live Shop', { selector: 'h3' })).toBeInTheDocument()
    expect(calls.at(-1)?.path).toBe(`/api/admin/stores?cursor=${next}`)
    expect(screen.queryByRole('button', { name: 'Show more stores' })).not.toBeInTheDocument()
  })

  it('shows the not-found screen to a signed-in user who is not the Super Admin, and no admin form', async () => {
    answer = () => problem(403, 'forbidden')
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('No such page')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite an Owner' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Stores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Store name' })).not.toBeInTheDocument()
  })

  it('sends a visitor who has not signed in to sign-in and back to /admin', async () => {
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('Sign-in screen')).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ returnTo: '/admin' })
  })
})

describe('[E2.3] the stores client in the DataClient', () => {
  it('lists the queries each command refreshes, and only the commands', () => {
    const reads = ['adminStores', 'onboarding', 'me', 'members', 'previewInvitation']
    const commands = Object.keys(demo.dataClient.stores).filter(name => !reads.includes(name))

    expect(Object.keys(commandAffects.stores).sort()).toEqual(commands.sort())
    for (const keys of Object.values(commandAffects.stores))
      expect(keys.length).toBeGreaterThan(0)
  })
})

const timeoutError = () => new DOMException('The operation timed out', 'TimeoutError')
const lostConnection = () => new TypeError('Failed to fetch')

describe('[E2.3][S8] one Idempotency-Key per intent, not per request', () => {
  it.each([
    ['a timeout', () => { throw timeoutError() }],
    ['a lost connection', () => { throw lostConnection() }],
    ['a 5xx', () => problem(503, 'internal-error')],
    ['a key still in use', () => problem(409, 'idempotency-key-in-use')],
  ])('sends the same key when the accept is retried after %s', async (_name, first) => {
    sessionStorage.setItem('sk.invitationToken', token)
    let attempt = 0

    answer = acceptAnswers(() => {
      attempt += 1

      return attempt === 1 ? first() : accepted()
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()

    const accepts = calls.filter(call => call.path === '/api/me/invitations/accept')

    expect(accepts).toHaveLength(2)
    expect(accepts[0].key).toBeTruthy()
    expect(accepts[1].key).toBe(accepts[0].key)
  })

  it('sends a new key after the API gave a final answer', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    let attempt = 0

    answer = acceptAnswers(() => {
      attempt += 1

      return attempt === 1 ? problem(422, 'idempotency-key-reused') : accepted()
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    await screen.findByText('Before you open for sale')

    const [first, second] = calls.filter(call => call.path === '/api/me/invitations/accept')

    expect(second.key).not.toBe(first.key)
  })

  it('does not say nothing was changed after a failure that may have worked', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = acceptAnswers(() => { throw timeoutError() })
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText(/We could not tell whether it worked/)).toBeInTheDocument()
    expect(screen.queryByText(/Nothing was changed/)).not.toBeInTheDocument()
  })

  it('keeps the create-store key across a timeout and renews it when the input changes', async () => {
    let attempt = 0

    answer = (call) => {
      if (call.method === 'GET')
        return emptyList()
      attempt += 1
      if (attempt === 1)
        throw timeoutError()

      return Response.json(adminStoreSchema.parse(listed.items[0]), { status: 201 })
    }
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await userEvent.click(await screen.findByRole('button', { name: 'Create store and send invitation' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.method === 'POST')

    expect(second.key).toBe(first.key)
  })

  it('renews the create-store key when the owner changes the input after a failure', async () => {
    answer = call => call.method === 'GET' ? emptyList() : problem(503, 'internal-error')
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await userEvent.type(screen.getByRole('textbox', { name: 'Store name' }), ' Shop')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.method === 'POST')

    expect(second.key).not.toBe(first.key)
  })
})

describe('[E2.3][S8] a double tap sends one request', () => {
  it('creates one store', async () => {
    answer = call => call.method === 'GET' ? emptyList() : Response.json(adminStoreSchema.parse(listed.items[0]), { status: 201 })
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const button = screen.getByRole('button', { name: 'Create store and send invitation' })

    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    release()
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('resends once', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[0])) : Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    await screen.findByText('Old Shop', { selector: 'h3' })
    const [button] = within(storeCards()).getAllByRole('button', { name: 'Send invitation again' })
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    release()
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('opens for sale once', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({ mayOpenForSale: true, conditions: conditions('met').map(condition => ({ ...condition, state: 'met' })) }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => Response.json(storeSchema.parse({ ...store, status: 'live' })),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    const button = await screen.findByRole('button', { name: 'Open for sale' })
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    release()
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('saves the store information once', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers({
      [`PATCH /api/store/${storeId}/information`]: () => Response.json(storeSchema.parse({ ...store, name: 'Chi Ngoc Shop' })),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), ' Shop')
    const button = screen.getByRole('button', { name: 'Save' })
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    release()
    await waitFor(() => expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(1)
  })
})

describe('[E2.3][S8] the invitation survives a screen that is gone and a link opened in an open tab', () => {
  it('drops the token although the screen unmounted before the answer', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = onboardingAnswers()
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await waitFor(() => expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(true))
    router.unmount()
    release()

    await waitFor(() => expect(heldInvitationToken()).toBeUndefined())
  })

  it('accepts a link that is opened while the screen already shows no link', async () => {
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    act(() => {
      takeInvitationFromHash(`#/store/onboarding?invitation=${token}`)
    })

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    expect(calls.filter(call => call.path === '/api/me/invitations/accept')).toHaveLength(1)
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('answers a newer link on a screen that shows an older one\'s refusal', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    let answers = 0

    answer = acceptAnswers(() => {
      answers += 1

      return answers === 1 ? problem(404, 'invitation-not-found') : accepted()
    })
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'This invitation link is not valid' })).toBeInTheDocument()
    act(() => {
      takeInvitationFromHash(`#/store/onboarding?invitation=${token}-newer-link`)
    })

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
  })
})

describe('[E2.3][S8] a 401 marks the app signed out before sign-in', () => {
  it('clears the signed-in flag the sign-in screen would bounce back from, on accept', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'stale-guest' } }))
    answer = call => call.path === '/api/public/invitations/preview' ? previewBody() : problem(401, 'unauthenticated')
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in to continue' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })

  it('clears it on A01 reads too', async () => {
    demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'stale-guest' } }))
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/admin', AdminStoresScreen)

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })
})

describe('[E2.3][S8] refusals and failed reads', () => {
  it('shows the generic problem, not the not-found screen, for a 403 that is not `forbidden`', async () => {
    answer = () => problem(403, 'origin-refused')
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.queryByText('No such page')).not.toBeInTheDocument()
  })

  it('offers a retry when the first read fails, and shows the list once it works', async () => {
    let reads = 0

    answer = (call) => {
      if (call.path === '/api/auth/get-session')
        return signedInSession()
      reads += 1

      return reads === 1 ? problem(503, 'internal-error') : Response.json(listed)
    }
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-1')
    expect(screen.queryByLabelText('Stores at a glance')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Live Shop', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the Invite button and the loaded list when a later read fails', async () => {
    let reads = 0

    answer = (call) => {
      if (call.method === 'POST')
        return Response.json(adminStoreSchema.parse(listed.items[0]))
      if (call.path === '/api/auth/get-session')
        return signedInSession()
      reads += 1

      return reads === 1 ? Response.json(listed) : problem(503, 'internal-error')
    }
    renderAt('/admin', AdminStoresScreen)

    await screen.findByText('Old Shop', { selector: 'h3' })
    await userEvent.click(within(storeCards()).getAllByRole('button', { name: 'Send invitation again' })[0])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite an Owner' })).toBeEnabled()
    expect(screen.getByText('Live Shop', { selector: 'h3' })).toBeInTheDocument()
  })

  it('says to check the steps when the 409 meets conditions that are all met', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({ mayOpenForSale: true, conditions: conditions('met').map(condition => ({ ...condition, state: 'met' })) }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => problem(409, 'onboarding-incomplete'),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Open for sale' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The store cannot open yet. Check the steps above.')
    expect(screen.queryByText(/Still open/)).not.toBeInTheDocument()
  })

  it('moves focus to the refusal heading', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => problem(404, 'invitation-not-found')
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'This invitation link is not valid' })).toHaveFocus()
  })

  it('describes the locked Open for sale button by the reason it is locked', async () => {
    meStores = [ownerEntry]
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    const button = await screen.findByRole('button', { name: 'Open for sale' })

    expect(button).toHaveAccessibleDescription('Finish every step above to open for sale.')
  })

  it('gives a Super Admin the sign-out alone, with the private window hint', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = acceptAnswers(() => problem(403, 'invitation-super-admin'))
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText(/or open the link in a private window/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out and use another account' })).not.toBeInTheDocument()
  })

  it('shows the URL name under the store name, read only, as the name is typed', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    await openInviteSheet()
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chị Ngọc Keepsakes')

    expect(screen.getByText('Web address name: chi-ngoc-keepsakes')).toBeInTheDocument()
  })
})

describe('[E2.3][S8] the store information form keeps an edit through a background read', () => {
  it('does not wipe what the Owner typed when the store is read again with another name', async () => {
    meStores = [ownerEntry]
    let name = 'Chi Ngoc'

    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({ store: { name } }),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    const field = await screen.findByRole('textbox', { name: 'Store name' })

    await userEvent.type(field, ' Shop')
    name = 'Chi Ngoc Changed Elsewhere'
    await act(() => demo.queryClient.invalidateQueries({ queryKey: ['stores'] }))

    await waitFor(() => expect(screen.getByText('Chi Ngoc Changed Elsewhere')).toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Store name' })).toHaveValue('Chi Ngoc Shop')
  })
})

describe('[E2.3][S8] a sign-out forgets the stores of the user who signed out', () => {
  it('removes the cached reads', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    demo.queryClient.setQueryData(['stores', 'onboarding', storeId], { store })
    answer = call => call.path.startsWith('/api/auth/') && call.path !== '/api/auth/get-session' ? Response.json({ success: true }) : acceptAnswers(() => problem(403, 'invitation-email-mismatch'))(call)
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and use another account' }))

    await waitFor(() => expect(demo.queryClient.getQueryData(['stores', 'onboarding', storeId])).toBeUndefined())
    expect(demo.queryClient.getQueryData(['stores', 'onboarding', storeId])).toBeUndefined()
    expect(heldInvitationToken()).toBe(token)
  })
})
