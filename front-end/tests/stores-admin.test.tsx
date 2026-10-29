import { toast } from '@heroui/react'
import { adminStoreListSchema, adminStoreSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { AdminStoresScreen } from '@/features/stores/components/admin-stores-screen'
import { writeStored } from '@/lib/storage'

// The real A01 screen, hooks and DataClient, with the HTTP answered here (as in stores-screens.test.tsx).
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, body: unknown }

const id = (n: number) => `0198a000-0000-7000-8000-00000000010${n}`
const longName = `Maison ${'Très-Longue-Boutique-'.repeat(8)}`.slice(0, 120)
const longEmail = `${'reservation.'.repeat(18)}x@${'gasthaus-goldener-hirschen.'.repeat(1)}luzern.ch`.slice(0, 254)
const base = { defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z' } as const

const listed = adminStoreListSchema.parse({
  items: [
    { ...base, id: id(1), slug: 'atelier', name: 'Atelier am See', status: 'onboarding', invitation: { email: 'lena@atelier.ch', state: 'accepted', expiresAt: '2026-10-27T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'met', 'catalogue': 'pending', 'policies': 'met' } },
    { ...base, id: id(2), slug: 'live', name: 'Live Shop', status: 'live', invitation: { email: 'done@example.ch', state: 'accepted', expiresAt: '2026-10-01T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'met', 'catalogue': 'met', 'policies': 'met' } },
    { ...base, id: id(3), slug: 'sus', name: 'Löwen Papeterie', status: 'suspended', invitation: { email: 'hallo@loewen.ch', state: 'accepted', expiresAt: '2026-10-01T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'unmet', 'catalogue': 'pending', 'policies': 'pending' } },
    { ...base, id: id(4), slug: 'kapell', name: 'Kapellbrücke', status: 'invited', invitation: { email: 'marco@kapell.ch', state: 'open', expiresAt: '2026-11-04T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' } },
    { ...base, id: id(5), slug: 'pilatus', name: 'Pilatus Bergkiosk', status: 'invited', invitation: { email: 'info@pilatus.ch', state: 'expired', expiresAt: '2026-10-22T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' } },
    { ...base, id: id(6), slug: 'rev', name: 'Revoked Shop', status: 'invited', invitation: { email: 'gone@example.ch', state: 'revoked', expiresAt: '2026-10-20T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' } },
  ],
  nextCursor: null,
})
const emptyList = () => Response.json(adminStoreListSchema.parse({ items: [], nextCursor: null }))
const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

let calls: Call[]
let answer: (call: Call) => Response
let demo: ReturnType<typeof startDemo>
let hold: Promise<void> | undefined
let clipboard: { writeText: ReturnType<typeof vi.fn> }

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  hold = undefined
  answer = () => Response.json(listed)
  clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), body: text ? JSON.parse(text) : undefined }

    calls.push(call)
    if (hold && request.method !== 'GET')
      await hold
    if (call.path === '/api/auth/get-session')
      return Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'o@example.ch', name: 'Mia' } })

    return answer(call)
  })
  demo = startDemo()
  await demo.ready
})

function renderAdmin() {
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({ getParentRoute: () => root, path: '/admin', component: AdminStoresScreen })
  const signIn = createRoute({ getParentRoute: () => root, path: '/sign-in', component: () => <p>Sign-in screen</p> })
  const router = createRouter({ routeTree: root.addChildren([page, signIn]), history: createMemoryHistory({ initialEntries: ['/admin'] }), disableGlobalCatchBoundary: true })

  return render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={demo.feedback} />
          <DemoProvider store={demo.store}>
            <RouterProvider router={router} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const table = () => screen.getByRole('grid', { name: 'All stores' })
const cards = () => screen.getByRole('list', { name: 'All stores' })
const rowOf = (name: string) => within(table()).getByText(name).closest('tr') as HTMLElement
const cardOf = (name: string) => within(cards()).getByText(name, { selector: 'h3' }).closest('li') as HTMLElement
const posts = () => calls.filter(call => call.method === 'POST')

async function openMenu(scope: HTMLElement, name: string) {
  await userEvent.click(within(scope).getByRole('button', { name: `Actions for ${name}` }))

  return screen.findByRole('menu', { name: `Actions for ${name}` })
}

async function openInviteSheet() {
  const [button] = await screen.findAllByRole('button', { name: 'Invite an Owner' })

  await waitFor(() => expect(button).toBeEnabled())
  await userEvent.click(button)

  return screen.findByRole('dialog', { name: 'Invite an Owner' })
}

describe('[E2.15][E2.3] A01 shows each store\'s setup at a glance', () => {
  it('shows the four counts, the five columns and the setup bar of an onboarding store, and none for a live one', async () => {
    renderAdmin()

    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')
    const tiles = screen.getByLabelText('Stores at a glance')

    expect(['Stores', 'Waiting for the Owner', 'Setting up', 'Open for sale'].map(label => within(tiles).getByText(label))).toHaveLength(4)
    expect(tiles.querySelector('[data-tile=total]')).toHaveTextContent('6')
    expect(tiles.querySelector('[data-tile=waiting]')).toHaveTextContent('2')
    expect(tiles.querySelector('[data-tile=onboarding]')).toHaveTextContent('1')
    expect(tiles.querySelector('[data-tile=live]')).toHaveTextContent('1')
    expect(within(table()).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Store', 'Status', 'Invitation', 'Before opening', 'Created', 'Actions'])

    const bar = within(rowOf('Atelier am See')).getByRole('progressbar')

    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(within(rowOf('Atelier am See')).getByText('3 of 4 done')).toBeInTheDocument()
    expect(within(rowOf('Live Shop')).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(rowOf('Löwen Papeterie')).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(within(rowOf('Kapellbrücke')).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(rowOf('Kapellbrücke')).getByText('Not started')).toBeInTheDocument()
  })

  it('shows the Owner email under the store name and the invitation chip with its date', async () => {
    renderAdmin()

    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')
    expect(within(rowOf('Kapellbrücke')).getByText('marco@kapell.ch')).toBeInTheDocument()
    expect(within(rowOf('Kapellbrücke')).getByText('Sent')).toBeInTheDocument()
    expect(within(rowOf('Kapellbrücke')).getByText('Expires 04.11.2026')).toBeInTheDocument()
    expect(within(rowOf('Pilatus Bergkiosk')).getByText('Expired 22.10.2026')).toBeInTheDocument()
  })
})

describe('[E2.15][E2.3] the row menu', () => {
  it('resends a pending and an expired invitation, each with its own key, and asks the list again', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[3])) : Response.json(listed)
    const success = vi.spyOn(toast, 'success')

    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')

    await userEvent.click(within(await openMenu(rowOf('Kapellbrücke'), 'Kapellbrücke')).getByRole('menuitem', { name: 'Resend invitation' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    await userEvent.click(within(await openMenu(rowOf('Pilatus Bergkiosk'), 'Pilatus Bergkiosk')).getByRole('menuitem', { name: 'Resend invitation' }))
    await waitFor(() => expect(posts()).toHaveLength(2))

    const [first, second] = posts()

    expect(first.path).toBe(`/api/admin/stores/${id(4)}/owner-invitation/resend`)
    expect(second.path).toBe(`/api/admin/stores/${id(5)}/owner-invitation/resend`)
    expect(first.body).toEqual({ language: 'en' })
    expect(second.key).not.toBe(first.key)
    await waitFor(() => expect(success).toHaveBeenCalledWith('Invitation sent again to marco@kapell.ch. Only the newest link works.'))
    await waitFor(() => expect(calls.filter(call => call.method === 'GET' && call.path.startsWith('/api/admin/stores')).length).toBeGreaterThan(1))
  })

  it('resends in the language of the store, not of the screen', async () => {
    const german = adminStoreListSchema.parse({ items: [{ ...listed.items[3], defaultLanguage: 'de' }], nextCursor: null })

    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(german.items[0])) : Response.json(german)
    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Kapellbrücke')
    await userEvent.click(within(await openMenu(rowOf('Kapellbrücke'), 'Kapellbrücke')).getByRole('menuitem', { name: 'Resend invitation' }))

    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0].body).toEqual({ language: 'de' })
  })

  it('shows the new valid date once the list is read again', async () => {
    let resent = false

    answer = (call) => {
      if (call.method === 'POST') {
        resent = true

        return Response.json(adminStoreSchema.parse(listed.items[4]))
      }

      return resent
        ? Response.json(adminStoreListSchema.parse({ items: [{ ...listed.items[4], invitation: { email: 'info@pilatus.ch', state: 'open', expiresAt: '2026-11-05T10:00:00.000Z' } }], nextCursor: null }))
        : Response.json(listed)
    }
    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')
    await userEvent.click(within(await openMenu(rowOf('Pilatus Bergkiosk'), 'Pilatus Bergkiosk')).getByRole('menuitem', { name: 'Resend invitation' }))

    expect(await within(table()).findByText('Expires 05.11.2026')).toBeInTheDocument()
  })

  it('disables Resend for an accepted and a revoked invitation', async () => {
    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')

    for (const name of ['Live Shop', 'Revoked Shop']) {
      const menu = await openMenu(rowOf(name), name)

      expect(within(menu).getByRole('menuitem', { name: 'Resend invitation' })).toHaveAttribute('aria-disabled', 'true')
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    }
    expect(posts()).toHaveLength(0)
  })

  it('writes the Owner email to the clipboard and says so', async () => {
    const success = vi.spyOn(toast, 'success')

    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')
    await userEvent.click(within(await openMenu(rowOf('Atelier am See'), 'Atelier am See')).getByRole('menuitem', { name: 'Copy Owner email' }))

    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith('lena@atelier.ch'))
    await waitFor(() => expect(success).toHaveBeenCalledWith('Copied lena@atelier.ch'))
    expect(posts()).toHaveLength(0)
  })

  it('says so when the clipboard refuses', async () => {
    clipboard.writeText.mockRejectedValue(new Error('denied'))
    const danger = vi.spyOn(toast, 'danger')

    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Live Shop')
    await userEvent.click(within(await openMenu(rowOf('Atelier am See'), 'Atelier am See')).getByRole('menuitem', { name: 'Copy Owner email' }))

    await waitFor(() => expect(danger).toHaveBeenCalledWith('The email could not be copied. Select it and copy it by hand.'))
  })

  it('sends one resend for two presses in a row', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[3])) : Response.json(listed)
    renderAdmin()
    await screen.findByText('Kapellbrücke', { selector: 'h3' })
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const menu = await openMenu(cardOf('Kapellbrücke'), 'Kapellbrücke')
    const item = within(menu).getByRole('menuitem', { name: 'Resend invitation' })

    act(() => {
      fireEvent.click(item)
      fireEvent.click(item)
    })
    release()
    await waitFor(() => expect(posts()).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(posts()).toHaveLength(1)
  })
})

describe('[E2.15][E2.3] the invite sheet', () => {
  async function fill(name: string, email: string) {
    await userEvent.type(await screen.findByRole('textbox', { name: 'Store name' }), name)
    await userEvent.type(screen.getByRole('textbox', { name: 'Owner email' }), email)
  }

  it('says the invitation works for 7 days, and offers the language', async () => {
    answer = () => emptyList()
    renderAdmin()

    const dialog = await openInviteSheet()

    expect(within(dialog).getByText(/The Owner gets an invitation that works for 7 days/)).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: 'English' })).toBeChecked()
    expect(within(dialog).getByRole('radio', { name: 'Deutsch' })).toBeInTheDocument()
  })

  it('closes, lists the new store as onboarding with an invitation pending, and sends one invitation', async () => {
    let created = false
    const fresh = adminStoreSchema.parse({ ...base, id: id(7), slug: 'seebrise', name: 'Seebrise Café', status: 'invited', invitation: { email: 'anna@seebrise.ch', state: 'open', expiresAt: '2026-11-05T10:00:00.000Z' }, conditions: { 'store-information': 'met', 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' } })

    answer = (call) => {
      if (call.method === 'POST') {
        created = true

        return Response.json(fresh, { status: 201 })
      }

      return created ? Response.json(adminStoreListSchema.parse({ items: [fresh], nextCursor: null })) : emptyList()
    }
    renderAdmin()
    await openInviteSheet()
    await fill('Seebrise Café', 'anna@seebrise.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await within(await screen.findByRole('grid', { name: 'All stores' })).findByText('Seebrise Café')).toBeInTheDocument()
    expect(within(table()).getByText('Sent')).toBeInTheDocument()
    expect(posts()).toHaveLength(1)
    expect(posts()[0].body).toMatchObject({ name: 'Seebrise Café', ownerEmail: 'anna@seebrise.ch', language: 'en' })
  })

  it('shows the field error for a bad address and sends nothing', async () => {
    answer = () => emptyList()
    renderAdmin()
    await openInviteSheet()
    await fill('Seebrise Café', 'nobody')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(posts()).toHaveLength(0)
  })

  it('says in words that the name is taken (store-slug-taken) and keeps what was typed', async () => {
    answer = call => call.method === 'POST' ? problem(409, 'store-slug-taken') : emptyList()
    renderAdmin()
    await openInviteSheet()
    await fill('Seebrise Café', 'anna@seebrise.ch')
    await userEvent.click(screen.getByRole('button', { name: 'Create store and send invitation' }))

    expect(await screen.findByText('Another store has a name too close to this one. Change the name a little.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Owner email' })).toHaveValue('anna@seebrise.ch')
    expect(posts()).toHaveLength(1)
  })

  it('creates one store for a double tap on Send', async () => {
    answer = call => call.method === 'POST' ? Response.json(adminStoreSchema.parse(listed.items[3]), { status: 201 }) : emptyList()
    renderAdmin()
    await openInviteSheet()
    await fill('Seebrise Café', 'anna@seebrise.ch')
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    const send = screen.getByRole('button', { name: 'Create store and send invitation' })

    act(() => {
      fireEvent.click(send)
      fireEvent.click(send)
    })
    release()
    await waitFor(() => expect(posts()).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(posts()).toHaveLength(1)
  })
})

describe('[E2.15][E2.3] phones, empty and loading states', () => {
  it('shows the table loading rows and the card skeleton while the list loads, then one card per store with the same facts', async () => {
    renderAdmin()

    const grid = await screen.findByRole('grid', { name: 'All stores' })

    expect(grid).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('list', { name: 'All stores' })).not.toBeInTheDocument()
    const skeleton = document.querySelector('[data-skeleton=store-cards]') as HTMLElement

    expect(skeleton).toHaveClass('gap-3')
    expect(skeleton.querySelectorAll('li')).toHaveLength(3)
    expect(skeleton.querySelectorAll('li:first-child article > div')).toHaveLength(2)
    expect(skeleton.querySelectorAll('li:first-child article > div:last-child > *')).toHaveLength(3)
    expect(skeleton.querySelector('li:first-child .size-14')).toBeNull()
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toContain('Before opening')

    await within(grid).findByText('Live Shop')
    expect(grid).not.toHaveAttribute('aria-busy')
    expect(within(cards()).getAllByRole('listitem')).toHaveLength(6)

    const atelier = cardOf('Atelier am See')

    expect(within(atelier).getByText('Onboarding')).toBeInTheDocument()
    expect(within(atelier).getByText('Before opening')).toBeInTheDocument()
    expect(within(atelier).getByText('3 of 4 done')).toBeInTheDocument()
    expect(within(atelier).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(within(atelier).getByText(/lena@atelier\.ch/)).toBeInTheDocument()
    expect(within(cardOf('Live Shop')).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(cardOf('Kapellbrücke')).queryByText('Not started')).not.toBeInTheDocument()
    expect(within(cardOf('Live Shop')).queryByText('–')).not.toBeInTheDocument()
    expect(within(atelier).getByRole('button', { name: 'Actions for Atelier am See' })).toBeInTheDocument()
  })

  it('wraps a 120 character name and a 254 character address', async () => {
    const wide = adminStoreListSchema.parse({ items: [{ ...listed.items[3], name: longName, invitation: { email: longEmail, state: 'open', expiresAt: '2026-11-04T10:00:00.000Z' } }], nextCursor: null })

    answer = () => Response.json(wide)
    renderAdmin()
    await within(await screen.findByRole('grid', { name: 'All stores' })).findByText(longName)

    expect(within(table()).getByText(longName).className).toMatch(/overflow-wrap:anywhere|break-/)
    expect(within(table()).getByText(longEmail).className).toMatch(/break-all|overflow-wrap:anywhere/)
    expect(within(cards()).getByText(longName).className).toMatch(/overflow-wrap:anywhere|break-/)
    expect(within(cards()).getByText(new RegExp(longEmail.slice(0, 30)), { selector: 'p, span' }).className).toMatch(/break-all|overflow-wrap:anywhere|break-words/)
  })

  it('invites the first store from the empty state', async () => {
    answer = () => emptyList()
    renderAdmin()

    expect(await screen.findByText(/No store yet\. Invite the first Owner/)).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Invite an Owner' })

    expect(buttons).toHaveLength(2)
    await userEvent.click(buttons[1])
    expect(await screen.findByRole('dialog', { name: 'Invite an Owner' })).toBeInTheDocument()
  })
})

// The German tests load the lazy German chunk and run slower than the default wait under load.
const SLOW = { timeout: 8000 }

describe('[E2.15][AC09] A01 in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('shows the screen, the row menu and the sheet in German', async () => {
    renderAdmin()
    const grid = await screen.findByRole('grid', { name: 'Alle Shops' }, SLOW)

    await within(grid).findByText('Live Shop', undefined, SLOW)
    expect(within(grid).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Shop', 'Status', 'Einladung', 'Vor der Eröffnung', 'Erstellt', 'Aktionen'])
    expect(within(grid).getByText('3 von 4 erledigt')).toBeInTheDocument()
    expect(within(grid).getByText('1 von 4 erledigt')).toBeInTheDocument()
    expect(within(grid).getAllByText('Nicht begonnen')).toHaveLength(3)
    expect(within(screen.getByLabelText('Shops im Überblick')).getByText('In Einrichtung')).toBeInTheDocument()

    await userEvent.click(within(grid).getByRole('button', { name: 'Aktionen für Atelier am See' }))
    const menu = await screen.findByRole('menu', { name: 'Aktionen für Atelier am See' }, SLOW)

    expect(within(menu).getByRole('menuitem', { name: 'Einladung erneut senden' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'E-Mail des Inhabers kopieren' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

    const [invite] = screen.getAllByRole('button', { name: 'Inhaber einladen' })

    await userEvent.click(invite)
    const sheet = await screen.findByRole('dialog', { name: 'Inhaber einladen' }, SLOW)

    expect(within(sheet).getByText(/Der Shop wird sofort angelegt\. Der Inhaber erhält eine Einladung, die 7 Tage gilt/)).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Name des Shops')).toBeInTheDocument()
    expect(within(sheet).getByLabelText('E-Mail des Inhabers')).toBeInTheDocument()
    expect(within(sheet).getByRole('radiogroup', { name: 'Sprache des Shops und der Einladung' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Shop anlegen und Einladung senden' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument()
    for (const english of ['Store name', 'Owner email', 'Create store and send invitation', 'Cancel', 'Language of the store and the invitation'])
      expect(sheet).not.toHaveTextContent(english)
  }, 20_000)
})
