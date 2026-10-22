import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { commandAffects } from '@/features/data-client/commands'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { AdminStoresScreen } from '@/features/stores/components/admin-stores-screen'
import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'
import { heldInvitationToken } from '@/features/stores/lib/invitation-token'
import { rememberedStore } from '@/features/stores/lib/owner-store'

// The real screens, hooks, DataClient and generated client, with the HTTP answered here. The bodies copy
// what the API sends (api/src/modules/identity/adapters/routes.ts).
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const token = 'tok_abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'
const store = { id: storeId, slug: 'chi-ngoc', name: 'Chi Ngoc', status: 'onboarding', defaultLanguage: 'en' }

interface Condition { key: string, state: 'met' | 'unmet' | 'pending' }
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
let fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function problem(status: number, type: string) {
  return Response.json({ type, status, title: type, instance: '/x', requestId: 'req-1' }, { status })
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
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

function onboardingAnswers(overrides: Partial<Record<string, () => Response>> = {}) {
  return (call: Call): Response => {
    const handler = overrides[`${call.method} ${call.path}`]

    if (handler)
      return handler()
    if (call.method === 'POST' && call.path === '/api/me/invitations/accept')
      return Response.json({ storeId, role: 'owner', storeStatus: 'onboarding' })
    if (call.path === `/api/store/${storeId}/onboarding`)
      return Response.json({ store, conditions: conditions(), mayOpenForSale: false })

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

  it('goes to sign-in when the API answers 401, keeps the token, and never puts it in returnTo', async () => {
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
    [409, 'already-a-member', 'You already belong to this store', false],
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

  it('reopens the remembered store without a token, and forgets it when the API says it is not theirs', async () => {
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

  it('saves the store information with a fresh Idempotency-Key per attempt', async () => {
    localStorage.setItem('sk.ownerStore', JSON.stringify(storeId))
    answer = onboardingAnswers({
      [`PATCH /api/store/${storeId}/information`]: () => Response.json({ ...store, name: 'Chi Ngoc Shop' }),
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
      [`GET /api/store/${storeId}/onboarding`]: () => Response.json({
        store: { ...store, status: live ? 'live' : 'onboarding' },
        conditions: conditions('met').map(condition => ({ ...condition, state: 'met' })),
        mayOpenForSale: !live,
      }),
      [`POST /api/store/${storeId}/open-for-sale`]: () => {
        live = true

        return Response.json({ ...store, status: 'live' })
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
      [`GET /api/store/${storeId}/onboarding`]: () => Response.json({ store, conditions: conditions(), mayOpenForSale: true }),
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

const listed = {
  items: [
    { ...store, status: 'invited', invitation: { email: 'owner@example.ch', state: 'open', expiresAt: '2026-10-29T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000002', slug: 'old', name: 'Old Shop', status: 'invited', invitation: { email: 'late@example.ch', state: 'expired', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'pending' },
    { ...store, id: '0198a000-0000-7000-8000-000000000003', slug: 'live', name: 'Live Shop', status: 'live', invitation: { email: 'done@example.ch', state: 'accepted', expiresAt: '2026-10-01T10:00:00.000Z' }, paymentAccount: 'met' },
  ],
  nextCursor: null,
}

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

        return Response.json(listed.items[0], { status: 201 })
      }

      return Response.json(created ? listed : { items: [], nextCursor: null })
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
    answer = call => call.method === 'POST' ? problem(409, type) : Response.json({ items: [], nextCursor: null })
    renderAt('/admin', AdminStoresScreen)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'owner@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('does not send a form with a bad email', async () => {
    answer = () => Response.json({ items: [], nextCursor: null })
    renderAt('/admin', AdminStoresScreen)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), 'Chi Ngoc')
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), 'nobody')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST')).toBe(false)
  })

  it('resends the Owner invitation with a new Idempotency-Key each time', async () => {
    answer = call => call.method === 'POST' ? Response.json(listed.items[0]) : Response.json(listed)
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
      ? Response.json({ items: [listed.items[2]], nextCursor: null })
      : Response.json({ items: [listed.items[0]], nextCursor: next })
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
