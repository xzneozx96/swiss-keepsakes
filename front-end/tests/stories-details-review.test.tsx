import { pinListSchema } from '@sk/api-contract'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, groupPatches, patches, renderStoryEditor, serveDetails, setUpHarness, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-details-harness'
import { pinItem } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`
const today = new Date().toISOString().slice(0, 10)
const PLACE_CHECK = 'Choose the place this review is about.'
const DATE_CHECK = 'Add the day the facts were checked.'

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const version = (language: 'en' | 'de', checkedOn?: string | null) => storyVersion(language, { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId, ...(checkedOn !== undefined && { checkedOn }) }) })
const group = (over: Record<string, unknown> = {}, checkedOn?: string | null) => storyGroupDetail({ en: version('en', checkedOn), de: version('de', checkedOn) }, { categoryIds: [uuid(900)], ...over })

/** `serveDetails` plus the pin list the picker and the card read. */
const serve = (initial: ReturnType<typeof group>) => serveDetails(initial, call => (call.method === 'GET' && call.path.endsWith('/pins') ? Response.json(pinListSchema.parse({ items: [pinItem(1), pinItem(2, { status: 'draft' })] })) : undefined))

async function openReview(search = '') {
  renderStoryEditor(`${path}?screen=review${search}`)
  await screen.findAllByText('Review and publish', undefined, SLOW)
}

const header = () => screen.findByRole('button', { name: /^Editorial review/ }, SLOW)

async function openCard() {
  const button = await header()

  if (button.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(button)

  return button
}

const toggle = () => screen.findByRole('switch', { name: 'This is an editorial review' }, SLOW)
const dateField = () => screen.findByLabelText('Facts checked on', undefined, SLOW)

async function choosePin(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: /^Choose the place|^Change place/ }, SLOW))
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }, SLOW))
  await userEvent.click(screen.getByRole('button', { name: 'Use this place' }))
}

describe('[E4.3][AC30] the Editorial review card', () => {
  it('[E4.3][AC30] AC-4 a plain story shows "No, a story"; the card has only the switch, Place reviewed and Facts checked on, and no Checked by', async () => {
    serve(group())
    await openReview()
    expect(within(await header()).getByText('No, a story')).toBeInTheDocument()
    await openCard()
    expect(await toggle()).not.toBeChecked()
    expect(screen.queryByText(/Checked by/i)).toBeNull()
    expect(screen.queryByLabelText(/Checked by/i)).toBeNull()
  }, 30000)

  it('[E4.3][AC30] AC-4 switching on with no place shows "Stops publishing" and both checks, and sends no PATCH', async () => {
    serve(group())
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    expect(await within(await header()).findByLabelText('Stops publishing')).toBeInTheDocument()
    expect(screen.getAllByText(PLACE_CHECK).length).toBeGreaterThan(0)
    expect(screen.getAllByText(DATE_CHECK).length).toBeGreaterThan(0)
    // The group save waits 400 ms for quick clicks; nothing may go out after it either.
    await new Promise(resolve => setTimeout(resolve, 1200))
    expect(groupPatches()).toHaveLength(0)
  }, 30000)

  it('[E4.3][AC30] CORRECTNESS-E43-5 a review switched on with no place counts as unsaved: Back asks before it drops the switch', async () => {
    serve(group())
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    // The group save has run by now (it held the switch back and sent nothing): the engine reads saved.
    await new Promise(resolve => setTimeout(resolve, 1200))
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Back to Stories' }, SLOW))
    expect(await screen.findByText('Leave without saving?', undefined, SLOW)).toBeInTheDocument()
  }, 40000)

  it('[E4.3][AC30] AC-4 choosing a pin sends ONE group save with kind, subject place and the places plus the pin, and the story reloads as a review', async () => {
    serve(group({ placeIds: [uuid(2)] }, '2026-10-12'))
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    await choosePin('Pin 1')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]).toMatchObject({ ifMatch: '1', body: { kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(2), uuid(1)] } })
    expect(Object.keys(groupPatches()[0]!.body as object).sort()).toEqual(['kind', 'placeIds', 'subjectPlaceId'])
    await waitFor(() => expect(screen.queryByLabelText('Stops publishing')).toBeNull(), SLOW)
    expect(screen.queryByText(PLACE_CHECK)).toBeNull()
    expect(screen.queryByText(DATE_CHECK)).toBeNull()
    expect(await toggle()).toBeChecked()
  }, 40000)

  it('[E4.3][AC30] CORRECTNESS-E43-1 choosing a place when the story has 50 places is refused with the Places sheet message and sends nothing', async () => {
    serve(group({ placeIds: Array.from({ length: 50 }, (_, i) => uuid(101 + i)) }))
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    await choosePin('Pin 1')
    expect(await screen.findByText('50 chosen, the most a story can have. Remove one to add another.')).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 1200))
    expect(groupPatches()).toHaveLength(0)
  }, 40000)

  it('[E4.3][AC30] AC-4 a pin already in the places is not added twice', async () => {
    serve(group({ placeIds: [uuid(1)] }))
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    await choosePin('Pin 1')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    // The places already hold the pin, so the list is not part of the change.
    expect(groupPatches()[0]!.body).toEqual({ kind: 'editorial_review', subjectPlaceId: uuid(1) })
  }, 40000)

  it('[E4.3][AC30] AC-4 switching off sends kind story with a null subject place in one save, and the card says "No, a story"', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }, '2026-10-12'))
    await openReview()
    await openCard()
    await userEvent.click(await toggle())
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ kind: 'story', subjectPlaceId: null })
    await userEvent.click(await header())
    expect(within(await header()).getByText('No, a story')).toBeInTheDocument()
    expect(screen.queryByText(DATE_CHECK)).toBeNull()
  }, 40000)

  it('[E4.3][AC30] AC-4 a date in the future is refused with "Choose today or an earlier day." and is not saved; today is accepted', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }))
    await openReview()
    await openCard()
    const field = await dateField()

    await userEvent.type(field, '2999-01-01')
    expect(await screen.findByText('Choose today or an earlier day.')).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 2200))
    expect(patches().filter(call => call.path.includes('/versions/'))).toHaveLength(0)
    await userEvent.clear(field)
    await userEvent.type(field, today)
    await waitFor(() => expect(patches().filter(call => call.path.includes('/versions/'))).toHaveLength(1), SLOW)
    expect(patches().at(-1)!.body).toMatchObject({ draft: { checkedOn: today } })
    expect(screen.queryByText('Choose today or an earlier day.')).toBeNull()
  }, 40000)

  it('[E4.3][AC30] AC-4 choosing a place and a date removes both checks, and clearing the date brings its check back', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }, null))
    await openReview()
    await openCard()
    expect(screen.getAllByText(DATE_CHECK).length).toBeGreaterThan(0)
    const field = await dateField()

    await userEvent.type(field, '2026-10-12')
    await waitFor(() => expect(screen.queryByText(DATE_CHECK)).toBeNull(), SLOW)
    await userEvent.clear(field)
    expect((await screen.findAllByText(DATE_CHECK)).length).toBeGreaterThan(0)
  }, 40000)

  it('[E4.3][AC30] the closed summary reads "{place} · checked {date}", "{place} · no check date" and "No place yet · no check date"', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }, '2026-10-12'))
    await openReview()
    expect(await within(await header()).findByText(/^Pin 1 · checked .*12 Oct/)).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] the closed summary of a review with no check date, and of a review with no place', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }, null))
    await openReview()
    // A review with no check date is blocked, so its card opens by itself; the summary shows when it is closed.
    await userEvent.click(await header())
    expect(await within(await header()).findByText('Pin 1 · no check date')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] a review with no place says "No place yet · no check date"', async () => {
    serve(group({ kind: 'editorial_review', subjectPlaceId: null }, null))
    await openReview()
    await userEvent.click(await header())
    expect(await within(await header()).findByText('No place yet · no check date')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC30] AC-4 the German version shows its own date, and changing it leaves the English version untouched', async () => {
    const server = serve(group({ kind: 'editorial_review', subjectPlaceId: uuid(1), placeIds: [uuid(1)] }, '2026-10-12'))

    await openReview('&lang=de')
    await openCard()
    const field = await dateField()

    expect(field).toHaveValue('2026-10-12')
    await userEvent.clear(field)
    await userEvent.type(field, '2026-10-13')
    await waitFor(() => expect(patches().filter(call => call.path.endsWith('/versions/de'))).toHaveLength(1), SLOW)
    expect(patches().filter(call => call.path.endsWith('/versions/en'))).toHaveLength(0)
    const english = server.group.versions.en as { draft: { checkedOn: string } }

    expect(english.draft.checkedOn).toBe('2026-10-12')
  }, 40000)
})
