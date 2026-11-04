import { merchantCategoryListSchema, merchantCategorySchema, problemSchema } from '@sk/api-contract'
import { categoryIconGroups } from '@sk/domain/content'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'

import { CategoriesScreen } from '@/features/categories/components/categories-screen'
import { categoryIconGroupLabelKey, categoryIconKeys, iconLabelKey } from '@/features/categories/lib/category-icons'
import { DataClientProvider } from '@/features/data-client'
import { startDemo } from '@/features/demo/data-client'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { expectListChrome } from './list-screens-helper'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view would render; the table is under test here.
const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

interface Call { method: string, path: string, key: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const walks = '0198a000-0000-7000-8000-0000000000c1'
const food = '0198a000-0000-7000-8000-0000000000c2'
const hill = '0198a000-0000-7000-8000-0000000000c3'
const lake = '0198a000-0000-7000-8000-0000000000c4'
const museums = '0198a000-0000-7000-8000-0000000000c5'
const pond = '0198a000-0000-7000-8000-0000000000c6'

let calls: Call[]
let lists: { map: unknown[], blog: unknown[] }
let hold: Promise<void> | undefined
let answer: ((call: Call) => Response | undefined) | undefined
let demo: ReturnType<typeof startDemo>

function category(id: string, over: Record<string, unknown> = {}) {
  return merchantCategorySchema.parse({ id, slug: id, name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, icon: null, showOnHome: false, position: 1, childCount: 0, useCount: 0, ...over })
}

const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

beforeEach(async () => {
  window.scrollTo = vi.fn()
  // jsdom has no pointer capture; the handle's press (use-stop-drag) calls it.
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  // Sheets open as a dialog on desktop in the merchant area.
  window.history.pushState({}, '', '/store/content/categories')
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  lists = { map: [], blog: [] }
  answer = undefined
  hold = undefined
  view.wide = true
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
    if (call.method === 'PUT') {
      // The server keeps the order it was sent, as the real API does.
      await hold
      const { parentId, ids } = call.body as { parentId: string | null, ids: string[] }
      const items = lists[kind] as Array<{ id: string, parentId: string | null }>
      const sent = ids.map(id => items.find(item => item.id === id)!)
      let next = 0

      lists[kind] = items.map(item => (item.parentId === parentId ? sent[next++] : item))

      return Response.json(merchantCategoryListSchema.parse({ items: lists[kind] }))
    }

    return Response.json(merchantCategoryListSchema.parse({ items: lists[kind] }))
  })
  demo = startDemo()
  await demo.ready
})

afterEach(() => window.history.pushState({}, '', '/'))

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

const rowOf = (name: string) => screen.getByText(name, { selector: 'span' }).closest('tr')!
const order = () => Array.from(document.querySelectorAll('[data-grip]'), handle => handle.getAttribute('data-grip'))
const mapUrl = `/api/store/${storeId}/categories/map`
const reads = () => calls.filter(call => call.method === 'GET' && call.path === mapUrl)

async function openMenu(name: string, item: string, actionsLabel = 'Actions for') {
  await userEvent.click(await screen.findByRole('button', { name: `${actionsLabel} ${name}` }))
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

describe('[E4.18][AC87] the category editor in German', () => {
  beforeEach(async () => {
    await loadDictionary('de')
    localStorage.setItem('sk.language', JSON.stringify('de'))
  })

  it('shows the German tabs, header and an empty state per tab, and no key is missing', async () => {
    renderScreen()

    expect(await screen.findByRole('tab', { name: 'Kartenkategorien' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Blogkategorien' })).toBeInTheDocument()
    expect(await screen.findByText('Noch keine Kartenkategorien. Fügen Sie die erste hinzu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeEnabled()
    await userEvent.click(screen.getByRole('tab', { name: 'Blogkategorien' }))
    expect(await screen.findByText('Noch keine Blogkategorien. Fügen Sie die erste hinzu.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })

  it('shows the German columns, the Missing chip, the drag labels and the in-use delete label', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, useCount: 2 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    // The headers are drawn while the list loads, so wait for the rows first.
    expect(await screen.findByText('Walks', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Deutscher Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Verwendet von' })).toBeInTheDocument()
    expect(within(rowOf('Walks')).getByText('Fehlt')).toBeInTheDocument()
    expect(within(rowOf('Food')).getByText('Essen')).toBeInTheDocument()
    expect(within(rowOf('Food')).getByText('Nicht verwendet')).toBeInTheDocument()
    expect(within(rowOf('Walks')).getByText('2 Pins')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Walks ziehen, um die Reihenfolge zu ändern' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Kategorien durchsuchen' })).toBeInTheDocument()
    await openMenu('Walks', 'Löschen (in Verwendung)', 'Aktionen für')
    expect(await screen.findByText('„Walks“ lässt sich noch nicht löschen')).toBeInTheDocument()
    expect(screen.getByText('2 Pins verwenden sie. Entfernen Sie sie zuerst von diesen Pins unter „Orte“.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })

  it('opens the German sheet and sends the German name', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Hinzufügen' }))
    expect(await screen.findByText('Neue Kategorie')).toBeInTheDocument()
    await userEvent.type(await screen.findByLabelText('Deutscher Name'), 'Wandern')
    await userEvent.click(screen.getByRole('button', { name: 'Kategorie hinzufügen' }))

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0].body).toEqual({ name: { de: 'Wandern' } })
  })

  it('shows the German reason when the API refuses a delete with 409 category-in-use', async () => {
    lists.map = [category(walks)]
    answer = call => call.method === 'DELETE' ? problem(409, 'category-in-use') : undefined
    renderScreen()

    await openMenu('Walks', 'Löschen', 'Aktionen für')
    await userEvent.click(await screen.findByRole('button', { name: 'Kategorie löschen' }))

    expect(await screen.findByText('Diese Kategorie wird noch von Pins oder Geschichten verwendet. Entfernen Sie dort zuerst die Zuordnung.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })

  it('[E4.13][AC95] the German picker names every icon and group in German', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Hinzufügen' }))
    const dialog = await screen.findByRole('dialog')
    const groups = within(dialog).getAllByRole('radiogroup')

    expect(within(dialog).getByRole('radio', { name: 'Keines' })).toBeChecked()
    categoryIconGroups.forEach((group, index) => {
      expect(groups[index + 1]).toHaveAccessibleName(de[categoryIconGroupLabelKey(group.key)])
      within(groups[index + 1]).getAllByRole('radio').forEach((radio, i) => expect(radio).toHaveAccessibleName(de[iconLabelKey(group.icons[i])]))
    })
    expect(within(dialog).getByRole('radio', { name: 'Trinkwasser' })).toBeInTheDocument()
  })
})

describe('[E4.18][AC87] the category editor in English', () => {
  it('lists parents with their sub-categories in guest order, the Missing chip and the Used by column', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1, childCount: 1, useCount: 1 }),
      category(hill, { name: { en: 'Hill', de: 'Hügel' }, parentId: walks, position: 1 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    await screen.findByText('Walks')
    expect(order()).toEqual([walks, hill, food])
    expect(within(rowOf('Walks')).getByText('Missing')).toBeInTheDocument()
    expect(within(rowOf('Hill')).queryByText('Missing')).not.toBeInTheDocument()
    expect(within(rowOf('Hill')).getByText('Hügel')).toBeInTheDocument()
    expect(within(rowOf('Walks')).getByText('1 pin')).toBeInTheDocument()
    expect(within(rowOf('Walks')).queryByText(/sub-categor/)).toBeNull()
    expect(within(rowOf('Food')).getByText('Not used')).toBeInTheDocument()
  })

  it('keeps the search box beside the tabs, disabled while the list loads', () => {
    renderScreen()
    const search = screen.getByRole('searchbox', { name: 'Search categories' })

    expect(search).toBeDisabled()
    expect(search.closest('[data-testid="list-toolbar"]')).toContainElement(screen.getByRole('tablist'))
  })

  it('starts the other tab with an empty search box', async () => {
    lists.map = [category(walks)]
    renderScreen()
    await screen.findByText('Walks')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'walk')
    expect(screen.getByRole('searchbox', { name: 'Search categories' })).toHaveValue('walk')

    await userEvent.click(screen.getByRole('tab', { name: 'Blog categories' }))
    expect(screen.getByRole('searchbox', { name: 'Search categories' })).toHaveValue('')
  })

  it('searches in English and in German, hides the handles while searching and brings them back', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: 'Wanderungen' }, position: 1 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()
    await screen.findByText('Walks')
    expect(screen.getAllByRole('button', { name: /^Drag to reorder/ })).toHaveLength(2)
    const search = screen.getByRole('searchbox', { name: 'Search categories' })

    await userEvent.type(search, 'essen')
    expect(screen.queryByText('Walks')).not.toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Drag to reorder/ })).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'walk')
    expect(screen.queryByText('Food')).not.toBeInTheDocument()
    expect(screen.getByText('Walks')).toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    expect(screen.getByText('No category is called “zzz”.')).toBeInTheDocument()

    await userEvent.clear(search)
    expect(screen.getAllByRole('button', { name: /^Drag to reorder/ })).toHaveLength(2)
  })

  it('creates a category from the sheet and sends one request on a double tap', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Add' }))
    await userEvent.type(await screen.findByLabelText('English name'), '  Hiking  ')
    const submit = screen.getByRole('button', { name: 'Add category' })

    act(() => {
      fireEvent.click(submit)
      fireEvent.click(submit)
    })

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0].path).toBe(mapUrl)
    expect(writes('POST')[0].body).toEqual({ name: { en: 'Hiking' } })
    expect(writes('POST')[0].key).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('refuses a category with no name in either language and sends nothing', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Add' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Add category' }))

    expect(await screen.findByText('Give a name in at least one language.')).toBeInTheDocument()
    expect(writes('POST')).toHaveLength(0)
  })

  it('edits a category: the sheet is prefilled and saves a PATCH with the new name', async () => {
    lists.map = [category(food, { name: { en: 'Food', de: 'Essen' } })]
    renderScreen()

    await openMenu('Food', 'Edit')
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('Edit “Food”')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('English name')).toHaveValue('Food')
    await userEvent.clear(within(dialog).getByLabelText('English name'))
    await userEvent.type(within(dialog).getByLabelText('English name'), 'Dining')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes('PATCH')).toHaveLength(1))
    expect(writes('PATCH')[0].path).toBe(`${mapUrl}/${food}`)
    expect(writes('PATCH')[0].body).toEqual({ name: { en: 'Dining', de: 'Essen' } })
  })

  it('[E4.13][AC95] shows the icon before the name and "On the home" as quiet text on a map category; a category without an icon shows none; the blog tab shows neither', async () => {
    lists.map = [
      category(walks, { name: { en: 'Free essentials', de: null } }),
      category(hill, { name: { en: 'Toilets', de: 'Toiletten' }, icon: 'toilet', showOnHome: true }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    await screen.findByText('Toilets')
    const toilets = rowOf('Toilets')

    expect(within(toilets).getByText('On the home')).toHaveClass('text-muted')
    expect(toilets.querySelector('svg.text-muted')).not.toBeNull()
    expect(within(rowOf('Food')).queryByText('On the home')).toBeNull()
    expect(rowOf('Food').querySelector('svg.text-muted')).toBeNull()
    expect(rowOf('Free essentials').querySelector('svg.text-muted')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Home' })).toBeNull()
  })

  it('[E4.13][AC95] the sheet shows None first, then every icon of the shared list once in its labelled group', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' } })]
    renderScreen()

    await openMenu('Toilets', 'Edit')
    const dialog = await screen.findByRole('dialog')
    const none = within(dialog).getByRole('radio', { name: 'None' })

    expect(none).toBeChecked()
    const groups = within(dialog).getAllByRole('radiogroup')
    const all = within(dialog).getAllByRole('radio')

    expect(groups).toHaveLength(categoryIconGroups.length + 1)
    expect(all[0]).toBe(none)
    expect(all).toHaveLength(categoryIconKeys.length + 1)
    expect(new Set(all.map(radio => (radio as HTMLInputElement).value)).size).toBe(all.length)
    categoryIconGroups.forEach((group, index) => {
      const radios = within(groups[index + 1]).getAllByRole('radio')

      expect(groups[index + 1]).toHaveAccessibleName(en[categoryIconGroupLabelKey(group.key)])
      expect(radios.map(radio => (radio as HTMLInputElement).value)).toEqual([...group.icons])
      radios.forEach((radio, i) => expect(radio).toHaveAccessibleName(en[iconLabelKey(group.icons[i])]))
    })
    expect(within(dialog).getByRole('switch', { name: /Show on the home/ })).not.toBeChecked()
  }, 20_000)

  it('[E4.13][AC95] choosing an icon saves it with the changed switch, and the table shows it before the name', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' } })]
    renderScreen()

    await openMenu('Toilets', 'Edit')
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByLabelText('Drinking water'))
    expect(within(dialog).getByLabelText('Drinking water')).toBeChecked()
    expect(within(dialog).getByLabelText('None')).not.toBeChecked()
    await userEvent.click(within(dialog).getByRole('switch', { name: /Show on the home/ }))
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' }, icon: 'water', showOnHome: true })]
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes('PATCH')).toHaveLength(1))
    expect(writes('PATCH')[0].body).toEqual({ name: { en: 'Toilets', de: 'Toiletten' }, icon: 'water', showOnHome: true })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(rowOf('Toilets').querySelector('svg.text-muted')).not.toBeNull())
  }, 20_000)

  it('[E4.13][AC95] a saved icon is checked in the sheet again, None clears it with null, and a new category sends its icon', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' }, icon: 'toilet', showOnHome: true })]
    renderScreen()

    await openMenu('Toilets', 'Edit')
    let dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByLabelText('Toilets')).toBeChecked()
    await userEvent.click(within(dialog).getByLabelText('None'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(writes('PATCH')).toHaveLength(1))
    expect(writes('PATCH')[0].body).toEqual({ name: { en: 'Toilets', de: 'Toiletten' }, icon: null })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('English name'), 'Bakeries')
    await userEvent.click(within(dialog).getByLabelText('Café'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add category' }))
    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0].body).toEqual({ name: { en: 'Bakeries' }, icon: 'cafe' })
  }, 20_000)

  it('[E4.13][AC95] arrow keys move within a group and Tab leaves it for the next group', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' } })]
    renderScreen()

    await openMenu('Toilets', 'Edit')
    const dialog = await screen.findByRole('dialog')
    const [first, second] = categoryIconGroups[0].icons

    await userEvent.click(within(dialog).getByLabelText(en[iconLabelKey(first)]))
    await userEvent.keyboard('{ArrowRight}')
    expect(within(dialog).getByLabelText(en[iconLabelKey(second)])).toBeChecked()
    await userEvent.keyboard('{ArrowLeft}')
    expect(within(dialog).getByLabelText(en[iconLabelKey(first)])).toBeChecked()
    await userEvent.tab()
    const next = categoryIconGroups[1].icons[0]

    expect(within(dialog).getByLabelText(en[iconLabelKey(next)])).toHaveFocus()
  }, 20_000)

  it('[E4.13][AC95] a failed save keeps the sheet open with the chosen icon and says why', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' } })]
    answer = call => call.method === 'PATCH' ? problem(500, 'internal') : undefined
    renderScreen()

    await openMenu('Toilets', 'Edit')
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByLabelText('Drinking water'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Drinking water')).toBeChecked()
  }, 20_000)

  it('[E4.13][AC95] a touch target and a wrapping grid: each icon choice is at least 44 px and the grid wraps', async () => {
    lists.map = [category(food, { name: { en: 'Toilets', de: 'Toiletten' } })]
    renderScreen()

    await openMenu('Toilets', 'Edit')
    const dialog = await screen.findByRole('dialog')
    const radio = within(dialog).getByRole('radio', { name: 'Drinking water' })

    expect(radio.closest('[data-slot="radio"]')).toHaveClass('size-11')
    expect(radio.closest('[data-slot="radio"]')!.parentElement).toHaveClass('flex-wrap')
  })

  it('[E4.13][AC95] the blog sheet has no icon picker and no home switch', async () => {
    lists.blog = [category(walks, { name: { en: 'Tips', de: 'Tipps' } })]
    renderScreen()

    await userEvent.click(screen.getByRole('tab', { name: 'Blog categories' }))
    await openMenu('Tips', 'Edit')
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByRole('radiogroup')).toBeNull()
    expect(within(dialog).queryByRole('switch')).toBeNull()
  })

  it('adds a sub-category with its parent preselected', async () => {
    lists.map = [category(walks, { name: { en: 'Walks', de: null } })]
    renderScreen()

    await openMenu('Walks', 'Add sub-category')
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('New sub-category')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('English name'), 'Hill')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add category' }))

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0].body).toEqual({ name: { en: 'Hill' }, parentId: walks })
  })

  it('offers no parent to a category that has sub-categories', async () => {
    lists.map = [
      category(walks, { position: 1, childCount: 1 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
    ]
    renderScreen()

    await openMenu('Walks', 'Edit')
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByRole('button', { name: /Sits under/ })).not.toBeInTheDocument()
    expect(within(dialog).getByText('This category has sub-categories, so it stays at the top level.')).toBeInTheDocument()
  })

  it('asks before deleting an unused category, sends nothing on cancel and one DELETE on confirm', async () => {
    lists.map = [category(food, { name: { en: 'Food', de: null } })]
    renderScreen()

    await openMenu('Food', 'Delete')
    expect(await screen.findByText('Delete "Food"?')).toBeInTheDocument()
    expect(writes('DELETE')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Delete "Food"?')).not.toBeInTheDocument())
    expect(writes('DELETE')).toHaveLength(0)

    await openMenu('Food', 'Delete')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete category' }))

    await waitFor(() => expect(writes('DELETE')).toHaveLength(1))
    expect(writes('DELETE')[0].path).toBe(`${mapUrl}/${food}`)
    expect(writes('DELETE')[0].key).toBeTruthy()
  })

  it('explains a delete that is refused for a category in use, and sends nothing', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, childCount: 1, useCount: 2 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks }),
    ]
    renderScreen()

    await openMenu('Walks', 'Delete (in use)')

    expect(await screen.findByText('Can’t delete “Walks” yet')).toBeInTheDocument()
    expect(screen.getByText('It has 1 sub-category (Hill). Delete or move it first.')).toBeInTheDocument()
    expect(screen.getByText('2 pins use it. Remove it from those pins in Places first.')).toBeInTheDocument()
    expect(screen.queryByText('Delete "Walks"?')).not.toBeInTheDocument()
    expect(writes('DELETE')).toHaveLength(0)
  })

  it('moves down and up through the menu, sending the full sibling order with an Idempotency-Key', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
      category(lake, { name: { en: 'Lake', de: null }, position: 3 }),
    ]
    renderScreen()

    await openMenu('Walks', 'Move down')
    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].path).toBe(`${mapUrl}/order`)
    expect(writes('PUT')[0].body).toEqual({ parentId: null, ids: [food, walks, lake] })
    expect(writes('PUT')[0].key).toBeTruthy()
    await waitFor(() => expect(order()).toEqual([food, walks, lake]))

    await openMenu('Lake', 'Move up')
    await waitFor(() => expect(writes('PUT')).toHaveLength(2))
    expect(writes('PUT')[1].body).toEqual({ parentId: null, ids: [food, lake, walks] })
    expect(writes('PUT')[1].key).toBeTruthy()
    expect(writes('PUT')[1].key).not.toBe(writes('PUT')[0].key)
  })

  it('moves a parent among the parents only: its sub-categories are not in the request and keep their parent', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1, childCount: 1 }),
      category(museums, { name: { en: 'Museums', de: null }, position: 2, childCount: 1 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
      category(pond, { name: { en: 'Pond', de: null }, parentId: museums, position: 1 }),
    ]
    renderScreen()

    await openMenu('Walks', 'Move down')

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].body).toEqual({ parentId: null, ids: [museums, walks] })
    await waitFor(() => expect(order()).toEqual([museums, pond, walks, hill]))
  })

  it('does not start a delete while a reorder runs', async () => {
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    renderScreen()

    await openMenu('Walks', 'Move down')
    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Food' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')

    release()
    await waitFor(() => expect(order()).toEqual([food, walks]))
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Food' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(writes('DELETE')).toHaveLength(0)
  })

  it('disables Move up on the first and Move down on the last sibling', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Walks' }))
    expect(await screen.findByRole('menuitem', { name: 'Move up' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Move down' })).not.toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Move up' })).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Food' }))
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Move up' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('moves the last parent up on ArrowUp, sending the full order with a key', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
      category(lake, { name: { en: 'Lake', de: null }, position: 3 }),
    ]
    renderScreen()
    const handle = await screen.findByRole('button', { name: 'Drag to reorder Lake' })

    await userEvent.click(handle)
    await userEvent.keyboard('{ArrowUp}')

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].body).toEqual({ parentId: null, ids: [walks, lake, food] })
    expect(writes('PUT')[0].key).toBeTruthy()
    await waitFor(() => expect(order()).toEqual([walks, lake, food]))
  })

  it('moves the last sub-category up on ArrowUp, with its parent and only its siblings', async () => {
    lists.map = [
      category(walks, { position: 1, childCount: 2 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
      category(lake, { name: { en: 'Lake', de: null }, parentId: walks, position: 2 }),
      category(museums, { name: { en: 'Museums', de: null }, position: 2, childCount: 1 }),
      category(pond, { name: { en: 'Pond', de: null }, parentId: museums, position: 1 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Drag to reorder Lake' }))
    await userEvent.keyboard('{ArrowUp}')

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].body).toEqual({ parentId: walks, ids: [lake, hill] })
    expect(writes('PUT')[0].key).toBeTruthy()
    await waitFor(() => expect(order()).toEqual([walks, lake, hill, museums, pond]))
  })

  it('moves one step on ArrowDown and ArrowUp on a handle, and sends nothing at the ends', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    renderScreen()
    const walksHandle = await screen.findByRole('button', { name: 'Drag to reorder Walks' })

    // A press focuses the handle (a bare .focus() can land on the table row in jsdom); a press alone drops nothing.
    await userEvent.click(walksHandle)
    await userEvent.keyboard('{ArrowUp}')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) })
    expect(writes('PUT')).toHaveLength(0)

    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    expect(writes('PUT')[0].body).toEqual({ parentId: null, ids: [food, walks] })
    expect(writes('PUT')[0].key).toBeTruthy()
    await waitFor(() => expect(order()).toEqual([food, walks]))

    // Walks is last now; another ArrowDown changes nothing.
    await userEvent.keyboard('{ArrowDown}')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) })
    expect(writes('PUT')).toHaveLength(1)
  })

  it('moves a sub-category only among its own siblings, with its parent in the request', async () => {
    lists.map = [
      category(walks, { position: 1, childCount: 2 }),
      category(hill, { name: { en: 'Hill', de: null }, parentId: walks, position: 1 }),
      category(lake, { name: { en: 'Lake', de: null }, parentId: walks, position: 2 }),
      category(museums, { name: { en: 'Museums', de: null }, position: 2, childCount: 1 }),
      category(pond, { name: { en: 'Pond', de: null }, parentId: museums, position: 1 }),
    ]
    renderScreen()

    // A press on the handle focuses it (a bare .focus() can land on the table row in jsdom); the press alone drops nothing.
    await userEvent.click(await screen.findByRole('button', { name: 'Drag to reorder Hill' }))
    await userEvent.keyboard('{ArrowDown}')

    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    // Only Walks' group is in the request; the other group keeps its order and its parent.
    expect(writes('PUT')[0].body).toEqual({ parentId: walks, ids: [lake, hill] })
    await waitFor(() => expect(order()).toEqual([walks, lake, hill, museums, pond]))
    expect(within(rowOf('Pond')).queryByText('Museums')).not.toBeInTheDocument()
    expect(writes('PUT')).toHaveLength(1)
  })

  it.each([
    [422, 'validation-failed', 'The list changed and was reloaded. Try the move again.'],
    [409, 'category-in-use', 'This category is still used by pins or stories. Untag them first.'],
  ])('reads the list again, shows the server order and says why when a reorder is refused with %i', async (status, type, message) => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    answer = (call) => {
      if (call.method !== 'PUT')
        return undefined
      // Someone else reordered meanwhile: the re-read holds a third order, neither the shown one nor the tried one.
      lists.map = [lists.map[1], category(lake, { name: { en: 'Lake', de: null }, position: 3 }), lists.map[0]]

      return problem(status, type)
    }
    renderScreen()

    await openMenu('Walks', 'Move down')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await waitFor(() => expect(reads()).toHaveLength(2))
    // The list is the server's order, not the one that was tried.
    await waitFor(() => expect(order()).toEqual([food, lake, walks]))
  })

  it('says so when the account belongs to no store', async () => {
    answer = call => call.path === '/api/me' ? Response.json({ guestId: storeId, stores: [] }) : undefined
    renderScreen()

    expect(await screen.findByText('You do not belong to a store yet, so there are no categories to edit.')).toBeInTheDocument()
  })

  it('names the missing language on a row and falls back to the other one', async () => {
    lists.map = [category(walks, { name: { en: null, de: 'Wanderungen' } })]
    renderScreen()

    expect(await screen.findByText('Wanderungen', { selector: 'span.block' })).toBeInTheDocument()
    expect(screen.getByText('No English name')).toBeInTheDocument()
  })
})

describe('[E4.18][AC87] the category editor on a phone in German', () => {
  beforeEach(async () => {
    view.wide = false
    await loadDictionary('de')
    localStorage.setItem('sk.language', JSON.stringify('de'))
  })

  it('shows the empty state of the list', async () => {
    renderScreen()

    expect(await screen.findByText('Noch keine Kartenkategorien. Fügen Sie die erste hinzu.')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('hides the handles while searching, shows sub-categories in the results and the German empty result', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: 'Wanderungen' }, position: 1, childCount: 1 }),
      category(hill, { name: { en: 'Hill', de: 'Hügel' }, parentId: walks, position: 1 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    // The list holds the parents only, each with a handle; the table is not rendered.
    expect(await screen.findByRole('button', { name: 'Walks ziehen, um die Reihenfolge zu ändern' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /ziehen, um die Reihenfolge zu ändern$/ })).toHaveLength(2)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    const search = screen.getByRole('searchbox', { name: 'Kategorien durchsuchen' })

    await userEvent.type(search, 'hügel')
    expect(await screen.findByRole('list', { name: 'Suchergebnisse' })).toBeInTheDocument()
    expect(screen.getByText('Hill')).toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ziehen, um die Reihenfolge zu ändern$/ })).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    expect(screen.getByText('Keine Kategorie heißt „zzz“.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcategories\.[a-z]/i)
  })

  it('[E4.13][AC95] the list and the page show the icon before the name, and none for a category without one', async () => {
    lists.map = [
      category(walks, { name: { en: 'Walks', de: 'Wanderungen' }, icon: 'hiking', position: 1 }),
      category(food, { name: { en: 'Food', de: 'Essen' }, position: 2 }),
    ]
    renderScreen()

    const beforeName = (name: string) => screen.getByText(name).previousElementSibling

    await screen.findByText('Walks')
    expect(beforeName('Walks')?.tagName).toBe('svg')
    expect(beforeName('Food')).toBeNull()
    await userEvent.click(screen.getByText('Walks'))
    expect((await screen.findByRole('heading', { name: 'Walks' })).querySelector('svg.text-muted')).not.toBeNull()
  })

  it('does not offer Delete while a reorder runs', async () => {
    let release = () => {}

    hold = new Promise<void>((resolve) => { release = resolve })
    lists.map = [
      category(walks, { name: { en: 'Walks', de: null }, position: 1 }),
      category(food, { name: { en: 'Food', de: null }, position: 2 }),
    ]
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Walks ziehen, um die Reihenfolge zu ändern' }))
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(writes('PUT')).toHaveLength(1))
    await userEvent.click(screen.getByText('Food'))
    expect(await screen.findByRole('button', { name: 'Kategorie löschen' })).toBeDisabled()

    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kategorie löschen' })).toBeEnabled())
    expect(writes('DELETE')).toHaveLength(0)
  })
})

describe('[S8-UI-01] the categories screen uses the shared list header and toolbar', () => {
  it('[S8-UI-01] Add has the Media button style and the tabs sit before the search box', () => {
    renderScreen()

    expectListChrome({ start: screen.getByRole('tablist'), search: screen.getByRole('searchbox', { name: 'Search categories' }) })
    expectListChrome({ action: screen.getByRole('button', { name: /^Add/ }) })
  })
})
