import { merchantCategoryListSchema, merchantCategorySchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { CategoriesScreen } from '@/features/categories/components/categories-screen'
import { DataClientProvider } from '@/features/data-client'
import { startDemo } from '@/features/demo/data-client'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const walks = '0198a000-0000-7000-8000-0000000000c1'
const food = '0198a000-0000-7000-8000-0000000000c2'
const hill = '0198a000-0000-7000-8000-0000000000c3'

let calls: Call[]
let lists: { map: unknown[], blog: unknown[] }
let answer: ((call: Call) => Response | undefined) | undefined
let demo: ReturnType<typeof startDemo>

function category(id: string, over: Record<string, unknown> = {}) {
  return merchantCategorySchema.parse({ id, slug: id, name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 0, useCount: 0, ...over })
}

const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  lists = { map: [], blog: [] }
  answer = undefined
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), body: text ? JSON.parse(text) : undefined }

    calls.push(call)
    const custom = answer?.(call)

    if (custom)
      return custom
    if (call.path === '/api/me')
      return Response.json({ guestId: storeId, stores: [{ storeId, role: 'owner', status: 'live' }] })
    const kind = call.path.endsWith('/blog') ? 'blog' : 'map'

    if (call.method === 'GET' && call.path.includes('/categories/'))
      return Response.json(merchantCategoryListSchema.parse({ items: lists[kind] }))
    if (call.method === 'POST')
      return Response.json(category(food), { status: 201 })

    return Response.json(merchantCategoryListSchema.parse({ items: lists[kind] }))
  })
  demo = startDemo()
  await demo.ready
})

function renderScreen() {
  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <CategoriesScreen />
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const writes = (method: string) => calls.filter(call => call.method === method)

describe('[E4.18][AC87] the category editor in German', () => {
  beforeEach(async () => {
    await loadDictionary('de')
    localStorage.setItem('sk.language', JSON.stringify('de'))
  })

  it('shows the German tabs and an empty state per tab, and no key is missing', async () => {
    renderScreen()

    expect(await screen.findByRole('tab', { name: 'Kartenkategorien' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Blogkategorien' })).toBeInTheDocument()
    expect(await screen.findByText('Noch keine Kartenkategorien. Fügen Sie die erste hinzu.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Blogkategorien' }))
    expect(await screen.findByText('Noch keine Blogkategorien. Fügen Sie die erste hinzu.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })

  it('shows the German reason when the API refuses a delete with 409 category-in-use', async () => {
    lists.map = [category(walks, { useCount: 2 })]
    answer = call => call.method === 'DELETE' ? problem(409, 'category-in-use') : undefined
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Wanderungen löschen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Kategorie löschen' }))

    expect(await screen.findByText('Diese Kategorie wird noch von Pins oder Geschichtengruppen verwendet. Entfernen Sie dort zuerst die Zuordnung.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })
})

describe('[E4.18][AC87] the category editor in English', () => {
  it('creates a category from the sheet and sends one request on a double tap', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Add category' }))
    await userEvent.type(await screen.findByLabelText('English name'), '  Hiking  ')
    const submit = screen.getByRole('button', { name: 'Add' })

    act(() => {
      fireEvent.click(submit)
      fireEvent.click(submit)
    })

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0].path).toBe(`/api/store/${storeId}/categories/map`)
    expect(writes('POST')[0].body).toEqual({ name: { en: 'Hiking' } })
    expect(writes('POST')[0].key).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('refuses a category with no name in either language and sends nothing', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Add category' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Give a name in at least one language.')).toBeInTheDocument()
    expect(writes('POST')).toHaveLength(0)
  })

  it('moves a category down among its siblings by sending the full sibling id list', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    renderScreen()

    expect(await screen.findByRole('button', { name: 'Move Walks up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Food down' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move Walks down' }))

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].path).toBe(`/api/store/${storeId}/categories/map/order`)
    expect(writes('PUT')[0].body).toEqual({ parentId: null, ids: [food, walks] })
  })

  it('moves a sub-category only among its own siblings', async () => {
    lists.map = [
      category(walks, { position: 1, childCount: 2 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, parentId: walks, position: 2 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Move Hill down' }))

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].body).toEqual({ parentId: walks, ids: [food, hill] })
  })

  it('nests a category under a top-level one through the sheet, and offers no parent to a category that has sub-categories', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1, childCount: 0 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Food' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: /Parent category/ }))
    const options = await screen.findAllByRole('option')

    expect(options.map(option => option.textContent)).toEqual(expect.arrayContaining(['None (top level)', 'Walks']))
    expect(options.map(option => option.textContent)).not.toContain('Food')
    await userEvent.click(screen.getByRole('option', { name: 'Walks' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes('PATCH')).toHaveLength(1))
    expect(writes('PATCH')[0].path).toBe(`/api/store/${storeId}/categories/map/${food}`)
    expect(writes('PATCH')[0].body).toEqual({ name: { en: 'Food', de: 'Essen' }, parentId: walks })
  })

  it('hides the parent field for a category that has sub-categories', async () => {
    lists.map = [
      category(walks, { position: 1, childCount: 1 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Walks' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByRole('button', { name: /Parent category/ })).not.toBeInTheDocument()
    expect(within(dialog).getByText('This category has sub-categories, so it stays at the top level.')).toBeInTheDocument()
  })

  it('names the missing language on a row and falls back to the other one', async () => {
    lists.map = [category(walks, { name: { en: null, de: 'Wanderungen' } })]
    renderScreen()

    expect(await screen.findByText('Wanderungen')).toBeInTheDocument()
    expect(screen.getByText('No English name')).toBeInTheDocument()
  })
})
