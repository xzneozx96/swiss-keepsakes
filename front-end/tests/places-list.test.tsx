import type { FakeApi } from './places-support'

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SECTION_PAGES } from '@/components/layout/section-pages'

import { PlacesScreen } from '@/features/places/components/places-screen'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'
import { installApi, listItem, problem, renderInRouter, storeId, uuid } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone cards would render; the table is under test here.
vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => true }))

let api: FakeApi

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.history.pushState({}, '', '/store/content/places')
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
})

afterEach(() => window.history.pushState({}, '', '/'))

const path = '/store/content/places'
const open = (language: 'en' | 'de' = 'en') => renderInRouter(<PlacesScreen />, { path, language })
// The table and the phone cards are both in the DOM (CSS picks one), so a query looks in the table.
const table = () => within(screen.getByRole('grid'))
const rowOf = (name: string) => table().getByRole('link', { name }).closest('tr')!
const writes = (method: string) => api.calls.filter(call => call.method === method)

async function openMenu(name: string, item: string) {
  await userEvent.click((await screen.findAllByRole('button', { name: `Actions for ${name}` })).at(-1)!)
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

describe('[E4.2][AC68] the Places entry of the Content menu', () => {
  it('[E4.2][AC68] Content lists Places, in English and German, and opens the list', () => {
    const entry = SECTION_PAGES.content.find(page => page.id === 'places')

    expect(entry).toMatchObject({ to: '/store/content/places', label: 'merchantContent.tab.places' })
    expect(en['merchantContent.tab.places']).toBe('Places')
    expect(de['merchantContent.tab.places']).toBe('Orte')
  })
})

describe('[E4.2][AC68] N16 the list', () => {
  it('[E4.2][AC86] shows each pin with its status, languages, categories, next date and a warning for an unpublished main story', async () => {
    api.categories = [{ id: uuid(20), slug: 'walks', name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 0, useCount: 1 }]
    api.items = [
      listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, categoryIds: [uuid(20)], interests: ['local-activities'], mainStory: { groupId: uuid(30), published: false } }),
      listItem({ id: uuid(12), status: 'ended', title: { de: 'Fasnacht' }, hasDates: true }),
      listItem({ id: uuid(13), status: 'published', title: { en: 'Blues festival' }, hasDates: true, nextDate: { firstDay: '2090-11-09', lastDay: '2090-11-14', startTime: null, endTime: null } }),
      listItem({ id: uuid(14), status: 'hidden', title: { en: 'Old tap' } }),
    ]
    await open()

    await screen.findAllByRole('link', { name: 'Chapel Bridge' })
    const bridge = within(rowOf('Chapel Bridge'))
    expect(bridge.getByText('Published')).toBeInTheDocument()
    expect(bridge.getByText('EN and DE')).toBeInTheDocument()
    expect(bridge.getByText('Walks')).toBeInTheDocument()
    expect(bridge.getByText(/Local activities/)).toBeInTheDocument()
    expect(bridge.getByText('Not published')).toBeInTheDocument()
    const ended = within(rowOf('Fasnacht'))
    expect(ended.getByText('Ended · off the map')).toBeInTheDocument()
    expect(ended.getByText('DE only')).toBeInTheDocument()
    expect(within(rowOf('Blues festival')).getByText(/Until .*2090/)).toBeInTheDocument()
    expect(within(rowOf('Old tap')).getByText('Hidden')).toBeInTheDocument()
    expect(within(rowOf('Old tap')).getByText('No story')).toBeInTheDocument()
  })

  it('[E4.2][AC68] Add place and Add event open the editor on a new pin, the event on its dates', async () => {
    api.items = [listItem()]
    await open()

    expect((await screen.findAllByRole('link', { name: 'Add place' }))[0]).toHaveAttribute('href', '/store/content/places/new')
    expect(screen.getByRole('link', { name: 'Add event' })).toHaveAttribute('href', '/store/content/places/new?start=dates')
  })

  it('[E4.2][AC68] shows the table loading rows while the list is on its way, then the empty state', async () => {
    let release!: () => void

    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    await open()

    expect(await screen.findByRole('status')).toHaveTextContent('Loading places')
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    release()
    expect((await screen.findAllByText(/No pins yet/)).length).toBeGreaterThan(0)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('[E4.2][AC68] searching and filtering narrow the list, and a list with no match says so', async () => {
    api.items = [
      listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge' }, categoryIds: [uuid(20)] }),
      listItem({ id: uuid(12), status: 'ended', title: { en: 'Fasnacht' }, hasDates: true }),
    ]
    api.categories = [{ id: uuid(20), slug: 'walks', name: { en: 'Walks' }, parentId: null, position: 1, childCount: 0, useCount: 1 }]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by title or map link' }), 'fasn')
    expect(table().queryByRole('link', { name: 'Chapel Bridge' })).not.toBeInTheDocument()
    expect(table().getByRole('link', { name: 'Fasnacht' })).toBeInTheDocument()

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search by title or map link' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by title or map link' }), 'zzz')
    expect((await screen.findAllByText(/No pins match/)).length).toBeGreaterThan(0)
  })

  it('[E4.2][AC79] a published pin can be hidden and not deleted: hide asks first, sends If-Match and a key, and the list reloads', async () => {
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge' }, rowVersion: 4 })]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Chapel Bridge' }).at(-1)!)
    expect(screen.queryByRole('menuitem', { name: 'Delete draft' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide from map' }))

    expect(await screen.findByText('Hide Chapel Bridge?')).toBeInTheDocument()
    expect(writes('POST')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Hide pin' }))

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0]).toMatchObject({ path: `/api/store/${storeId}/pins/${uuid(11)}/hide`, ifMatch: '4', key: expect.any(String) })
    await waitFor(() => expect(api.calls.filter(call => call.method === 'GET' && call.path === `/api/store/${storeId}/pins`).length).toBeGreaterThan(1))
  })

  it('[E4.2][AC79] a draft can be deleted after a confirm, and has no hide action', async () => {
    api.items = [listItem({ id: uuid(11), status: 'draft', title: { en: 'Draft pin' }, rowVersion: 2 })]
    await open()
    await screen.findAllByRole('link', { name: 'Draft pin' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Draft pin' }).at(-1)!)
    expect(screen.queryByRole('menuitem', { name: 'Hide from map' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete draft' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete draft' }))

    await waitFor(() => expect(writes('DELETE')).toHaveLength(1))
    expect(writes('DELETE')[0]).toMatchObject({ path: `/api/store/${storeId}/pins/${uuid(11)}`, ifMatch: '2' })
  })

  it('[E4.2][AC79] a hidden pin is shown again by a publish with its version', async () => {
    api.items = [listItem({ id: uuid(11), status: 'hidden', title: { en: 'Old tap' }, rowVersion: 3 })]
    await open()
    await screen.findAllByRole('link', { name: 'Old tap' })
    await openMenu('Old tap', 'Show on map again')

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0]).toMatchObject({ path: `/api/store/${storeId}/pins/${uuid(11)}/publish`, ifMatch: '3' })
  })

  it('[E4.2][AC79] a refusal of a write is shown in words next to the list', async () => {
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge' }, rowVersion: 4 })]
    api.answer = call => (call.method === 'POST' ? problem(412, 'precondition-failed') : undefined)
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })
    await openMenu('Chapel Bridge', 'Hide from map')
    await userEvent.click(await screen.findByRole('button', { name: 'Hide pin' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone saved this place after you opened it')
  })

  it('[E4.2][AC68] a failed read shows a message with Try again, and a store with no pins at all invites the first', async () => {
    api.answer = call => (call.path === `/api/store/${storeId}/pins` ? problem(500, 'internal-error') : undefined)
    await open()

    expect(await screen.findByText('The places could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Reference: req-1')).toBeInTheDocument()
    api.answer = undefined
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect((await screen.findAllByText(/No pins yet/)).length).toBeGreaterThan(0)
  })

  it('[E4.2][AC68] the whole screen reads in German', async () => {
    api.items = [listItem({ id: uuid(11), status: 'ended', title: { de: 'Kapellbrücke' }, hasDates: true })]
    await open('de')

    await screen.findAllByRole('link', { name: 'Kapellbrücke' })
    expect(screen.getAllByRole('link', { name: 'Ort hinzufügen' })[0]).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anlass hinzufügen' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Orte' })).toBeInTheDocument()
    expect(within(rowOf('Kapellbrücke')).getByText('Vorbei · nicht auf der Karte')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Nach Titel oder Kartenlink suchen' })).toBeInTheDocument()
  })
})
