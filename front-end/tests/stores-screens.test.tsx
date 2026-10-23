import { acceptedInvitationSchema, adminStoreListSchema, adminStoreSchema, onboardingSchema, problemSchema, storeSchema } from '@sk/api-contract'
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
import { rememberedStore } from '@/features/stores/lib/owner-store'

// The real screens, hooks, DataClient and generated client, with the HTTP answered here. The bodies copy
// what the API sends (api/src/modules/identity/adapters/routes.ts).

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const token = 'tok_abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'
const store = storeSchema.parse({ id: storeId, slug: 'chi-ngoc', name: 'Chi Ngoc', status: 'onboarding', defaultLanguage: 'en' })

interface Condition { key: 'store-information' | 'payment-account' | 'catalogue' | 'policies', state: 'met' | 'unmet' | 'pending' }
function conditions(payment: Condition['state'] = 'pending'): Condition[] {
  return [
    { key: 'store-information', state: 'met' },
    { key: 'payment-account', state: payment },
    { key: 'catalogue', state: 'pending' },
    { key: 'policies', state: 'pending' },
  ]
}

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
    if (hold && request.method !== 'GET')
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
  const router = createRouter({
    routeTree: root.addChildren([page, signIn, home]),
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

function onboardingAnswers(overrides: Partial<Record<string, () => Response>> = {}) {
  return (call: Call): Response => {
    const handler = overrides[`${call.method} ${call.path}`]

    if (handler)
      return handler()
    if (call.method === 'POST' && call.path === '/api/me/invitations/accept')
      return accepted()
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
    expect(rememberedStore()).toBe(storeId)
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open for sale' })).toBeDisabled()
    expect(screen.getByText('Finish every step above to open for sale.')).toBeInTheDocument()
  })

  it('goes to sign-in with the fixed returnTo when the API answers 401, and keeps the token in sessionStorage only', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Sign-in screen')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
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
    answer = () => problem(status, type)
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(heldInvitationToken()).toBe(spent ? undefined : token)
  })

  it('offers sign-out for a wrong account, and the invitation stays open for the right one', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = call => call.path.startsWith('/api/auth/') ? Response.json({ success: true }) : problem(403, 'invitation-email-mismatch')
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and use another account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/onboarding' })
    expect(heldInvitationToken()).toBe(token)
  })

  it('says to open the email link when there is no token and no store', async () => {
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it('reopens the remembered store without a token', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText('Before you open for sale')).toBeInTheDocument()
    expect(calls.map(call => call.path)).toEqual([`/api/store/${storeId}/onboarding`])
  })

  it('forgets a remembered store that answers 403', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    answer = () => problem(403, 'forbidden')
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(rememberedStore()).toBeUndefined()
  })

  it('saves the store information, with a new Idempotency-Key once the first save is done', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    answer = onboardingAnswers({
      [`GET /api/store/${storeId}/onboarding`]: () => onboardingBody({ mayOpenForSale: true }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => problem(409, 'onboarding-incomplete'),
    })
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Open for sale' }))

    const alert = await screen.findByRole('alert')

    expect(within(alert).getByText(/The store cannot open yet\. Still open: Payment account, A product or a tour, Policies\./)).toBeInTheDocument()
    await waitFor(() => expect(calls.filter(call => call.method === 'GET')).toHaveLength(2))
    await userEvent.click(screen.getByRole('button', { name: 'Open for sale' }))
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(2))

    const [first, second] = calls.filter(call => call.path.endsWith('/open-for-sale'))

    expect(second.key).not.toBe(first.key)
  })
})

const listed = adminStoreListSchema.parse({
  items: [
    { ...store, status: 'invited', invitation: { email: 'owner@example.ch', state: 'open', expiresAt: '2026-10-29T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000002', slug: 'old', name: 'Old Shop', status: 'invited', invitation: { email: 'late@example.ch', state: 'expired', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000003', slug: 'live', name: 'Live Shop', status: 'live', invitation: { email: 'done@example.ch', state: 'accepted', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'met' },
  ],
  nextCursor: null,
})

const emptyList = () => Response.json(adminStoreListSchema.parse({ items: [], nextCursor: null }))

describe('[E2.3][S8] A01, the Super Admin invites the Owner', () => {
  it('lists stores with their status and invitation state, and offers a resend only while the Owner has not accepted', async () => {
    answer = () => Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('Invitation sent to owner@example.ch. It expires on 29.10.2026.')).toBeInTheDocument()
    expect(screen.getByText('Invitation to late@example.ch expired on 01.10.2026.')).toBeInTheDocument()
    expect(screen.getByText('done@example.ch accepted the invitation.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Send invitation again' })).toHaveLength(2)
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

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chị Ngọc Keepsakes')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('radio', { name: 'Deutsch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Invitation sent to owner@example.ch. It expires on 29.10.2026.')).toBeInTheDocument()
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

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('does not send a form with a bad email', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'nobody')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST')).toBe(false)
  })

  it('resends the Owner invitation with a new Idempotency-Key each time', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[0])) : Response.json(listed)
    renderAt('/admin', AdminStoresScreen)

    const [button] = await screen.findAllByRole('button', { name: 'Send invitation again' })

    await userEvent.click(button)
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await userEvent.click(screen.getAllByRole('button', { name: 'Send invitation again' })[0])
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

    expect(await screen.findByText('Live Shop')).toBeInTheDocument()
    expect(calls.at(-1)?.path).toBe(`/api/admin/stores?cursor=${next}`)
    expect(screen.queryByRole('button', { name: 'Show more stores' })).not.toBeInTheDocument()
  })

  it('shows the not-found screen to a signed-in user who is not the Super Admin, and no admin form', async () => {
    answer = () => problem(403, 'forbidden')
    renderAt('/admin', AdminStoresScreen)

    expect(await screen.findByText('No such page')).toBeInTheDocument()
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
    const reads = ['adminStores', 'onboarding']
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

    answer = (call) => {
      if (call.path !== '/api/me/invitations/accept')
        return onboardingBody()
      attempt += 1

      return attempt === 1 ? first() : accepted()
    }
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

    answer = (call) => {
      if (call.path !== '/api/me/invitations/accept')
        return onboardingBody()
      attempt += 1

      return attempt === 1 ? problem(422, 'idempotency-key-reused') : accepted()
    }
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    await screen.findByText('Before you open for sale')

    const [first, second] = calls.filter(call => call.path === '/api/me/invitations/accept')

    expect(second.key).not.toBe(first.key)
  })

  it('does not say nothing was changed after a failure that may have worked', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => { throw timeoutError() }
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

    const [button] = await screen.findAllByRole('button', { name: 'Send invitation again' })
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
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
  it('drops the token and remembers the store although the screen unmounted before the answer', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = onboardingAnswers()
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const router = renderAt('/store/onboarding', OnboardingScreen)

    await waitFor(() => expect(calls.some(call => call.path === '/api/me/invitations/accept')).toBe(true))
    router.unmount()
    release()

    await waitFor(() => expect(rememberedStore()).toBe(storeId))
    expect(heldInvitationToken()).toBeUndefined()
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

    answer = (call) => {
      if (call.path === '/api/me/invitations/accept') {
        answers += 1

        return answers === 1 ? problem(404, 'invitation-not-found') : accepted()
      }

      return onboardingBody()
    }
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
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/store/onboarding', OnboardingScreen)

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

  it('keeps the form and the loaded list when a later read fails', async () => {
    let reads = 0

    answer = (call) => {
      if (call.method === 'POST')
        return Response.json(adminStoreSchema.parse(listed.items[0]))
      reads += 1

      return reads === 1 ? Response.json(listed) : problem(503, 'internal-error')
    }
    renderAt('/admin', AdminStoresScreen)

    await userEvent.click((await screen.findAllByRole('button', { name: 'Send invitation again' }))[0])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Store name' })).toBeInTheDocument()
    expect(screen.getByText('Live Shop')).toBeInTheDocument()
  })

  it('says to check the steps when the 409 meets conditions that are all met', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    answer = onboardingAnswers()
    renderAt('/store/onboarding', OnboardingScreen)

    const button = await screen.findByRole('button', { name: 'Open for sale' })

    expect(button).toHaveAccessibleDescription('Finish every step above to open for sale.')
  })

  it('gives a Super Admin the sign-out alone, with the private window hint', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => problem(403, 'invitation-super-admin')
    renderAt('/store/onboarding', OnboardingScreen)

    expect(await screen.findByText(/or open the link in a private window/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out and use another account' })).not.toBeInTheDocument()
  })

  it('shows the URL name under the store name, read only, as the name is typed', async () => {
    answer = () => emptyList()
    renderAt('/admin', AdminStoresScreen)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chị Ngọc Keepsakes')

    expect(screen.getByText('Web address name: chi-ngoc-keepsakes')).toBeInTheDocument()
  })
})

describe('[E2.3][S8] the store information form keeps an edit through a background read', () => {
  it('does not wipe what the Owner typed when the store is read again with another name', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
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
  it('removes the cached reads and the remembered store', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    demo.queryClient.setQueryData(['stores', 'onboarding', storeId], { store })
    answer = call => call.path.startsWith('/api/auth/') ? Response.json({ success: true }) : problem(403, 'invitation-email-mismatch')
    renderAt('/store/onboarding', OnboardingScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and use another account' }))

    await waitFor(() => expect(rememberedStore()).toBeUndefined())
    expect(demo.queryClient.getQueryData(['stores', 'onboarding', storeId])).toBeUndefined()
    expect(heldInvitationToken()).toBe(token)
  })
})
