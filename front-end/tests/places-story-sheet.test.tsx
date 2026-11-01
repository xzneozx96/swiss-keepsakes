import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, renderInRouter, storeId, uuid } from './places-support'
import { resetFakeMaps } from './support/fake-maplibre'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

vi.mock('@/features/places/components/map-picker', () => ({ MapPicker: () => null }))
vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const storyId = uuid(77)
let api: ReturnType<typeof installApi>

beforeEach(() => {
  resetFakeMaps()
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  api = installApi()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

const text = { title: { en: 'Chapel Bridge', de: 'Kapellbrücke' }, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }
const draft = (over = {}) => pinOf({ id: uuid(10), latitude: 47.05, longitude: 8.3, mainStoryGroupId: storyId, draft: text, ...over })

async function openReview(title: Record<string, string>, publishedLanguages: ('en' | 'de')[] = ['en', 'de']) {
  api.stories = [{ groupId: storyId, kind: 'story', title, languages: { en: publishedLanguages.includes('en') ? 'published' : 'none', de: publishedLanguages.includes('de') ? 'published' : 'none' }, publishedLanguages }]
  const pin = draft()

  api.pin = pin
  await renderInRouter(<PlaceEditorScreen placeId={pin.id} start={undefined} />, { path: `/store/content/places/${pin.id}` })
  await userEvent.click((await screen.findAllByRole('button', { name: /Review and publish/ })).at(0)!)

  return await screen.findByRole('region', { name: 'The place on the guest map' }, { timeout: 15000 })
}

const versionPath = (language: string) => `/story-groups/${storyId}/versions/${language}`
function version(over: Record<string, unknown> = {}) {
  return {
    status: 'published',
    title: 'A morning on the Musegg wall',
    cover: null,
    media: [],
    updatedAt: '2026-10-27T10:00:00.000Z',
    body: { type: 'doc', content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'The wall' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'The Musegg wall runs along the hill.' }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nine towers' }] }] }] },
    ] },
    ...over,
  }
}

/** The text the API answers for each language; a language not in `texts` is a 404 problem. */
function answerWith(texts: Record<string, unknown>) {
  api.answer = (call) => {
    if (!call.path.includes('/versions/'))
      return undefined
    const text = texts[call.path.slice(call.path.lastIndexOf('/') + 1)]

    return text ? Response.json(text) : Response.json({ type: 'not-found', title: 'Not found', status: 404 }, { status: 404, headers: { 'Content-Type': 'application/problem+json' } })
  }
}

describe('[E4.2][AC68] the review opens the story in a sheet inside the phone', () => {
  it('opens the real text of the linked story in a bottom sheet over the phone, and the editor stays on its page', async () => {
    answerWith({ en: version() })
    const phone = await openReview({ en: 'A morning on the Musegg wall', de: 'Ein Morgen auf der Museggmauer' })

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'A morning on the Musegg wall' })

    expect(phone).toContainElement(sheet)
    expect(await within(sheet).findByText('The Musegg wall runs along the hill.')).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { level: 3, name: 'The wall' })).toBeInTheDocument()
    expect(within(sheet).getByRole('listitem')).toHaveTextContent('Nine towers')
    expect(within(sheet).queryByRole('status')).toBeNull()
    expect(api.calls.some(call => call.method === 'GET' && call.path === `/api/store/${storeId}${versionPath('en')}`)).toBe(true)
    expect(screen.getByRole('region', { name: 'The place on the guest map' })).toBeInTheDocument()
  })

  it('reads the story in the previewed language', async () => {
    answerWith({ en: version(), de: version({ title: 'Ein Morgen auf der Museggmauer', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Die Museggmauer zieht sich den Hügel entlang.' }] }] } }) })
    const phone = await openReview({ en: 'A morning on the Musegg wall', de: 'Ein Morgen auf der Museggmauer' })

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))
    await userEvent.click(await within(phone).findByRole('button', { name: 'Geschichte lesen' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'Ein Morgen auf der Museggmauer' })

    expect(await within(sheet).findByText('Die Museggmauer zieht sich den Hügel entlang.')).toBeInTheDocument()
    expect(sheet.querySelector('[lang="de"]')).not.toBeNull()
    expect(api.calls.some(call => call.path === `/api/store/${storeId}${versionPath('de')}`)).toBe(true)
  })

  it('shows a draft version with a note that guests do not see it yet', async () => {
    answerWith({ de: version({ status: 'draft', title: 'Ein Tag auf dem Pilatus' }) })
    const phone = await openReview({ de: 'Ein Tag auf dem Pilatus' }, ['de'])

    await userEvent.click(screen.getByRole('tab', { name: /German/ }))
    await userEvent.click(await within(phone).findByRole('button', { name: 'Geschichte lesen' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'Ein Tag auf dem Pilatus' })

    expect(await within(sheet).findByText('Diese Version ist ein Entwurf. Gäste sehen sie noch nicht.')).toBeInTheDocument()
  })

  it('says there is no version in the language when the API answers 404, and still shows the title', async () => {
    answerWith({})
    const phone = await openReview({ en: 'A story only the API knows' })

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    const sheet = await screen.findByRole('dialog', { name: 'A story only the API knows' })

    expect(await within(sheet).findByText('There is no English version of this story yet.')).toBeInTheDocument()
  })

  it('says the text could not be loaded when the read fails otherwise', async () => {
    api.answer = call => (call.path.includes('/versions/') ? Response.json({ type: 'about:blank', title: 'Unavailable', status: 503 }, { status: 503, headers: { 'Content-Type': 'application/problem+json' } }) : undefined)
    const phone = await openReview({ en: 'A story only the API knows' })

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))

    expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toHaveTextContent('The story text could not be loaded.')
  })

  it('closes with the Close button and with Escape, and leaves the card where it was', async () => {
    answerWith({ en: version() })
    const phone = await openReview({ en: 'A morning on the Musegg wall' }, ['en'])

    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    await userEvent.click((await within(await screen.findByRole('dialog')).findAllByRole('button', { name: 'Close' })).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(await within(phone).findByRole('button', { name: 'Read the story' }, { timeout: 10000 }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await within(phone).findByRole('button', { name: 'Read the story' })).toBeInTheDocument()
  })
})
