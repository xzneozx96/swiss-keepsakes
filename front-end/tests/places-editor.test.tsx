import type { FakeApi } from './places-support'

import { toast } from '@heroui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { StepWhen } from '@/features/places/components/step-when'
import { emptyDate, emptyForm, validate } from '@/features/places/lib/form'
import { installApi, pinOf, problem, renderInRouter, storeId, uuid } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// The stepper's modules ask CSS.supports when they load, and jsdom has none.
vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

// MapLibre needs a canvas, which jsdom has not: the picker is replaced by a button that places a pin.
vi.mock('@/features/places/components/map-picker', () => ({
  MapPicker: ({ onPlace }: { onPlace: (position: { lat: number, lng: number }) => void }) => (
    <button type="button" onClick={() => onPlace({ lat: 47.05, lng: 8.3 })}>Place pin</button>
  ),
}))

let api: FakeApi

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

function open(placeId: string, options: { start?: 'dates', language?: 'en' | 'de' } = {}) {
  return renderInRouter(<PlaceEditorScreen placeId={placeId} start={options.start} />, { path: `/store/content/places/${placeId}${options.start ? '?start=dates' : ''}`, language: options.language })
}

const writes = () => api.calls.filter(call => call.method !== 'GET' && call.path.startsWith(`/api/store/${storeId}/pins`))
const press = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))
const type = (label: string, text: string) => userEvent.type(screen.getByLabelText(label), text)
// On a phone the step's title starts with "Step 2 of 6 · ", so a heading is found by how it ends.
const stepName = (name: string) => new RegExp(`${name}$`)
const heading = (name: string) => screen.findByRole('heading', { name: stepName(name), level: 2 })

const livePin = (over = {}) => pinOf({ status: 'published', slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, draft: null, published: { title: { en: 'Chapel Bridge' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }, firstPublishedAt: '2026-10-29T10:00:00.000Z', rowVersion: 3, ...over })

async function completeNewPin() {
  await heading('Place on the map')
  await press('Place pin')
  await type('Map link', 'chapel-bridge')
  await press('Next')
  await type('Title in English', 'Chapel Bridge')
}

async function nextTo(step: string) {
  for (let i = 0; i < 6 && !screen.queryByRole('heading', { name: stepName(step), level: 2 }); i++)
    await press('Next')
  await heading(step)
}

describe('[E4.2][AC68] N17 a new place', () => {
  it('[E4.2][AC68] starts on the map step with six steps, and no type to choose', async () => {
    await open('new')

    await heading('Place on the map')
    for (const label of ['Place on the map', 'Text and photo', 'Hours and dates', 'Categories and tags', 'Story and link', 'Review and publish'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.queryByText(/type of place/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Draft')
  })

  it('[E4.2][AC68] saves a draft with the position, the map link per title language and a key, then moves to the pin\'s own address', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = pinOf({ id: uuid(10) })
    const { router } = await open('new')
    await completeNewPin()
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins`, key: expect.any(String), body: { title: { en: 'Chapel Bridge' }, slug: { en: 'chapel-bridge' }, latitude: 47.05, longitude: 8.3, interests: [], mustVisit: false, serviceType: null, foodKind: null, photos: [], dates: [], outboundUrl: null } })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/store/content/places/${uuid(10)}`))
    expect(success).toHaveBeenCalledExactlyOnceWith('Draft saved.')
  })

  it('[E4.2][AC85][AC68] publishes with a title, a position and a map link and nothing else: a create, then a publish with the new version', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = pinOf({ id: uuid(10), rowVersion: 1 })
    await open('new')
    await completeNewPin()
    await nextTo('Review and publish')
    await press('Publish')

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins`, body: { categoryIds: [], mainStoryGroupId: null } })
    expect(writes()[1]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '1' })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Published. The pin is on the map.'))
  })

  it('[E4.2][AC68] on the review, each missing item is named, and Publish sends nothing', async () => {
    await open('new')
    await heading('Place on the map')
    await nextTo('Review and publish')

    const list = within(screen.getByRole('region', { name: 'Needed to publish' }))
    expect(list.getAllByText('missing')).toHaveLength(3)
    expect(list.getByText('A title in English or German')).toBeInTheDocument()
    await press('Publish')

    expect(writes()).toHaveLength(0)
    expect(await screen.findByText('To publish, fix the steps marked red.')).toBeInTheDocument()
  })

  it('[E4.2][AC68] a title in German alone completes the title item, and German text is saved under de', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await userEvent.click(screen.getByRole('tab', { name: /^German/ }))
    await type('Title in German', 'Kapellbrücke')
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ title: { de: 'Kapellbrücke' } })
    expect((writes()[0]!.body as { title: object }).title).not.toHaveProperty('en')
  })

  it('[E4.2][AC68] a map link that another place uses sends the editor back to it with the words of the refusal', async () => {
    const danger = vi.spyOn(toast, 'danger')
    api.answer = call => (call.method === 'POST' ? problem(409, 'content-slug-taken') : undefined)
    await open('new')
    await completeNewPin()
    await press('Save draft')

    expect(await screen.findAllByText('Another place already uses this map link. Pick a different one.')).not.toHaveLength(0)
    await heading('Place on the map')
    expect(danger).not.toHaveBeenCalled()
  })

  it('[E4.2][AC68] a map link with capitals or spaces is refused in the field, and nothing is sent', async () => {
    await open('new')
    await heading('Place on the map')
    await type('Map link', 'Chapel Bridge')

    expect(await screen.findByText(/Use small letters, numbers and dashes only/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fix 1 problem before saving.')
    await press('Save draft')
    expect(writes()).toHaveLength(0)
  })
})

describe('[E4.2][AC68] N17 text per language', () => {
  const openText = async (language?: 'de') => {
    await open('new', { language })
    await heading(language ? 'Ort auf der Karte' : 'Place on the map')
    await userEvent.click(screen.getByRole('button', { name: language ? 'Weiter' : 'Next' }))
    await heading(language ? 'Text und Foto' : 'Text and photo')
  }

  it('[E4.2][AC68] shows one language at a time on the shared language switch, with each language\'s state', async () => {
    await openText()

    expect(screen.getByRole('tablist', { name: 'Language version' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^English, Not written/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^German, Not written/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Title in English')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title in German')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tip in German')).not.toBeInTheDocument()
  })

  it('[E4.2][AC68] a title makes the language Ready, and text without a title is Missing title', async () => {
    await openText()
    await type('Tip in English', 'Come at dawn.')

    expect(screen.getByRole('tab', { name: /^English, Missing title/ })).toBeInTheDocument()
    await type('Title in English', 'Chapel Bridge')
    expect(screen.getByRole('tab', { name: /^English, Ready/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^German, Not written/ })).toBeInTheDocument()
  })

  it('[E4.2][AC68] keeps what was typed in a language while the other is open, and saves both', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await openText()
    await type('Title in English', 'Chapel Bridge')
    await userEvent.click(screen.getByRole('tab', { name: /^German/ }))
    await type('Title in German', 'Kapellbrücke')
    await type('Local tip in German', 'Bei Sonnenaufgang')
    await userEvent.click(screen.getByRole('tab', { name: /^English/ }))

    expect(screen.getByLabelText('Title in English')).toHaveValue('Chapel Bridge')
    await userEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]!)
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, localTip: { de: 'Bei Sonnenaufgang' } })
  })

  it('[E4.2][AC68] opens on the dashboard language, German here, with German labels', async () => {
    await openText('de')

    expect(screen.getByRole('tablist', { name: 'Sprachversion' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Deutsch/, selected: true })).toBeInTheDocument()
    expect(screen.getByLabelText('Titel auf Deutsch')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Englisch, Nicht geschrieben/ })).toBeInTheDocument()
  })
})

describe('[E4.2][AC68] N17 header', () => {
  it('[E4.2][AC68] is one row: a back button named All places, the title, then the status chip', async () => {
    api.pin = livePin()
    await open(uuid(10))
    await heading('Place on the map')

    const title = screen.getByRole('heading', { level: 1, name: 'Chapel Bridge' })
    const back = screen.getByRole('link', { name: 'All places' })
    const status = screen.getByTestId('places-status')
    expect(back).toHaveAttribute('href', '/store/content/places')
    expect(back).not.toHaveTextContent('All places')
    expect(back.parentElement).toBe(title.parentElement)
    expect(status.parentElement).toBe(title.parentElement)
    expect(Array.from(title.parentElement!.children)).toEqual([back, title, status])
    expect(status).toHaveTextContent('Published')
    expect(status.querySelector('.chip--success')).not.toBeNull()
  })

  it('[E4.2][AC68] shows draft in the neutral colour and hidden in the warning colour, as the list does', async () => {
    await open('new')
    await heading('Place on the map')

    expect(screen.getByTestId('places-status')).toHaveTextContent('Draft')
    expect(screen.getByTestId('places-status').querySelector('.chip--default')).not.toBeNull()
  })

  it('[E4.2][AC68] a hidden place reads Hidden in the warning colour', async () => {
    api.pin = livePin({ status: 'hidden' })
    await open(uuid(10))
    await heading('Place on the map')

    expect(screen.getByTestId('places-status')).toHaveTextContent('Hidden')
    expect(screen.getByTestId('places-status').querySelector('.chip--warning')).not.toBeNull()
  })

  it('[E4.2][AC68] the form card starts level with the step list: nothing sits above the first card', async () => {
    await open('new')
    await heading('Place on the map')

    // jsdom has no layout: the step's title row, empty from 1024 px, must not be a flex item that adds a gap.
    const row = document.getElementById('step-title')!.parentElement!

    expect(row.className).toContain('lg:contents')
    expect(row.parentElement!.className).toContain('lg:contents')
  })
})

describe('[E4.2][AC68] N17 one pattern for every field, and a card for each block', () => {
  const blocks = () => screen.getAllByTestId('place-block')
  const headings = () => screen.queryAllByRole('heading', { level: 3 }).map(item => item.textContent)

  it('[E4.2][AC68] the map step has two cards; a field is label, input, help line, and no heading repeats a label', async () => {
    await open('new')
    await heading('Place on the map')

    expect(blocks()).toHaveLength(2)
    expect(headings()).toEqual(['Location on the map', 'Map link and address'])
    expect(screen.queryByRole('heading', { name: 'Map link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Address' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Map link')).toHaveLength(1)
    expect(screen.getAllByText('Address')).toHaveLength(1)
    expect(screen.getByLabelText('Map link')).toHaveAccessibleDescription(/Guests share the pin with this link/)
    expect(screen.getByLabelText('Address')).toHaveAccessibleDescription(/One address for both languages/)
    // The same card holds both fields, and a card is not collapsible.
    expect(blocks()[1]).toContainElement(screen.getByLabelText('Address'))
    expect(blocks()[1]).toContainElement(screen.getByLabelText('Map link'))
    for (const block of blocks())
      expect(block.querySelector('[aria-expanded]')).toBeNull()
    expect(blocks()[0]).toHaveClass('rounded-3xl', 'bg-surface', 'shadow-surface')
  })

  it('[E4.2][AC68] the hours and dates step has a card for each, with a heading because each groups several fields', async () => {
    await open('new', { start: 'dates' })
    await heading('Hours and dates')

    expect(blocks()).toHaveLength(2)
    expect(headings().slice(0, 2)).toEqual(['Opening hours', 'Dates'])
  })

  it('[E4.2][AC68] the categories step has no heading that repeats a field label', async () => {
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')

    expect(blocks()).toHaveLength(4)
    expect(headings()).toEqual(['Shown on the home'])
    expect(screen.getAllByText('Recommended for')).toHaveLength(1)
    expect(screen.getAllByText('Interests')).toHaveLength(1)
    expect(screen.getAllByText('Categories')).toHaveLength(1)
  })

  it('[E4.2][AC68] the story step puts each field in its own card without a repeating heading', async () => {
    await open('new')
    await heading('Place on the map')
    await nextTo('Story and link')

    expect(blocks()).toHaveLength(2)
    expect(headings()).toEqual([])
    expect(screen.getByLabelText('Outbound link')).toHaveAccessibleDescription(/One web address/)
  })

  it('[E4.2][AC68] reads in German with the same pattern', async () => {
    await open('new', { language: 'de' })
    await heading('Ort auf der Karte')

    expect(headings()).toEqual(['Standort auf der Karte', 'Kartenlink und Adresse'])
    expect(screen.getAllByText('Kartenlink')).toHaveLength(1)
    expect(screen.getAllByText('Adresse')).toHaveLength(1)
  })
})

describe('[E4.2][AC86] N17 dates and Add event', () => {
  it('[E4.2][AC86] Add event opens a new place on the dates step with one date entry ready', async () => {
    await open('new', { start: 'dates' })

    await heading('Hours and dates')
    expect(screen.getByText('Date 1')).toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Draft')
  })

  it('[E4.2][AC86] the day, from and to fields are the phone\'s own date input, not free text', async () => {
    await open('new', { start: 'dates' })
    await heading('Hours and dates')

    expect(screen.getByLabelText('1 · Day')).toHaveAttribute('type', 'date')
    await userEvent.click(screen.getByRole('radio', { name: 'Several days' }))
    expect(screen.getByLabelText('1 · From')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('1 · To')).toHaveAttribute('type', 'date')
  })

  it('[E4.2][AC86] a day that is not a real YYYY-MM-DD (a paste, or the demo build) is refused with the words on that entry', () => {
    const form = { ...emptyForm(), dates: [{ ...emptyDate(), key: 'd1', firstDay: '14.11.2026' }] }

    render(
      <LocaleProvider>
        <StepWhen errors={validate(form)} form={form} patch={() => {}} pin={undefined} slugTaken={false} storeId={storeId} />
      </LocaleProvider>,
    )

    const entry = screen.getByText('Date 1').closest('li')!
    expect(within(entry).getByRole('alert')).toHaveTextContent('Use a real day, like 2026-11-14.')
  })

  it('[E4.2][AC86] 22:00 to 00:30 is refused in words and blocks the save, and a late event with no end is accepted', async () => {
    await open('new', { start: 'dates' })
    await heading('Hours and dates')
    await type('1 · Day', '2026-11-14')
    await type('1 · Starts', '22:00')
    await type('1 · Ends', '00:30')

    expect(await screen.findByText(/A date cannot run past midnight/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Fix 1 problem before saving.')
    await press('Save draft')
    expect(writes()).toHaveLength(0)

    await userEvent.clear(screen.getByLabelText('1 · Ends'))
    await waitFor(() => expect(screen.queryByText(/A date cannot run past midnight/)).not.toBeInTheDocument())
    api.pin = pinOf({ id: uuid(10) })
    await press('Save draft')
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ dates: [{ firstDay: '2026-11-14', lastDay: '2026-11-14', startTime: '22:00', endTime: null }] })
  })

  it('[E4.2][AC86] weekly hours are written per day and a close before the open is refused', async () => {
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await press('Next')
    await heading('Hours and dates')
    await userEvent.click(screen.getByRole('button', { name: 'Add hours for Mon' }))
    await type('Mon · Opens', '18:00')
    await type('Mon · Closes', '09:00')

    expect(await screen.findByText(/Closing must be after opening/)).toBeInTheDocument()
  })
})

describe('[E4.2][AC41][AC68] N17 tags and the home fields', () => {
  it('[E4.2][AC41] offers the five fixed interests, and saves local-activities with the home fields', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')

    for (const label of ['History and culture', 'Food and drink', 'Lake and mountains', 'Shopping and keepsakes', 'Local activities'])
      expect(screen.getByRole('checkbox', { name: new RegExp(label) })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox', { name: /History|Food and drink|Lake|Shopping|Local activities/ })).toHaveLength(5)
    await userEvent.click(screen.getByRole('checkbox', { name: /Local activities/ }))
    await userEvent.click(screen.getByRole('switch', { name: /Must-visit/ }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ interests: ['local-activities'], mustVisit: true })
  })

  it('[E4.2][AC41] the stay field is Recommended for: three visitor groups and a help that says it never hides the place', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')

    expect(screen.getByRole('radiogroup', { name: 'Recommended for' })).toBeInTheDocument()
    expect(screen.getByText('Shown first to these visitors. It never hides the place.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Short stay visitors/ })).toBeInTheDocument()
    expect(screen.getByText('In Lucerne for a few hours or a day')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Long stay visitors/ })).toBeInTheDocument()
    expect(screen.getByText('Staying one night or more')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /All visitors/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Long stay visitors/ }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ stayTag: 'multi_day' })
  })

  it('[E4.2][AC41] the stay field reads in German', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new', { language: 'de' })
    await heading('Ort auf der Karte')
    for (let i = 0; i < 6 && !screen.queryByRole('heading', { name: /Kategorien und Tags$/, level: 2 }); i++)
      await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await heading('Kategorien und Tags')

    expect(screen.getByRole('radiogroup', { name: 'Empfohlen für' })).toBeInTheDocument()
    expect(screen.getByText('Wird diesen Gästen zuerst gezeigt. Der Ort wird nie ausgeblendet.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Gäste mit kurzem Aufenthalt/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Gäste mit längerem Aufenthalt/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Alle Gäste/ })).toBeInTheDocument()
  })

  it('[E4.2][AC68] lists the map categories of the store and saves the ones ticked', async () => {
    api.categories = [
      { id: uuid(20), slug: 'walks', name: { en: 'Walks', de: 'Wanderungen' }, parentId: null, position: 1, childCount: 1, useCount: 0 },
      { id: uuid(21), slug: 'old-town', name: { en: 'Old town', de: 'Altstadt' }, parentId: uuid(20), position: 1, childCount: 0, useCount: 0 },
    ]
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Categories and tags')
    await userEvent.click(await screen.findByRole('checkbox', { name: /Old town/ }))
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ categoryIds: [uuid(21)] })
  })
})

describe('[E4.2][AC63][AC68] N17 story and link', () => {
  it('[E4.2][AC63] the outbound link must be https, and a change is saved on the pin', async () => {
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await nextTo('Story and link')
    await type('Outbound link', 'http://hotel.example')

    expect(await screen.findByText(/full web address that starts with https/)).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Outbound link'))
    await type('Outbound link', 'https://hotel.example/stay')
    expect(screen.getByText(/Every page that shows this pin uses this link/)).toBeInTheDocument()
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ outboundUrl: 'https://hotel.example/stay' })
  })

  it('[E4.2][AC85] the main story is optional, and one with no live language shows which language misses it', async () => {
    api.stories = [{ groupId: uuid(30), kind: 'story', title: { en: 'The bridge' }, publishedLanguages: ['en'] }]
    api.pin = pinOf({ id: uuid(10), mainStoryGroupId: uuid(30) })
    await open(uuid(10))

    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Story and link/ }).at(0)!)
    await heading('Story and link')
    expect(await screen.findByText(/Guests reading German see no story link/)).toBeInTheDocument()
    expect(screen.queryByText(/No main story. The pin publishes without one/)).not.toBeInTheDocument()
  })
})

describe('[E4.2][AC68] N17 photos', () => {
  const grant = { uploadKey: `${storeId}/up-1.jpg`, url: 'https://storage.test/uploads/up-1', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T12:00:00.000Z', kind: 'image' }
  const media = (status: 'processing' | 'ready') => ({ id: uuid(40), kind: 'image', status, contentType: 'image/jpeg', byteSize: 3, width: 800, height: 600, publicUrl: status === 'ready' ? 'https://storage.test/media/a.jpg' : null, variants: [] })
  const readyMedia = (call: { path: string, method: string }) => (call.path.includes('/media/') && call.method === 'GET' ? Response.json({ ...media('ready'), id: call.path.split('/').at(-1) }) : undefined)
  const openPhotos = async (pin = pinOf({ id: uuid(10) })) => {
    api.pin = pin
    await open(uuid(10))
    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
  }
  const rows = () => within(screen.getByRole('list', { name: 'Photos, in order' })).getAllByRole('listitem')
  const names = () => rows().map(row => row.querySelector('.line-clamp-2')!.textContent)

  it('[E4.2][AC68] one list: with no photo it says so, and the first photo added is the cover', async () => {
    api.answer = (call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json(grant)
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json(media('processing'), { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${uuid(40)}`)
        return Response.json(media('ready'))
      if (call.method === 'PUT')
        return new Response(null, { status: 200 })
    }
    api.pin = pinOf({ id: uuid(10) })
    await open('new')
    await heading('Place on the map')
    await press('Next')

    expect(screen.getByText('No photos yet. The first one you add is the main photo.')).toBeInTheDocument()
    expect(screen.getAllByTestId('places-photo-input')).toHaveLength(1)
    expect(screen.queryByText('More photos')).not.toBeInTheDocument()
    await userEvent.upload(screen.getByTestId('places-photo-input'), new File(['abc'], 'bridge.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(names()).toEqual(['Photo 1']))
    expect(rows()[0]).toHaveTextContent('Cover')
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'https://storage.test/media/a.jpg'))
    expect(api.calls.find(call => call.method === 'PUT')).toMatchObject({ path: '/uploads/up-1' })
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ coverMediaId: uuid(40), photos: [] })
  })

  it('[E4.2][AC68] a refused upload says why, and keeps the form', async () => {
    const danger = vi.spyOn(toast, 'danger')
    api.answer = call => (call.path === `/api/store/${storeId}/media/uploads` ? problem(422, 'media-type-not-allowed') : undefined)
    await open('new')
    await heading('Place on the map')
    await press('Next')
    await userEvent.upload(screen.getByTestId('places-photo-input'), new File(['abc'], 'a.gif', { type: 'image/jpeg' }))

    expect(await screen.findByText(/This type of file is not allowed/)).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    expect(danger).not.toHaveBeenCalled()
  })

  it('[E4.2][AC68] shows the main photo first and the extra photos after it, each with a grip, a thumbnail and Remove', async () => {
    api.answer = readyMedia
    await openPhotos(pinOf({ id: uuid(10), coverMediaId: uuid(41), photos: [{ mediaId: uuid(42) }, { mediaId: uuid(43) }] }))

    expect(names()).toEqual(['Photo 1', 'Photo 2', 'Photo 3'])
    expect(rows()[0]).toHaveTextContent('Cover')
    expect(screen.getAllByText('Cover')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Move Photo 2, position 2 of 3. Drag, or use the arrow keys.' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Remove Photo/ })).toHaveLength(3)
    await waitFor(() => expect(rows()[0]!.querySelector('img')).toHaveAttribute('src', 'https://storage.test/media/a.jpg'))
    expect(screen.queryByLabelText(/Photo description/)).not.toBeInTheDocument()
  })

  it('[E4.2][AC68] moving a photo to the top makes it the cover; the old cover becomes the first extra photo', async () => {
    api.answer = readyMedia
    await openPhotos(pinOf({ id: uuid(10), coverMediaId: uuid(41), photos: [{ mediaId: uuid(42) }, { mediaId: uuid(43) }] }))
    screen.getByRole('button', { name: /^Move Photo 3,/ }).focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')

    expect(rows()[0]).toHaveTextContent('Cover')
    expect(screen.getByText('Photo 2 moved to position 1 of 3.')).toBeInTheDocument()
    await press('Save draft')
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.method).toBe('PATCH')
    expect(writes()[0]!.body).toMatchObject({ coverMediaId: uuid(43), photos: [{ mediaId: uuid(41) }, { mediaId: uuid(42) }] })
    expect(writes()[0]!.body).not.toHaveProperty('coverAlt')
  })

  it('[E4.2][AC68] removing the cover promotes the next photo; removing the last photo leaves no cover', async () => {
    api.answer = readyMedia
    await openPhotos(pinOf({ id: uuid(10), coverMediaId: uuid(41), photos: [{ mediaId: uuid(42) }] }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Photo 1' }))

    expect(names()).toEqual(['Photo 1'])
    expect(rows()[0]).toHaveTextContent('Cover')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Photo 1' }))
    expect(screen.getByText('No photos yet. The first one you add is the main photo.')).toBeInTheDocument()
    await press('Save draft')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ coverMediaId: null, photos: [] })
  })

  it('[E4.2][AC68] a photo added while text is typed keeps the text', async () => {
    api.answer = (call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json(grant)
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json(media('processing'), { status: 201 })
      return readyMedia(call) ?? (call.method === 'PUT' ? new Response(null, { status: 200 }) : undefined)
    }
    await openPhotos(pinOf({ id: uuid(10), coverMediaId: uuid(41) }))
    let release = () => {}
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    await userEvent.upload(screen.getByTestId('places-photo-input'), new File(['abc'], 'new.jpg', { type: 'image/jpeg' }))
    await userEvent.type(screen.getByLabelText('Tip in English'), 'Typed during the upload')
    release()

    await waitFor(() => expect(names()).toEqual(['Photo 1', 'Photo 2']))
    expect(screen.getByLabelText('Tip in English')).toHaveValue('Typed during the upload')
    await press('Save draft')
    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ tip: { en: 'Typed during the upload' }, coverMediaId: uuid(41), photos: [{ mediaId: uuid(40) }] })
  })

  it('[E4.2][AC68] stops at 11 photos: the cover and 10 more', async () => {
    api.answer = readyMedia
    await openPhotos(pinOf({ id: uuid(10), coverMediaId: uuid(50), photos: Array.from({ length: 10 }, (_, i) => ({ mediaId: uuid(51 + i) })) }))

    expect(names()).toHaveLength(11)
    expect(screen.queryByTestId('places-photo-input')).not.toBeInTheDocument()
    expect(screen.getByText('Up to 11 photos: the main photo and 10 more.')).toBeInTheDocument()
  })
})

describe('[E4.2][AC79][AC85] N17 a pin that exists', () => {
  it('[E4.2][AC79] a published pin saves with its version and no new map link, and a draft the save returns is published after it', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = livePin()
    api.answer = call => (call.method === 'PATCH' ? Response.json(livePin({ rowVersion: 4, draft: { title: { en: 'Chapel Bridge, Lucerne' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} } })) : undefined)
    await open(uuid(10))
    await heading('Place on the map')
    expect(screen.getByTestId('places-status')).toHaveTextContent('Published')
    expect(screen.getByText(/Links already shared use this name/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
    await userEvent.clear(screen.getByLabelText('Title in English'))
    await type('Title in English', 'Chapel Bridge, Lucerne')
    await press('Save changes')

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `/api/store/${storeId}/pins/${uuid(10)}`, ifMatch: '3', body: { title: { en: 'Chapel Bridge, Lucerne' } } })
    expect(writes()[0]!.body).not.toHaveProperty('slug')
    expect(writes()[1]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '4' })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Published. The pin is on the map.'))
  })

  it('[E4.2][AC79] a published pin whose save returns no draft says the changes are saved, once', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = livePin()
    api.answer = call => (call.method === 'PATCH' ? Response.json(livePin({ rowVersion: 4 })) : undefined)
    await open(uuid(10))
    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
    await type('Title in English', ' Bridge')
    await press('Save changes')

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Changes saved.'))
    expect(writes()).toHaveLength(1)
  })

  it('[E4.2][AC79] a published pin is hidden after a confirm, and has no delete', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = livePin()
    await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')

    expect(screen.queryByRole('button', { name: 'Delete draft' })).not.toBeInTheDocument()
    await press('Hide from map')
    await userEvent.click(await screen.findByRole('button', { name: 'Hide pin' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/hide`, ifMatch: '3' })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Chapel Bridge is hidden.'))
  })

  it('[E4.2][AC79] Hide is off while the form has unsaved edits, so hiding never discards them, and it works again once they are saved', async () => {
    api.pin = livePin()
    api.answer = call => (call.method === 'PATCH' ? Response.json(livePin({ rowVersion: 4, draft: { title: { en: 'Chapel Bridge, Lucerne' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} } })) : undefined)
    await open(uuid(10))
    await heading('Place on the map')
    await userEvent.click(screen.getAllByRole('button', { name: /Text and photo/ }).at(0)!)
    await heading('Text and photo')
    await type('Title in English', ', Lucerne')
    await nextTo('Review and publish')

    expect(screen.getByRole('button', { name: 'Hide from map' })).toBeDisabled()
    expect(screen.getByText('Save your changes first. Hiding the pin would discard them.')).toBeInTheDocument()
    await press('Save changes')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Hide from map' })).toBeEnabled())
    expect(screen.queryByText('Save your changes first. Hiding the pin would discard them.')).not.toBeInTheDocument()
    expect(writes().some(call => call.path.endsWith('/hide'))).toBe(false)
  })

  it('[E4.2][AC79] a hidden pin is shown again from the review', async () => {
    api.pin = livePin({ status: 'hidden' })
    await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')
    await press('Show on map again')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/store/${storeId}/pins/${uuid(10)}/publish`, ifMatch: '3' })
  })

  it('[E4.2][AC79] a draft is deleted from the review after a confirm and the editor goes back to the list', async () => {
    const success = vi.spyOn(toast, 'success')
    api.pin = pinOf({ id: uuid(10), rowVersion: 2 })
    const { router } = await open(uuid(10))
    await heading('Place on the map')
    await nextTo('Review and publish')
    await press('Delete draft')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete draft', hidden: false }).then(() => screen.getAllByRole('button', { name: 'Delete draft' }).at(-1)!))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'DELETE', ifMatch: '2' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/store/content/places'))
    expect(success).toHaveBeenCalledExactlyOnceWith('Draft deleted.')
  })

  it('[E4.2][AC68] a pin that is not in the store is not found, with a way back', async () => {
    api.pin = undefined
    await open(uuid(99))

    expect(await screen.findByText('This place does not exist in your store.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All places' })).toHaveAttribute('href', '/store/content/places')
  })

  it('[E4.2][AC68] shows the editor skeleton while the pin is on its way', async () => {
    let release!: () => void

    api.pin = pinOf({ id: uuid(10) })
    api.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    await open(uuid(10))

    await waitFor(() => expect(document.querySelector('[class*="skeleton"]')).not.toBeNull())
    expect(screen.queryByTestId('place-editor')).not.toBeInTheDocument()
    release()
    expect(await screen.findByTestId('place-editor')).toBeInTheDocument()
  })

  it('[E4.2][AC68] the editor reads in German', async () => {
    await open('new', { language: 'de' })

    await heading('Ort auf der Karte')
    for (const label of ['Text und Foto', 'Öffnungszeiten und Daten', 'Kategorien und Tags', 'Geschichte und Link', 'Prüfen und veröffentlichen'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Entwurf speichern' })).toBeInTheDocument()
    expect(screen.getByTestId('places-status')).toHaveTextContent('Entwurf')
  })
})
