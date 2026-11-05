import type { FakeApi } from './places-support'

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlaceEditorScreen } from '@/features/places/components/place-editor-screen'
import { installApi, pinOf, renderInRouter, storeId, uuid } from './places-support'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.hoisted(() => {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
})

vi.mock('@/features/places/components/map-picker', async () => (await import('./support/map-picker-stub')).mapPickerStub)
vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

type State = 'none' | 'draft' | 'published'

let api: FakeApi

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.HTMLElement.prototype.scrollTo = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  api = installApi()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

function story(n: number, title: string, en: State, de: State) {
  return {
    groupId: uuid(n),
    kind: 'story',
    title: { en: title },
    languages: { en, de },
    publishedLanguages: [en, de].flatMap((state, index) => (state === 'published' ? [(['en', 'de'] as const)[index]!] : [])),
  }
}

async function openStoryStep(mainStoryGroupId: string | null = null, language: 'en' | 'de' = 'en') {
  api.pin = pinOf({ id: uuid(10), mainStoryGroupId })
  await renderInRouter(<PlaceEditorScreen placeId={uuid(10)} start={undefined} />, { path: `/store/content/places/${uuid(10)}`, language })
  await screen.findByRole('heading', { name: /(Place on the map|Ort auf der Karte)$/, level: 2 })
  await userEvent.click(screen.getAllByRole('button', { name: /(Story and link|Geschichte und Link)/ }).at(0)!)
  await screen.findByRole('heading', { name: /(Story and link|Geschichte und Link)$/, level: 2 })
}

const field = (name = /Story behind this place/) => screen.getByRole('button', { name })
const shown = () => field().closest('.autocomplete')!.querySelector('.autocomplete__value')
const offered = () => screen.getAllByRole('option').map(option => option.textContent)
const advice = () => screen.queryAllByText(/see the story|die Geschichte nicht/).map(line => line.textContent)

describe('[E4.2][AC68] the story select of step 5', () => {
  it('lists only the stories with a live language, after a None row, in a searchable list', async () => {
    api.stories = [
      story(30, 'The bridge', 'published', 'none'),
      story(31, 'Only a draft', 'draft', 'none'),
      story(32, 'Lion Monument', 'draft', 'published'),
    ]
    await openStoryStep()
    await waitFor(() => expect(field()).toBeEnabled())
    await userEvent.click(field())

    expect(offered()).toEqual(['None', 'The bridge', 'Lion Monument'])
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Story behind this place' }), 'lion')
    // The None row stays: it is not a match, it clears the choice.
    await waitFor(() => expect(offered()).toEqual(['None', 'Lion Monument']))
  })

  it('links the story that is chosen, and None takes the link away', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'published')]
    await openStoryStep()
    await waitFor(() => expect(field()).toBeEnabled())

    await userEvent.click(field())
    await userEvent.click(screen.getByRole('option', { name: 'The bridge' }))
    expect(shown()).toHaveTextContent('The bridge')
    expect(advice()).toEqual([])

    await userEvent.click(field())
    await userEvent.click(screen.getByRole('option', { name: 'None' }))
    expect(shown()).toHaveTextContent('None')
  })

  it('keeps the linked story in the list when it no longer has a live language, marked not published', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'none'), story(31, 'Only a draft', 'draft', 'draft')]
    await openStoryStep(uuid(31))
    await waitFor(() => expect(shown()).toHaveTextContent('Only a draft (not published)'))

    await userEvent.click(field())
    expect(offered()).toEqual(['None', 'The bridge', 'Only a draft (not published)'])
  })

  it('says why each language shows no link: no version for one, a draft for the other', async () => {
    api.stories = [story(30, 'The bridge', 'draft', 'none')]
    await openStoryStep(uuid(30))

    expect(await screen.findAllByText(/see the story/)).toHaveLength(2)
    expect(advice()).toEqual([
      'The English version is still a draft: guests reading English won’t see the story.',
      'No German version yet: guests reading German won’t see the story.',
    ])
  })

  it('says nothing about a language where the story is live', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'draft')]
    await openStoryStep(uuid(30))

    await waitFor(() => expect(advice()).toEqual(['The German version is still a draft: guests reading German won’t see the story.']))
  })

  it('says nothing when both languages are live, or when no story is linked', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'published')]
    await openStoryStep(uuid(30))
    await waitFor(() => expect(shown()).toHaveTextContent('The bridge'))

    expect(advice()).toEqual([])
  })

  it('says it in German, in the formal form', async () => {
    api.stories = [story(30, 'Die Brücke', 'draft', 'none')]
    await openStoryStep(uuid(30), 'de')

    await waitFor(() => expect(advice()).toEqual([
      'Die englische Fassung ist noch ein Entwurf: Gäste auf Englisch sehen die Geschichte nicht.',
      'Noch keine deutsche Fassung: Gäste auf Deutsch sehen die Geschichte nicht.',
    ]))
  })

  it('reads the options of the store it edits', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'none')]
    await openStoryStep()

    await waitFor(() => expect(api.calls.map(call => call.path.split('?')[0])).toContain(`/api/store/${storeId}/pins/story-options`))
    expect(within(screen.getAllByTestId('place-block')[0]!).getByText('Story behind this place')).toBeInTheDocument()
  })
})

describe('[ADR-033] the story picker searches on the server as you type', () => {
  const optionReads = () => api.calls.filter(call => call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/pins/story-options`)).map(call => new URL(call.path, 'http://x').searchParams)

  it('asks for the first 10 matches, and sends the search once, a moment after the last key', async () => {
    api.stories = Array.from({ length: 14 }, (_, index) => story(40 + index, `Story ${index + 1}`, 'published', 'none'))
    await openStoryStep()
    await waitFor(() => expect(field()).toBeEnabled())
    await userEvent.click(field())

    expect(Object.fromEntries(optionReads().at(-1)!)).toEqual({ limit: '10' })
    expect(offered()).toHaveLength(11)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Story behind this place' }), 'Story 12')

    await waitFor(() => expect(offered()).toEqual(['None', 'Story 12']))
    expect(optionReads().filter(read => read.has('q'))).toHaveLength(1)
    expect(Object.fromEntries(optionReads().at(-1)!)).toEqual({ q: 'Story 12', limit: '10' })
  })

  it('names the linked story even when it is not among the matches, because the server always sends it', async () => {
    api.stories = [...Array.from({ length: 12 }, (_, index) => story(40 + index, `Story ${index + 1}`, 'published', 'none')), story(60, 'Chosen one', 'draft', 'none')]
    await openStoryStep(uuid(60))

    await waitFor(() => expect(shown()).toHaveTextContent('Chosen one (not published)'))
    expect(Object.fromEntries(optionReads().at(-1)!)).toEqual({ groupId: uuid(60), limit: '10' })
  })
})
