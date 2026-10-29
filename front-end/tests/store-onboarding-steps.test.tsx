import { meSchema, onboardingSchema, problemSchema, storeSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'
import { Route as StoreRoute } from '@/routes/store'

// The real screen, steps, sheet and /store layout, with the HTTP answered here. Bodies are parsed by the contract first.
vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, body: unknown }
type Key = 'store-information' | 'payment-account' | 'catalogue' | 'policies'
type State = 'met' | 'unmet' | 'pending'

const storeId = '0198a000-0000-7000-8000-000000000001'
const base = storeSchema.parse({ id: storeId, slug: 'chi-ngoc', name: 'Chi Ngoc', status: 'onboarding', defaultLanguage: 'en', createdAt: '2026-10-20T08:00:00.000Z' })

let store = base
let conditions: Array<{ key: Key, state: State }>
let mayOpenForSale: boolean
let meStatus: 'onboarding' | 'live'
let calls: Call[]
let handlers: Record<string, () => Response>
let demo: ReturnType<typeof startDemo>

function onlyInformation(): typeof conditions {
  return [
    { key: 'store-information', state: 'met' },
    { key: 'payment-account', state: 'pending' },
    { key: 'catalogue', state: 'pending' },
    { key: 'policies', state: 'pending' },
  ]
}
const allMet = (): typeof conditions => onlyInformation().map(condition => ({ ...condition, state: 'met' as const }))
const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

function answerFor(call: Call): Response {
  const handler = handlers[`${call.method} ${call.path}`]

  if (handler)
    return handler()
  if (call.path === '/api/me')
    return Response.json(meSchema.parse({ guestId: '0198a000-0000-7000-8000-0000000000f1', stores: [{ storeId, role: 'owner', status: meStatus }] }))
  if (call.path === '/api/auth/get-session')
    return Response.json({ session: { id: 's', userId: 'u', expiresAt: new Date(Date.now() + 1e7).toISOString() }, user: { id: 'u', email: 'o@example.ch', name: 'Mia' } })
  if (call.path === `/api/store/${storeId}/onboarding`)
    return Response.json(onboardingSchema.parse({ store, conditions, mayOpenForSale }))

  return Response.json({})
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  store = base
  conditions = onlyInformation()
  mayOpenForSale = false
  meStatus = 'onboarding'
  calls = []
  handlers = {}
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const call = { method: request.method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : undefined }

    calls.push(call)

    return answerFor(call)
  })
  demo = startDemo()
  await demo.ready
})

/** `/store/onboarding` is the real screen, and `/store` the real layout with a stand-in for Today. */
function renderOnboarding() {
  const root = createRootRoute({ component: Outlet, notFoundComponent: () => <p>No such page</p> })
  const layout = createRoute({ getParentRoute: () => root, path: '/store', component: StoreRoute.options.component })
  const today = createRoute({ getParentRoute: () => layout, path: '/', component: () => <p>Today</p> })
  const onboarding = createRoute({ getParentRoute: () => root, path: '/store/onboarding', component: OnboardingScreen })
  const router = createRouter({
    routeTree: root.addChildren([layout.addChildren([today]), onboarding]),
    history: createMemoryHistory({ initialEntries: ['/store/onboarding'] }),
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

const rail = async () => within(await screen.findByRole('navigation', { name: 'Steps' }))
const panel = () => within(document.querySelector<HTMLElement>('[data-condition]')!)
const stepTitle = () => screen.getByRole('heading', { level: 2 })
const patches = () => calls.filter(call => call.method === 'PATCH')
const posts = () => calls.filter(call => call.method === 'POST' && call.path.endsWith('/open-for-sale'))

async function pick(name: RegExp) {
  await userEvent.click((await rail()).getByRole('button', { name }))
}

async function openSheet() {
  await userEvent.click(await screen.findByRole('button', { name: 'Edit store information' }))

  return screen.findByRole('dialog', { name: 'Store information' })
}

function savePatch() {
  return {
    [`PATCH /api/store/${storeId}/information`]: () => {
      const body = calls.at(-1)?.body as { name: string, defaultLanguage: 'en' | 'de' }

      store = storeSchema.parse({ ...store, name: body.name, defaultLanguage: body.defaultLanguage })

      return Response.json(store)
    },
  }
}

describe('open your store, the steps [E2.16][E2.3]', () => {
  it('[AC-1] shows store information done with Edit, the other three not available yet, and no merchant menu', async () => {
    renderOnboarding()

    const steps = await rail()

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(stepTitle()).toHaveTextContent('Store information')
    expect(panel().getByText('Done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit store information' })).toBeInTheDocument()
    expect(steps.getAllByText('Not available yet')).toHaveLength(3)
    for (const name of [/^Payment account/, /^A product or a tour/, /^Policies/]) {
      await pick(name)
      expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument()
      expect(panel().getByText('Not available yet')).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: 'Today' })).not.toBeInTheDocument()
  })

  it('[AC-2] saves a new name and language, closes the sheet and shows the new name on the step', async () => {
    handlers = savePatch()
    renderOnboarding()

    const sheet = await openSheet()
    const name = within(sheet).getByRole('textbox', { name: 'Store name' })

    await userEvent.clear(name)
    await userEvent.type(name, 'Chi Ngoc Shop')
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Deutsch' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Store information' })).not.toBeInTheDocument())
    expect(patches()[0].body).toEqual({ name: 'Chi Ngoc Shop', defaultLanguage: 'de' })
    expect((await screen.findAllByText('Chi Ngoc Shop')).length).toBeGreaterThan(0)
  })

  it('[AC-2] an empty name shows its error and saves nothing', async () => {
    renderOnboarding()

    const sheet = await openSheet()

    await userEvent.clear(within(sheet).getByRole('textbox', { name: 'Store name' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    expect(await within(sheet).findByText('Enter a store name.')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: 'Store information' })).toBeInTheDocument()
  })

  it('[AC-2] a form made stale by a change elsewhere keeps the Owner\'s edit and saves it', async () => {
    handlers = savePatch()
    renderOnboarding()

    const sheet = await openSheet()
    const name = within(sheet).getByRole('textbox', { name: 'Store name' })

    await userEvent.type(name, ' Shop')
    store = storeSchema.parse({ ...store, name: 'Changed Elsewhere' })
    await act(() => demo.queryClient.invalidateQueries({ queryKey: ['stores'] }))

    await waitFor(() => expect(screen.getAllByText('Changed Elsewhere').length).toBeGreaterThan(0))
    expect(name).toHaveValue('Chi Ngoc Shop')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0].body).toEqual({ name: 'Chi Ngoc Shop', defaultLanguage: 'en' })
  })

  it('[AC-3] skipping moves on, leaves the step not met, and the step opens again', async () => {
    renderOnboarding()

    await pick(/^Payment account/)
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }))

    expect(stepTitle()).toHaveTextContent('A product or a tour')
    const steps = await rail()

    expect(within(steps.getByText('Payment account').closest('li')!).getByText('Not available yet')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(stepTitle()).toHaveTextContent('Payment account')
    expect(panel().getByText('Not available yet')).toBeInTheDocument()
    expect(calls.filter(call => call.method !== 'GET')).toEqual([])
  })

  it('[AC-3] Continue, not Skip, moves on from a step that is done', async () => {
    renderOnboarding()

    await rail()
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(stepTitle()).toHaveTextContent('Payment account')
  })
})

describe('open your store, the last step [E2.16][E2.3]', () => {
  it('[AC-4] lists the three conditions that block opening and keeps Open disabled, with the reason', async () => {
    renderOnboarding()

    await pick(/^Open for sale/)
    const list = screen.getByRole('list', { name: 'Still blocking opening' })

    expect(within(list).getAllByRole('listitem').map(item => item.getAttribute('data-blocker'))).toEqual(['payment-account', 'catalogue', 'policies'])
    const button = screen.getByRole('button', { name: 'Open Chi Ngoc for sale' })

    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Opening unlocks when these are done: Payment account, A product or a tour, Policies.')
    expect(posts()).toHaveLength(0)
  })

  it('[AC-4] with every condition met the list is empty, the button is on, and a double tap opens once', async () => {
    conditions = allMet()
    mayOpenForSale = true
    handlers = { [`POST /api/store/${storeId}/open-for-sale`]: () => Response.json(storeSchema.parse({ ...store, status: 'live' })) }
    renderOnboarding()

    expect(await screen.findByRole('heading', { level: 2, name: 'Open for sale' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Still blocking opening' })).not.toBeInTheDocument()
    expect(screen.getByText('Every step is done. You can open Chi Ngoc for sale.')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Open Chi Ngoc for sale' })

    expect(button).toBeEnabled()
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await waitFor(() => expect(posts()).toHaveLength(1))
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(posts()).toHaveLength(1)
  })

  it('[AC-4] a refused open says which conditions are unmet in words and the store stays onboarding', async () => {
    mayOpenForSale = true
    handlers = { [`POST /api/store/${storeId}/open-for-sale`]: () => problem(409, 'onboarding-incomplete') }
    renderOnboarding()

    await pick(/^Open for sale/)
    await userEvent.click(screen.getByRole('button', { name: 'Open Chi Ngoc for sale' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The store cannot open yet. Still open: Payment account, A product or a tour, Policies.')
    expect(screen.queryByRole('heading', { name: 'Chi Ngoc is open for sale' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Chi Ngoc for sale' })).toBeInTheDocument()
  })

  it('[AC-4] a refusal that has a reason of its own is shown in words', async () => {
    mayOpenForSale = true
    handlers = { [`POST /api/store/${storeId}/open-for-sale`]: () => problem(403, 'forbidden') }
    renderOnboarding()

    await pick(/^Open for sale/)
    await userEvent.click(screen.getByRole('button', { name: 'Open Chi Ngoc for sale' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only the Owner can open the store for sale.')
  })

  it('[AC-5] after opening, Go to your dashboard opens Today with the merchant menu', async () => {
    conditions = allMet()
    mayOpenForSale = true
    handlers = {
      [`POST /api/store/${storeId}/open-for-sale`]: () => {
        store = storeSchema.parse({ ...store, status: 'live' })
        meStatus = 'live'

        return Response.json(store)
      },
    }
    const router = renderOnboarding()

    await userEvent.click(await screen.findByRole('button', { name: 'Open Chi Ngoc for sale' }))
    expect(await screen.findByRole('heading', { name: 'Chi Ngoc is open for sale' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store/onboarding')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to your dashboard' }))

    expect(await screen.findByText('Today', { selector: 'p' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/store')
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })
})

describe('open your store in German [E2.16][E2.3]', () => {
  beforeEach(async () => {
    await loadDictionary('de')
    localStorage.setItem('sk.language', JSON.stringify('de'))
  })

  it('[AC-7] shows the steps, the sheet, the blockers and a refusal in German, with no key name', async () => {
    mayOpenForSale = true
    handlers = { [`POST /api/store/${storeId}/open-for-sale`]: () => problem(409, 'onboarding-incomplete') }
    renderOnboarding()

    const steps = await screen.findByRole('navigation', { name: 'Schritte' })

    expect(within(steps).getAllByText('Noch nicht verfügbar')).toHaveLength(3)
    await userEvent.click(within(steps).getByRole('button', { name: /^Shop-Angaben/ }))
    expect(screen.getByRole('button', { name: 'Shop-Angaben bearbeiten' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Shop-Angaben bearbeiten' }))
    const sheet = await screen.findByRole('dialog', { name: 'Shop-Angaben' })

    expect(within(sheet).getByRole('textbox', { name: 'Name des Shops' })).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.click(within(steps).getByRole('button', { name: /^Zahlungskonto/ }))
    expect(screen.getByRole('button', { name: 'Vorerst überspringen' })).toBeInTheDocument()
    await userEvent.click(within(steps).getByRole('button', { name: /^Verkaufsstart/ }))
    expect(screen.getByRole('list', { name: 'Das hält die Eröffnung noch auf' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chi Ngoc in den Verkauf bringen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Der Shop kann noch nicht öffnen. Noch offen: Zahlungskonto, Ein Produkt oder eine Tour, Richtlinien.')
    expect(document.body.textContent).not.toMatch(/\bstores\.[a-z]/)
  })

  it('[AC-7] says that the store is open in German', async () => {
    store = storeSchema.parse({ ...store, status: 'live' })
    conditions = allMet()
    renderOnboarding()

    expect(await screen.findByRole('heading', { name: 'Chi Ngoc ist im Verkauf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zum Dashboard' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bstores\.[a-z]/)
  })
})
