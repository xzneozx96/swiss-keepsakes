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
const advice = () => screen.queryAllByText(/see the link|den Link nicht/).map(line => line.textContent)

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
    expect(offered()).toEqual(['Lion Monument'])
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

    expect(await screen.findAllByText(/see the link/)).toHaveLength(2)
    expect(advice()).toEqual([
      'The English version of this story is still a draft, so guests reading English won’t see the link.',
      'This story has no German version yet, so guests reading German won’t see the link.',
    ])
  })

  it('says nothing about a language where the story is live', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'draft')]
    await openStoryStep(uuid(30))

    await waitFor(() => expect(advice()).toEqual(['The German version of this story is still a draft, so guests reading German won’t see the link.']))
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
      'Die englische Fassung dieser Geschichte ist noch ein Entwurf, daher sehen Gäste auf Englisch den Link nicht.',
      'Diese Geschichte hat noch keine deutsche Fassung, daher sehen Gäste auf Deutsch den Link nicht.',
    ]))
  })

  it('reads the options of the store it edits', async () => {
    api.stories = [story(30, 'The bridge', 'published', 'none')]
    await openStoryStep()

    await waitFor(() => expect(api.calls.map(call => call.path)).toContain(`/api/store/${storeId}/pins/story-options`))
    expect(within(screen.getAllByTestId('place-block')[0]!).getByText('Story behind this place')).toBeInTheDocument()
  })
})
