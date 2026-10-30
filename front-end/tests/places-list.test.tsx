import type { FakeApi } from './places-support'

import { toast } from '@heroui/react'
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

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

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
  it('[E4.2][AC86] shows each pin with its status, categories, stay and interests and the last update', async () => {
    api.categories = [{ id: uuid(20), slug: 'walks', name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 0, useCount: 1 }]
    api.items = [
      listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, categoryIds: [uuid(20)], interests: ['local-activities'] }),
      listItem({ id: uuid(12), status: 'ended', title: { de: 'Fasnacht' }, hasDates: true }),
      listItem({ id: uuid(13), status: 'published', title: { en: 'Blues festival' }, hasDates: true, nextDate: { firstDay: '2090-11-09', lastDay: '2090-11-14', startTime: null, endTime: null } }),
      listItem({ id: uuid(14), status: 'hidden', title: { en: 'Old tap' } }),
    ]
    await open()

    await screen.findAllByRole('link', { name: 'Chapel Bridge' })
    const bridge = within(rowOf('Chapel Bridge'))
    expect(bridge.getByText('Published')).toBeInTheDocument()
    expect(bridge.getByText('Walks')).toBeInTheDocument()
    expect(bridge.getByText(/Local activities/)).toBeInTheDocument()
    const ended = within(rowOf('Fasnacht'))
    expect(ended.getByText('Ended · off the map')).toBeInTheDocument()
    expect(within(rowOf('Old tap')).getByText('Hidden')).toBeInTheDocument()
  })

  it('[E4.2][AC86] the table has the columns of the list: Pin, Status, Categories, Recommended for and Last update', async () => {
    api.items = [listItem({ id: uuid(11), title: { en: 'Chapel Bridge' } })]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    expect(table().getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Pin', 'Status', 'Categories', 'Recommended for', 'Last update', 'Actions'])
  })

  it('[E4.2][AC86] the columns Next date and Main story are gone', async () => {
    api.items = [listItem({ id: uuid(11), title: { en: 'Chapel Bridge' }, hasDates: true, nextDate: { firstDay: '2090-11-09', lastDay: '2090-11-14', startTime: null, endTime: null }, mainStory: { groupId: uuid(30), published: false } })]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    expect(screen.queryByRole('columnheader', { name: 'Next date' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Main story' })).not.toBeInTheDocument()
    expect(within(rowOf('Chapel Bridge')).queryByText(/Until .*2090/)).not.toBeInTheDocument()
    expect(within(rowOf('Chapel Bridge')).queryByText('Not published')).not.toBeInTheDocument()
  })

  it('[E4.2][AC86] the status cell says which language is missing, and a pin with both has no chip', async () => {
    api.items = [
      listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge', de: 'Kapellbrücke' } }),
      listItem({ id: uuid(12), status: 'published', title: { en: 'Blues festival' } }),
      listItem({ id: uuid(13), status: 'published', title: { de: 'Fasnacht' } }),
    ]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    expect(within(rowOf('Chapel Bridge')).queryByText('DE missing')).not.toBeInTheDocument()
    expect(within(rowOf('Chapel Bridge')).queryByText('EN missing')).not.toBeInTheDocument()
    expect(within(rowOf('Blues festival')).getByText('DE missing')).toBeInTheDocument()
    expect(within(rowOf('Fasnacht')).getByText('EN missing')).toBeInTheDocument()
    // The line under the title is gone: the chip says it now.
    expect(screen.queryByText('EN and DE')).not.toBeInTheDocument()
    expect(screen.queryByText('DE only')).not.toBeInTheDocument()
  })

  it('[E4.2][AC86] the phone card carries the same chip as the table', async () => {
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Blues festival' } })]
    await open()
    await screen.findAllByRole('link', { name: 'Blues festival' })

    // The table and the cards are both in the DOM: one chip in each.
    expect(screen.getAllByText('DE missing')).toHaveLength(2)
  })

  it('[E4.2][AC86] the chip reads in German', async () => {
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Blues festival' } })]
    await open('de')
    await screen.findAllByRole('link', { name: 'Blues festival' })

    expect(within(rowOf('Blues festival')).getByText('DE fehlt')).toBeInTheDocument()
  })

  it('[E4.2][AC86] Recommended for shows the stay value in words, then each interest as a chip, in English and German', async () => {
    api.items = [
      listItem({ id: uuid(11), title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, stayTag: 'short_stay', interests: ['local-activities', 'food-drink'] }),
      listItem({ id: uuid(12), title: { en: 'Old tap', de: 'Alter Brunnen' }, stayTag: 'multi_day' }),
      listItem({ id: uuid(13), title: { en: 'Lake', de: 'See' }, stayTag: 'both' }),
    ]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    const bridge = within(rowOf('Chapel Bridge'))
    expect(bridge.getByText('Short stay visitors')).toBeInTheDocument()
    expect(bridge.getByText('Local activities')).toBeInTheDocument()
    expect(bridge.getByText('Food and drink')).toBeInTheDocument()
    expect(within(rowOf('Old tap')).getByText('Long stay visitors')).toBeInTheDocument()
    expect(within(rowOf('Lake')).getByText('All visitors')).toBeInTheDocument()
  })

  it('[E4.2][AC86] Recommended for reads in German', async () => {
    api.items = [
      listItem({ id: uuid(11), title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, stayTag: 'short_stay' }),
      listItem({ id: uuid(12), title: { en: 'Old tap', de: 'Alter Brunnen' }, stayTag: 'multi_day' }),
      listItem({ id: uuid(13), title: { en: 'Lake', de: 'See' }, stayTag: 'both' }),
    ]
    await open('de')
    await screen.findAllByRole('link', { name: 'Kapellbrücke' })
    expect(table().getByRole('columnheader', { name: 'Empfohlen für' })).toBeInTheDocument()
    expect(within(rowOf('Kapellbrücke')).getByText('Gäste mit kurzem Aufenthalt')).toBeInTheDocument()
    expect(within(rowOf('Alter Brunnen')).getByText('Gäste mit längerem Aufenthalt')).toBeInTheDocument()
    expect(within(rowOf('See')).getByText('Alle Gäste')).toBeInTheDocument()
  })

  it('[E4.2][AC86] every chip of a row is the size of the status chip', async () => {
    api.categories = [{ id: uuid(20), slug: 'walks', name: { en: 'Walks' }, parentId: null, position: 1, childCount: 0, useCount: 1 }]
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Blues festival' }, categoryIds: [uuid(20)], interests: ['food-drink'] })]
    await open()
    await screen.findAllByRole('link', { name: 'Blues festival' })

    const row = rowOf('Blues festival')
    const chips = ['Published', 'DE missing', 'Walks', 'Food and drink'].map(text => within(row).getByText(text).closest('[data-slot="chip"]') as HTMLElement)

    for (const chip of chips)
      expect(chip).toHaveClass('chip--lg', 'chip--soft')
  })

  it('[E4.2][AC86] the categories are chips, and a pin with none says None', async () => {
    api.categories = [
      { id: uuid(20), slug: 'walks', name: { en: 'Walks' }, parentId: null, position: 1, childCount: 0, useCount: 1 },
      { id: uuid(21), slug: 'food', name: { en: 'Food' }, parentId: null, position: 2, childCount: 0, useCount: 1 },
    ]
    api.items = [
      listItem({ id: uuid(11), title: { en: 'Chapel Bridge' }, categoryIds: [uuid(20), uuid(21)] }),
      listItem({ id: uuid(12), title: { en: 'Old tap' } }),
    ]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    const bridge = within(rowOf('Chapel Bridge'))
    expect(bridge.getByText('Walks').closest('[data-slot="chip"]')).not.toBeNull()
    expect(bridge.getByText('Food').closest('[data-slot="chip"]')).not.toBeNull()
    expect(within(rowOf('Old tap')).getByText('None')).toBeInTheDocument()
    expect(screen.queryByText(/only under All/)).not.toBeInTheDocument()
  })

  it('[E4.2][AC86] a second line says Place for a pin with no dates, Event with the next date, or Event ended', async () => {
    api.items = [
      listItem({ id: uuid(11), title: { en: 'Chapel Bridge' } }),
      listItem({ id: uuid(12), title: { en: 'Blues festival' }, hasDates: true, nextDate: { firstDay: '2090-11-07', lastDay: '2090-11-07', startTime: '18:00', endTime: null } }),
      listItem({ id: uuid(13), title: { en: 'Fasnacht' }, hasDates: true, nextDate: null }),
    ]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    expect(within(rowOf('Chapel Bridge')).getByText('Place')).toBeInTheDocument()
    expect(within(rowOf('Blues festival')).getByText(/^Event · Tue 7 Nov 2090, from 18:00$/)).toBeInTheDocument()
    expect(within(rowOf('Fasnacht')).getByText('Event · ended')).toBeInTheDocument()
  })

  it('[E4.2][AC86] the line reads in German and the phone card carries it too', async () => {
    api.items = [
      listItem({ id: uuid(11), title: { de: 'Kapellbrücke' } }),
      listItem({ id: uuid(13), title: { de: 'Fasnacht' }, hasDates: true, nextDate: null }),
    ]
    await open('de')
    await screen.findAllByRole('link', { name: 'Kapellbrücke' })

    expect(within(rowOf('Kapellbrücke')).getByText('Ort')).toBeInTheDocument()
    expect(within(rowOf('Fasnacht')).getByText('Veranstaltung · beendet')).toBeInTheDocument()
    // The table and the cards are both in the DOM: one line in each.
    expect(screen.getAllByText('Ort')).toHaveLength(2)
  })

  it('[E4.2][AC86] the filter has a Type group with Place and Event and their counts', async () => {
    api.items = [
      listItem({ id: uuid(11), title: { en: 'Chapel Bridge' } }),
      listItem({ id: uuid(12), title: { en: 'Old tap' } }),
      listItem({ id: uuid(13), title: { en: 'Fasnacht' }, hasDates: true }),
    ]
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(await screen.findByText('Type')).toBeInTheDocument()
    expect(screen.queryByText('Has dates')).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /^Event/ }))
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(table().queryByRole('link', { name: 'Chapel Bridge' })).not.toBeInTheDocument())
    expect(table().getByRole('link', { name: 'Fasnacht' })).toBeInTheDocument()
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
    const success = vi.spyOn(toast, 'success')
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
    expect(success).toHaveBeenCalledExactlyOnceWith('Chapel Bridge is hidden.')
  })

  it('[E4.2][AC79] a draft can be deleted after a confirm, and has no hide action', async () => {
    const success = vi.spyOn(toast, 'success')
    api.items = [listItem({ id: uuid(11), status: 'draft', title: { en: 'Draft pin' }, rowVersion: 2 })]
    await open()
    await screen.findAllByRole('link', { name: 'Draft pin' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for Draft pin' }).at(-1)!)
    expect(screen.queryByRole('menuitem', { name: 'Hide from map' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete draft' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete draft' }))

    await waitFor(() => expect(writes('DELETE')).toHaveLength(1))
    expect(writes('DELETE')[0]).toMatchObject({ path: `/api/store/${storeId}/pins/${uuid(11)}`, ifMatch: '2' })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Draft deleted.'))
  })

  it('[E4.2][AC79] a hidden pin is shown again by a publish with its version', async () => {
    const success = vi.spyOn(toast, 'success')
    api.items = [listItem({ id: uuid(11), status: 'hidden', title: { en: 'Old tap' }, rowVersion: 3 })]
    await open()
    await screen.findAllByRole('link', { name: 'Old tap' })
    await openMenu('Old tap', 'Show on map again')

    await waitFor(() => expect(writes('POST')).toHaveLength(1))
    expect(writes('POST')[0]).toMatchObject({ path: `/api/store/${storeId}/pins/${uuid(11)}/publish`, ifMatch: '3' })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Old tap is on the map again.'))
  })

  it('[E4.2][AC79] a refusal of a write is shown in words next to the list', async () => {
    api.items = [listItem({ id: uuid(11), status: 'published', title: { en: 'Chapel Bridge' }, rowVersion: 4 })]
    const danger = vi.spyOn(toast, 'danger')
    api.answer = call => (call.method === 'POST' ? problem(412, 'precondition-failed') : undefined)
    await open()
    await screen.findAllByRole('link', { name: 'Chapel Bridge' })
    await openMenu('Chapel Bridge', 'Hide from map')
    await userEvent.click(await screen.findByRole('button', { name: 'Hide pin' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone saved this place after you opened it')
    expect(danger).not.toHaveBeenCalled()
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
