import { acceptedInvitationSchema, invitationPreviewSchema, memberInvitationSchema, membersSchema, meSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider, queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { InvitationScreen } from '@/features/stores/components/invitation-screen'
import { MembersTab } from '@/features/stores/components/members-tab'
import { SettingsScreen } from '@/features/stores/components/settings-screen'
import { heldInvitationToken } from '@/features/stores/lib/invitation-token'
import { memberProblemKey, showsMembersTab } from '@/features/stores/lib/member-problems'
import { acceptRefusal, refusalKeys } from '@/features/stores/lib/refusals'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const ownerMember = '0198a000-0000-7000-8000-0000000000a1'
const managerMember = '0198a000-0000-7000-8000-0000000000a2'
const openInvitation = '0198a000-0000-7000-8000-0000000000b1'
const expiredInvitation = '0198a000-0000-7000-8000-0000000000b2'
const token = 'tok_abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz'

let calls: Call[]
let answer: (call: Call) => Response
let demo: ReturnType<typeof startDemo>
let hold: Promise<void> | undefined
let members: ReturnType<typeof membersSchema.parse>

function problem(status: number, type: string) {
  return Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })
}

function membersFixture() {
  return membersSchema.parse({
    members: [
      { id: ownerMember, email: 'owner@example.ch', role: 'owner', acceptedAt: '2026-10-01T10:00:00.000Z' },
      { id: managerMember, email: 'a-very-long-manager-address-for-wrapping@subdomain.example.ch', role: 'manager', acceptedAt: '2026-10-05T10:00:00.000Z' },
    ],
    invitations: [
      { id: openInvitation, email: 'open@example.ch', state: 'open', expiresAt: '2026-10-29T10:00:00.000Z' },
      { id: expiredInvitation, email: 'late@example.ch', state: 'expired', expiresAt: '2026-10-01T10:00:00.000Z' },
    ],
  })
}

const invitationOf = (id: string, email: string, state: 'open' | 'expired' | 'revoked' = 'open') => memberInvitationSchema.parse({ id, email, state, expiresAt: '2026-10-29T10:00:00.000Z' })

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  hold = undefined
  members = membersFixture()
  answer = () => Response.json({})
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), body: text ? JSON.parse(text) : undefined }

    calls.push(call)
    if (hold && request.method !== 'GET')
      await hold

    return answer(call)
  })
  demo = startDemo()
  await demo.ready
})

function renderAt(path: string, Screen: () => React.ReactNode) {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: path.split('?')[0], component: Screen })
  const signIn = createRoute({ getParentRoute: () => root, path: '/sign-in', component: () => <p>Sign-in screen</p> })
  const store = createRoute({ getParentRoute: () => root, path: '/store', component: () => <p>Merchant shell</p> })
  const onboarding = createRoute({ getParentRoute: () => root, path: '/store/onboarding', component: () => <p>Onboarding screen</p> })
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>Home</p> })
  const router = createRouter({
    routeTree: root.addChildren([page, signIn, store, onboarding, home]),
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

function preview(overrides: Partial<{ storeName: string, role: 'owner' | 'manager', inviterName: string | null, state: 'open' | 'expired' | 'revoked' | 'accepted' }> = {}) {
  return Response.json(invitationPreviewSchema.parse({ storeName: 'Chi Ngoc', role: 'manager', inviterName: 'Ngoc', state: 'open', ...overrides }))
}
const accepted = (role: 'owner' | 'manager' = 'manager') => Response.json(acceptedInvitationSchema.parse({ storeId, role, storeStatus: 'onboarding' }))
const session = (name: string) => Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'm@example.ch', name } })

describe('[E2.4][AC02] the refusal mapping', () => {
  it.each([
    ['invitation-not-found', 'notFound'],
    ['invitation-expired', 'expired'],
    ['invitation-revoked', 'revoked'],
    ['invitation-already-accepted', 'accepted'],
    ['invitation-email-mismatch', 'mismatch'],
    ['invitation-super-admin', 'superAdmin'],
    ['already-a-member', 'member'],
    ['validation-failed', 'notFound'],
    ['something-new', 'failed'],
  ])('maps %s to %s', (type, refusal) => {
    expect(acceptRefusal(new ApiProblem(409, type, 'x'))).toBe(refusal)
  })

  it('maps a lost connection to failed, and words a Manager\'s refusals for the Owner of the store', () => {
    expect(acceptRefusal(new TypeError('Failed to fetch'))).toBe('failed')
    expect(refusalKeys('expired', 'manager').text).toBe('stores.refusal.expired.manager.text')
    expect(refusalKeys('expired', 'owner').text).toBe('stores.refusal.expired.text')
    expect(refusalKeys('mismatch', 'manager').text).toBe('stores.refusal.mismatch.text')
  })

  it('words every members problem code, and the guard code', () => {
    for (const type of ['invitation-already-open', 'already-a-member', 'manager-is-super-admin', 'cannot-remove-owner', 'member-not-found', 'forbidden'])
      expect(memberProblemKey(new ApiProblem(409, type, 'x'))).toMatch(/^stores\.members\./)
    expect(memberProblemKey(new ApiProblem(500, 'internal-error', 'x'))).toBe('stores.problem.generic')
    expect(memberProblemKey(new TypeError('Failed to fetch'))).toBe('stores.problem.network')
  })

  it('shows the members tab to an Owner of the current store only', () => {
    expect(showsMembersTab({ role: 'owner' })).toBe(true)
    expect(showsMembersTab({ role: 'manager' })).toBe(false)
    expect(showsMembersTab(undefined)).toBe(false)
  })
})

describe('[E2.4][AC02] M01, the Store Manager accepts an invitation', () => {
  function signedIn() {
    demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'guest-1' } }))
  }

  it('shows the store, the inviter and the role before sign-in, and accepts nothing by itself', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => preview()
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByRole('heading', { name: 'Join Chi Ngoc' })).toBeInTheDocument()
    expect(screen.getByText('Ngoc invited you to Chi Ngoc as a Store Manager.')).toBeInTheDocument()
    expect(screen.getByText('Store Manager invitation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    // The preview, and the session (the form shows only once it answered null). No accept.
    expect(calls.map(call => call.path).sort()).toEqual(['/api/auth/get-session', '/api/public/invitations/preview'])
  })

  it('sends no accept for a signed-in Manager before the tap', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    demo.store.update(s => ({ ...s, data: { ...s.data, signedInGuestId: 'guest-1' } }))
    answer = () => preview()
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument()
    expect(calls.map(call => call.path)).toEqual(['/api/public/invitations/preview'])
    expect(heldInvitationToken()).toBe(token)
  })

  it('words a refused Owner link on M01 for the platform team, by the role of the preview, and drops the token', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => preview({ role: 'owner', state: 'expired' })
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByText('Ask the platform team to send the invitation again.')).toBeInTheDocument()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('uses a generic line when the inviter has no name', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => preview({ inviterName: null })
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByText('You are invited to Chi Ngoc as a Store Manager.')).toBeInTheDocument()
  })

  it('signs in on the invitation itself, with no token in the address, and the Accept button follows', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => preview()
    const router = renderAt('/invitation', InvitationScreen)

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/invitation')
    expect(router.state.location.href).not.toContain(token)
    expect(heldInvitationToken()).toBe(token)
    signedIn()

    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('accepts only when the Manager taps Accept invitation, once, with an Idempotency-Key, and goes to the store', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    signedIn()
    answer = (call) => {
      if (call.path === '/api/me/invitations/accept')
        return accepted()
      if (call.path === '/api/auth/get-session')
        return session('Mia')

      return preview()
    }
    const router = renderAt('/invitation', InvitationScreen)

    const button = await screen.findByRole('button', { name: 'Accept invitation' })

    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })

    await waitFor(() => expect(router.state.location.pathname).toBe('/store'))
    const accepts = calls.filter(call => call.path === '/api/me/invitations/accept')

    expect(accepts).toHaveLength(1)
    expect(accepts[0].body).toEqual({ token })
    expect(accepts[0].key).toBeTruthy()
    expect(heldInvitationToken()).toBeUndefined()
  })

  it('asks a Manager with no name for a display name before the store, and saves it with updateUser', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    signedIn()
    answer = (call) => {
      if (call.path === '/api/me/invitations/accept')
        return accepted()
      if (call.path === '/api/auth/get-session')
        return session('')
      if (call.path === '/api/auth/update-user')
        return Response.json({ status: true })

      return preview()
    }
    const router = renderAt('/invitation', InvitationScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    const field = await screen.findByRole('textbox', { name: 'Your name' })

    expect(router.state.location.pathname).toBe('/invitation')
    expect(field).toHaveAttribute('maxlength', '80')
    await userEvent.type(field, 'Mia')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/store'))
    expect(calls.find(call => call.path === '/api/auth/update-user')?.body).toEqual({ name: 'Mia' })
  })

  it.each([
    ['expired', 'This invitation has expired', 'Ask the store Owner to send the invitation again.'],
    ['revoked', 'This invitation was withdrawn', 'Ask the store Owner for a new invitation.'],
  ] as const)('shows the %s state from the preview before any sign-in, in the Manager\'s words', async (state, title, text) => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => preview({ state })
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sign in|Accept/ })).not.toBeInTheDocument()
  })

  it('shows the unknown state for a token the API does not know', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    answer = () => problem(404, 'invitation-not-found')
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByRole('heading', { name: 'This invitation link is not valid' })).toBeInTheDocument()
  })

  it.each([
    [409, 'invitation-already-accepted', 'This invitation was already used', true],
    [403, 'invitation-email-mismatch', 'This invitation is for another email address', false],
    [403, 'invitation-super-admin', 'Use a store account', false],
    [409, 'already-a-member', 'You already belong to this store', true],
    [410, 'invitation-expired', 'This invitation has expired', true],
  ])('shows %i %s on accept as its own state, with the token kept only when the invitation stays open', async (status, type, title, spent) => {
    sessionStorage.setItem('sk.invitationToken', token)
    signedIn()
    answer = call => call.path === '/api/me/invitations/accept' ? problem(status, type) : preview()
    renderAt('/invitation', InvitationScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByRole('heading', { name: title })).toHaveFocus()
    expect(heldInvitationToken()).toBe(spent ? undefined : token)
  })

  it('offers sign-out and switch for a wrong account, and the embedded sign-in shows on /invitation with the token held', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    signedIn()
    answer = (call) => {
      if (call.path.startsWith('/api/auth/'))
        return Response.json({ success: true })

      return call.path === '/api/me/invitations/accept' ? problem(403, 'invitation-email-mismatch') : preview()
    }
    const router = renderAt('/invitation', InvitationScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out and use another account' }))

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/invitation')
    expect(heldInvitationToken()).toBe(token)
  })

  it('goes to sign-in at once when a tap on Accept meets a session that ended', async () => {
    sessionStorage.setItem('sk.invitationToken', token)
    signedIn()
    answer = call => call.path === '/api/me/invitations/accept' ? problem(401, 'unauthenticated') : preview()
    const router = renderAt('/invitation', InvitationScreen)

    await userEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(demo.store.getState().data.signedInGuestId).toBeNull()
  })

  it('says to open the email link when there is no token, and asks the API nothing', async () => {
    renderAt('/invitation', InvitationScreen)

    expect(await screen.findByRole('heading', { name: 'Open the link from your email' })).toBeInTheDocument()
    expect(calls).toEqual([])
  })
})

describe('[E2.4][AC02] M22, the members tab', () => {
  function membersAnswers(overrides: Partial<Record<string, () => Response>> = {}) {
    return (call: Call): Response => {
      const handler = overrides[`${call.method} ${call.path}`]

      if (handler)
        return handler()
      if (call.method === 'GET' && call.path === `/api/store/${storeId}/members`)
        return Response.json(members)

      return Response.json({})
    }
  }

  it('lists members with email, role and date, and open and expired invitations, and an Owner row has no Remove', async () => {
    answer = membersAnswers()
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    expect(await screen.findByText('owner@example.ch')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    const owner = rows.find(row => row.getAttribute('data-member') === 'owner')!
    const manager = rows.find(row => row.getAttribute('data-member') === 'manager')!

    expect(within(owner).getByText('Owner')).toBeInTheDocument()
    expect(within(owner).getByText('Member since 01.10.2026')).toBeInTheDocument()
    expect(within(owner).queryByRole('button')).not.toBeInTheDocument()
    expect(within(manager).getByRole('button', { name: /Remove a-very-long/ })).toBeInTheDocument()
    expect(screen.getByText('Invited. The link works until 29.10.2026.')).toBeInTheDocument()
    expect(screen.getByText('Expired on 01.10.2026. Send it again to renew the link.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Send the invitation to .* again$/ })).toHaveLength(2)
  })

  it('shows the empty invitations state and the loading state', async () => {
    members = membersSchema.parse({ members: members.members, invitations: [] })
    answer = membersAnswers()
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('No open invitations.')).toBeInTheDocument()
  })

  it('shows the guard message, with no retry, when the API answers 403 to the list', async () => {
    answer = () => problem(403, 'forbidden')
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Only the Owner can manage the members of the store.')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('invites a Manager by email in the chosen language, with one key, and reads the list again', async () => {
    let invited = false

    answer = membersAnswers({
      [`POST /api/store/${storeId}/member-invitations`]: () => {
        invited = true
        members = membersSchema.parse({ ...members, invitations: [...members.invitations, invitationOf('0198a000-0000-7000-8000-0000000000b3', 'new@example.ch')] })

        return Response.json(invitationOf('0198a000-0000-7000-8000-0000000000b3', 'new@example.ch'), { status: 201 })
      },
    })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Email address' }), ' new@example.ch ')
    await userEvent.click(screen.getByRole('radio', { name: 'Deutsch' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('new@example.ch')).toBeInTheDocument()
    expect(invited).toBe(true)
    const post = calls.find(call => call.method === 'POST')

    expect(post?.body).toEqual({ email: 'new@example.ch', language: 'de' })
    expect(post?.key).toBeTruthy()
  })

  it('does not send a bad email', async () => {
    answer = membersAnswers()
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Email address' }), 'nobody')
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls.some(call => call.method === 'POST')).toBe(false)
  })

  it.each([
    ['already-a-member', 'This person already belongs to the store.'],
    ['invitation-already-open', 'This email already has an open invitation. Send that one again instead.'],
    ['manager-is-super-admin', 'This email belongs to a Super Admin, who cannot take a store role. Use another email address.'],
  ])('shows %s next to the email field', async (type, message) => {
    answer = membersAnswers({ [`POST /api/store/${storeId}/member-invitations`]: () => problem(409, type) })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Email address' }), 'new@example.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('sends one invite for a double tap', async () => {
    answer = membersAnswers({ [`POST /api/store/${storeId}/member-invitations`]: () => Response.json(invitationOf(openInvitation, 'new@example.ch'), { status: 201 }) })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Email address' }), 'new@example.ch')
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const button = screen.getByRole('button', { name: 'Send invitation' })

    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    release()
    await waitFor(() => expect(calls.filter(call => call.method === 'POST')).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('sends an expired invitation again without a language, and revokes an open one after a confirmation', async () => {
    answer = membersAnswers({
      [`POST /api/store/${storeId}/member-invitations/${expiredInvitation}/resend`]: () => Response.json(invitationOf(expiredInvitation, 'late@example.ch')),
      [`POST /api/store/${storeId}/member-invitations/${openInvitation}/revoke`]: () => Response.json(invitationOf(openInvitation, 'open@example.ch', 'revoked')),
    })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Send the invitation to late@example.ch again' }))
    await waitFor(() => expect(calls.some(call => call.path.endsWith('/resend'))).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: 'Revoke the invitation to open@example.ch' }))
    expect(calls.some(call => call.path.endsWith('/revoke'))).toBe(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw invitation' }))
    await waitFor(() => expect(calls.some(call => call.path.endsWith('/revoke'))).toBe(true))

    expect(calls.find(call => call.path.endsWith('/resend'))?.body).toEqual({})
    expect(calls.find(call => call.path.endsWith('/revoke'))?.key).toBeTruthy()
    expect(calls.filter(call => call.path === `/api/store/${storeId}/members`).length).toBeGreaterThanOrEqual(3)
  })

  it('does not revoke when the Owner cancels the confirmation', async () => {
    answer = membersAnswers()
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke the invitation to open@example.ch' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(calls.some(call => call.path.endsWith('/revoke'))).toBe(false)
  })

  it('keeps one key for a resend until it is settled, renews it for the next resend, and uses another key for a revoke', async () => {
    let attempt = 0

    answer = membersAnswers({
      [`POST /api/store/${storeId}/member-invitations/${expiredInvitation}/resend`]: () => {
        attempt += 1

        return attempt === 1 ? problem(503, 'internal-error') : Response.json(invitationOf(expiredInvitation, 'late@example.ch'))
      },
      [`POST /api/store/${storeId}/member-invitations/${expiredInvitation}/revoke`]: () => Response.json(invitationOf(expiredInvitation, 'late@example.ch', 'revoked')),
    })
    renderAt('/members', () => <MembersTab storeId={storeId} />)
    const resendButton = await screen.findByRole('button', { name: 'Send the invitation to late@example.ch again' })
    const resends = () => calls.filter(call => call.path.endsWith('/resend'))

    await userEvent.click(resendButton)
    await waitFor(() => expect(resends()).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Send the invitation to late@example.ch again' }))
    await waitFor(() => expect(resends()).toHaveLength(2))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send the invitation to late@example.ch again' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Send the invitation to late@example.ch again' }))
    await waitFor(() => expect(resends()).toHaveLength(3))
    await userEvent.click(screen.getByRole('button', { name: 'Revoke the invitation to late@example.ch' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw invitation' }))
    await waitFor(() => expect(calls.some(call => call.path.endsWith('/revoke'))).toBe(true))

    const [first, retry, next] = resends()
    const revoke = calls.find(call => call.path.endsWith('/revoke'))

    expect(retry.key).toBe(first.key)
    expect(next.key).not.toBe(first.key)
    expect(revoke?.key).not.toBe(first.key)
    expect(revoke?.key).not.toBe(next.key)
  })

  it('disables Send again while the revoke is pending, and Revoke while the resend is pending', async () => {
    answer = membersAnswers({
      [`POST /api/store/${storeId}/member-invitations/${expiredInvitation}/resend`]: () => Response.json(invitationOf(expiredInvitation, 'late@example.ch')),
      [`POST /api/store/${storeId}/member-invitations/${expiredInvitation}/revoke`]: () => Response.json(invitationOf(expiredInvitation, 'late@example.ch', 'revoked')),
    })
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Send the invitation to late@example.ch again' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revoke the invitation to late@example.ch' })).toBeDisabled())
    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revoke the invitation to late@example.ch' })).toBeEnabled())

    hold = new Promise<void>((resolve) => { release = resolve })
    await userEvent.click(screen.getByRole('button', { name: 'Revoke the invitation to late@example.ch' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw invitation' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send the invitation to late@example.ch again' })).toBeDisabled())
    release()
  })

  it.each([
    [404, 'invitation-not-found'],
    [409, 'invitation-already-accepted'],
  ])('reads the list again after a %i %s on a revoke, so the list is never stale', async (status, type) => {
    answer = membersAnswers({ [`POST /api/store/${storeId}/member-invitations/${openInvitation}/revoke`]: () => problem(status, type) })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke the invitation to open@example.ch' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw invitation' }))

    await waitFor(() => expect(calls.filter(call => call.path === `/api/store/${storeId}/members`)).toHaveLength(2))
  })

  it('goes to sign-in and back to Settings when a members command meets a session that ended', async () => {
    answer = membersAnswers({ [`POST /api/store/${storeId}/member-invitations/${openInvitation}/revoke`]: () => problem(401, 'unauthenticated') })
    const router = renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke the invitation to open@example.ch' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw invitation' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/settings' })
  })

  it('goes to sign-in and back to Settings when the list answers 401', async () => {
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/members', () => <MembersTab storeId={storeId} />)

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/settings' })
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('asks before removing a Manager, then removes and reads the list again', async () => {
    answer = membersAnswers({ [`DELETE /api/store/${storeId}/members/${managerMember}`]: () => new Response(null, { status: 204 }) })
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: /Remove a-very-long/ }))
    expect(calls.some(call => call.method === 'DELETE')).toBe(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove from the store' }))

    await waitFor(() => expect(calls.some(call => call.method === 'DELETE')).toBe(true))
    expect(calls.find(call => call.method === 'DELETE')?.key).toBeTruthy()
    await waitFor(() => expect(calls.filter(call => call.path === `/api/store/${storeId}/members`).length).toBeGreaterThanOrEqual(2))
  })

  it('does not remove when the Owner cancels', async () => {
    answer = membersAnswers()
    renderAt('/members', () => <MembersTab storeId={storeId} />)

    await userEvent.click(await screen.findByRole('button', { name: /Remove a-very-long/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(calls.some(call => call.method === 'DELETE')).toBe(false)
  })
})

describe('[E2.4][AC02] the members tab sits in Settings and is hidden from a Manager', () => {
  const meOf = (role: 'owner' | 'manager') => Response.json(meSchema.parse({ guestId: '0198a000-0000-7000-8000-0000000000f1', stores: [{ storeId, role, status: 'live' }] }))

  it('opens on Members for the Owner of the current store, with General beside it, and no tab before /api/me answers', async () => {
    answer = call => call.path === '/api/me' ? meOf('owner') : Response.json(members)
    renderAt('/members', SettingsScreen)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Members', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(await screen.findByText('owner@example.ch')).toBeInTheDocument()
  })

  it('goes to sign-in and back to Settings when /api/me answers 401', async () => {
    answer = () => problem(401, 'unauthenticated')
    const router = renderAt('/members', SettingsScreen)

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toEqual({ returnTo: '/store/settings' })
  })

  it('shows a Manager no members tab, and never asks for the members', async () => {
    answer = call => call.path === '/api/me' ? meOf('manager') : problem(403, 'forbidden')
    renderAt('/members', SettingsScreen)

    await waitFor(() => expect(demo.queryClient.getQueryState(queryKeys.stores.me)?.status).toBe('success'))
    expect(await screen.findByText(/later phase/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(calls.some(call => call.path.endsWith('/members'))).toBe(false)
  })
})
