import { toast } from '@heroui/react'
import { pickupPlaceListSchema, pickupPlaceSchema, problemSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { startDemo } from '@/features/demo/data-client'
import { PickupPointSheet } from '@/features/merchant/products/components/pickup-point-sheet'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// MapLibre needs a canvas, which jsdom has not: the preview is a line that says where the pin is.
vi.mock('@/features/pickup/components/pickup-map', () => ({
  PickupMap: ({ lat, lng }: { lat: number | null, lng: number | null }) => <p data-testid="pin">{lat === null ? 'no pin' : `${lat},${lng}`}</p>,
}))

// jsdom has no CSS.supports, which the auto-growing text area calls on load.
vi.hoisted(() => {
  const css = (globalThis as unknown as { CSS?: { supports?: () => boolean } }).CSS

  if (css)
    css.supports ??= () => false
  else
    Object.defineProperty(globalThis, 'CSS', { value: { supports: () => false }, configurable: true })
})

interface Call { method: string, path: string, key: string | null, ifMatch: string | null, body: unknown }

const storeId = '0198a000-0000-7000-8000-000000000001'
const pointId = '0198a000-0000-7000-8000-0000000000d1'

let calls: Call[]
let answer: ((call: Call) => Response | undefined) | undefined
let hold: Promise<void> | undefined
let current: ReturnType<typeof point>[]
let demo: ReturnType<typeof startDemo>
const onClose = vi.fn()

function linkAt(lat: number, lng: number) {
  return `https://www.google.com/maps/place/Shop/@${lat},${lng},17z/data=!3d${lat}!4d${lng}`
}

function point(over: Record<string, unknown> = {}) {
  return pickupPlaceSchema.parse({
    id: pointId,
    storeId,
    name: { en: 'Shop Hertensteinstrasse' },
    address: { en: 'Hertensteinstrasse 1, Lucerne' },
    instructions: null,
    position: 1,
    archived: false,
    hours: [{ weekday: 1, opens: '09:00', closes: '12:00' }],
    rowVersion: 3,
    mapsLink: linkAt(47.05165, 8.30754),
    latitude: 47.05165,
    longitude: 8.30754,
    ...over,
  })
}

const newLink = linkAt(47.0516, 8.3075)
const bridge = { street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', formatted: 'Kapellbrücke 1, 6004 Luzern' }

const problem = (status: number, type: string) => Response.json(problemSchema.parse({ type, status, title: type, instance: '/x', requestId: 'req-1' }), { status })

/** The API's 422 for a 101st active point: the type is `validation-failed`, the reason is the code of `errors[0]`. */
function limitProblem() {
  return Response.json({
    type: 'validation-failed',
    status: 422,
    title: 'This shop has the most active pickup points it can hold.',
    instance: '/x',
    requestId: 'req-1',
    errors: [{ in: 'body', path: 'name', message: 'A shop can have at most 100 active pickup points. Archive one first', code: 'pickup-limit' }],
  }, { status: 422, headers: { 'content-type': 'application/problem+json' } })
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  // Sheets open as a dialog on desktop in the merchant area.
  window.history.pushState({}, '', '/store/products/pickup')
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  answer = undefined
  hold = undefined
  current = [point()]
  onClose.mockClear()
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const text = await request.clone().text()
    const url = new URL(request.url)
    const call: Call = { method: request.method, path: url.pathname + url.search, key: request.headers.get('idempotency-key'), ifMatch: request.headers.get('if-match'), body: text ? JSON.parse(text) : undefined }

    calls.push(call)
    await hold
    const custom = answer?.(call)

    if (custom)
      return custom
    if (call.path.includes('/address-at'))
      return problem(404, 'address-not-found')
    if (call.method === 'GET')
      return Response.json(pickupPlaceListSchema.parse({ items: current }))

    return Response.json(point({ rowVersion: 4 }), { status: call.method === 'POST' ? 201 : 200 })
  })
  demo = startDemo()
  await demo.ready
})

async function renderSheet(place: ReturnType<typeof point> | undefined, language: 'en' | 'de' = 'en') {
  if (language === 'de') {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
  }
  render(
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <PickupPointSheet place={place} storeId={storeId} onClose={onClose} />
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const writes = () => calls.filter(call => call.method !== 'GET')
const press = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))
async function paste(text: string) {
  await userEvent.click(screen.getByLabelText('Google Maps link'))
  await userEvent.paste(text)
}
const lookups = () => calls.filter(call => call.path.includes('/address-at') || call.path.includes('/maps-link'))
const type = (label: string, text: string) => userEvent.type(screen.getByLabelText(label), text)
const toggle = (name: string) => userEvent.click(screen.getByRole('switch', { name: `${name} open` }))
const dayRow = (name: string) => screen.getByRole('switch', { name: `${name} open` }).closest('li')!
// HeroUI nests two groups with the same name; typing the four digits fills hours and minutes.
const timeGroups = (label: string) => screen.getAllByRole('group', { name: new RegExp(`^${label}$`) })
async function typeTime(label: string, digits: string) {
  await userEvent.click(within(timeGroups(label)[0]!).getAllByRole('spinbutton')[0]!)
  await userEvent.keyboard(digits)
}

describe('[E6.6][AC26] the pickup point sheet', { timeout: 30_000 }, () => {
  it('creates a point with two languages and hours: one create call with the exact body', async () => {
    await renderSheet(undefined)
    await paste(newLink)
    await type('Name', 'Shop Hertensteinstrasse')
    await type('Address', 'Hertensteinstrasse 1')
    await userEvent.click(screen.getByRole('tab', { name: /^German/ }))
    await type('Name', 'Laden Hertensteinstrasse')
    await type('Address', 'Hertensteinstrasse 1, Luzern')
    await toggle('Monday')
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({
      method: 'POST',
      path: `/api/store/${storeId}/pickup-places`,
      body: {
        name: { en: 'Shop Hertensteinstrasse', de: 'Laden Hertensteinstrasse' },
        address: { en: 'Hertensteinstrasse 1', de: 'Hertensteinstrasse 1, Luzern' },
        mapsLink: newLink,
        hours: [{ weekday: 1, opens: '09:00', closes: '18:00' }],
      },
    })
    expect(writes()[0]!.key).toBeTruthy()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('saves a German-only point', async () => {
    await renderSheet(undefined)
    await userEvent.click(screen.getByRole('tab', { name: /^German/ }))
    await paste(newLink)
    await type('Name', 'Laden')
    await type('Address', 'Luzern')
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toEqual({ name: { de: 'Laden' }, address: { de: 'Luzern' }, instructions: {}, mapsLink: newLink, hours: [] })
  })

  it('an empty name and address show field errors and send nothing', async () => {
    await renderSheet(undefined)
    await press('Save pickup point')

    expect(await screen.findAllByText('Needed for the English version.')).toHaveLength(2)
    expect(screen.getByLabelText('Address')).toBeInvalid()
    expect(screen.getByLabelText('Google Maps link')).toBeInvalid()
    expect(screen.getByText('A Google Maps link is needed.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('opens equal to closes shows the places refusal and sends nothing', async () => {
    await renderSheet(point({ hours: [] }))
    await toggle('Monday')
    await typeTime('Monday closes', '0900')
    await press('Save pickup point')

    expect(await within(dayRow('Monday')).findByText(/Opening and closing must differ/)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('a span that closes after midnight is sent as typed', async () => {
    await renderSheet(point({ hours: [] }))
    await toggle('Monday')
    await typeTime('Monday opens', '2200')
    await typeTime('Monday closes', '0200')
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ hours: [{ weekday: 1, opens: '22:00', closes: '02:00' }] })
  })

  it('a second span on Monday is added and sent, with the row version as If-Match', async () => {
    await renderSheet(point())
    await press('Add a second range for Monday')
    await typeTime('Monday opens', '1400')
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `/api/store/${storeId}/pickup-places/${pointId}`, ifMatch: '3' })
    expect((writes()[0]!.body as { hours: unknown[] }).hours).toHaveLength(2)
  })

  it('a create refused at 100 active points (422 pickup-limit) says why in the sheet, not the generic failure, and keeps the typed text', async () => {
    const danger = vi.spyOn(toast, 'danger')

    await renderSheet(undefined)
    await paste(newLink)
    await type('Name', 'Shop Hertensteinstrasse')
    await type('Address', 'Hertensteinstrasse 1')
    answer = call => (call.method === 'POST' ? limitProblem() : undefined)
    await press('Save pickup point')

    expect(await screen.findByText('100 active pickup points. Archive one first.')).toBeInTheDocument()
    expect(screen.queryByText(/could not be saved|Something went wrong/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Shop Hertensteinstrasse')
    expect(danger).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a stale save (412) shows the notice, keeps the typed text and offers Reload; Reload swaps in the saved point', async () => {
    await renderSheet(point())
    await userEvent.clear(screen.getByLabelText('Address'))
    await type('Address', 'Typed address')
    answer = call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined)
    await press('Save pickup point')

    expect(await screen.findByText(/Someone saved this pickup point after you opened it/)).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toHaveValue('Typed address')
    expect(onClose).not.toHaveBeenCalled()

    answer = undefined
    current = [point({ address: { en: 'Their address' }, rowVersion: 5 })]
    await press('Reload')

    await waitFor(() => expect(screen.getByLabelText('Address')).toHaveValue('Their address'))
    expect(screen.queryByText(/Someone saved this pickup point/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await press('Save pickup point')
    await waitFor(() => expect(writes().at(-1)!.ifMatch).toBe('5'))
  })

  it('the stale notice stays while the merchant types, shows no toast, and the typed text stays', async () => {
    const danger = vi.spyOn(toast, 'danger')

    await renderSheet(point())
    answer = call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined)
    await press('Save pickup point')
    expect(await screen.findByText(/Someone saved this pickup point after you opened it/)).toBeInTheDocument()

    await type('Address', ' 2')

    expect(screen.getByText(/Someone saved this pickup point after you opened it/)).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toHaveValue('Hertensteinstrasse 1, Lucerne 2')
    expect(danger).not.toHaveBeenCalled()
    danger.mockRestore()
  })

  it('two quick taps on Save send one request', async () => {
    let release: () => void = () => {}

    await renderSheet(point())
    hold = new Promise((resolve) => {
      release = resolve
    })
    const save = screen.getByRole('button', { name: 'Save pickup point' })

    await userEvent.dblClick(save)
    release()

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(writes()).toHaveLength(1)
  })

  it('a link that is no Google Maps link shows the field error and sends nothing', async () => {
    await renderSheet(undefined)
    await type('Name', 'Shop')
    await type('Address', 'Street 1')
    await paste('not a link')
    await press('Save pickup point')

    expect(await screen.findByText('This link has no position we can read. Use a link from Google Maps.')).toBeInTheDocument()
    expect(screen.getByLabelText('Google Maps link')).toBeInvalid()
    expect(writes()).toHaveLength(0)
  })

  it('a pasted link moves the pin and fills the empty address in both languages from the register', async () => {
    answer = call => (call.path.includes('/address-at') ? Response.json(bridge) : undefined)
    await renderSheet(undefined)

    await paste(newLink)

    expect(screen.getByTestId('pin')).toHaveTextContent('47.0516,8.3075')
    await waitFor(() => expect(screen.getByLabelText('Address')).toHaveValue('Kapellbrücke 1, 6004 Luzern'))
    expect(lookups()[0]).toMatchObject({ method: 'GET', path: `/api/store/${storeId}/address-at?lat=47.0516&lng=8.3075` })
    await userEvent.click(screen.getByRole('tab', { name: /^German/ }))
    expect(screen.getByLabelText('Address')).toHaveValue('Kapellbrücke 1, 6004 Luzern')
  })

  it('never overwrites an address the merchant typed, and the address stays editable after it is filled', async () => {
    answer = call => (call.path.includes('/address-at') ? Response.json(bridge) : undefined)
    await renderSheet(undefined)
    await type('Address', 'My own text')

    await paste(newLink)
    await waitFor(() => expect(lookups()).toHaveLength(1))

    expect(screen.getByLabelText('Address')).toHaveValue('My own text')
  })

  it('a short link is followed by the API route the place editor uses, and its position is the pin', async () => {
    answer = call => (call.path.includes('/maps-link') ? Response.json({ latitude: 47.1, longitude: 8.2 }) : undefined)
    await renderSheet(undefined)

    await paste('https://maps.app.goo.gl/abc123')

    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('47.1,8.2'))
    expect(lookups()[0]).toMatchObject({ method: 'GET', path: `/api/store/${storeId}/maps-link?url=${encodeURIComponent('https://maps.app.goo.gl/abc123')}` })
    await press('Save pickup point')
    expect(writes()).toHaveLength(0)
  })

  it('opens an existing point on its pin, and a save that leaves the link alone does not send it', async () => {
    await renderSheet(point())

    expect(screen.getByTestId('pin')).toHaveTextContent('47.05165,8.30754')
    expect(screen.getByLabelText('Google Maps link')).toHaveValue(linkAt(47.05165, 8.30754))
    await type('Address', ' 2')
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).not.toHaveProperty('mapsLink')
  })

  it('a new link on an existing point is sent with the save', async () => {
    await renderSheet(point())
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste(newLink)
    await press('Save pickup point')

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', body: { mapsLink: newLink } })
  })

  it('the API refusing the link (422 maps-link-unreadable) shows at the link field and keeps the typed text', async () => {
    await renderSheet(point())
    await userEvent.clear(screen.getByLabelText('Google Maps link'))
    await paste('https://maps.app.goo.gl/abc123')
    answer = call => (call.path.includes('/maps-link') ? Response.json({ latitude: 47.1, longitude: 8.2 }) : call.method === 'PATCH' ? problem(422, 'maps-link-unreadable') : undefined)
    await press('Save pickup point')

    expect(await screen.findByText(/This Google Maps link could not be read/)).toBeInTheDocument()
    expect(screen.getByLabelText('Google Maps link')).toBeInvalid()
    expect(screen.queryByText(/could not be saved|Something went wrong/i)).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the link field and its help in German', async () => {
    await renderSheet(undefined, 'de')

    expect(await screen.findByLabelText('Google-Maps-Link')).toBeInTheDocument()
    expect(screen.getByText(/Fügen Sie einen Link aus Google Maps ein/)).toBeInTheDocument()
  })

  it('shows the hours help line in German with Swiss spelling', async () => {
    await renderSheet(undefined, 'de')

    expect(await screen.findByText(/Die Zeiten sind Schweizer Ortszeit/)).toBeInTheDocument()
  })
})
