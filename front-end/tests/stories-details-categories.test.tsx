import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { categoryItem, coverId, groupId, groupPatches, problem, renderStoryEditor, serveDetails, setUpHarness, storeId, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-details-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`
const history = uuid(901)
const oldTown = uuid(902)
const tips = uuid(903)
const categories = [
  categoryItem(history, 'Swiss history', 'Schweizer Geschichte', null, 0),
  categoryItem(oldTown, 'Old Town', null, history, 0),
  categoryItem(tips, 'Practical tips', 'Praktische Tipps', null, 1),
]

beforeEach(async () => {
  view.wide = true
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const version = (language: 'en' | 'de') => storyVersion(language, { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }) })

function serve(categoryIds: string[], list = categories, extra?: Parameters<typeof serveDetails>[1]) {
  const server = serveDetails(storyGroupDetail({ en: version('en'), de: version('de') }, { categoryIds }), extra)

  server.categories = list

  return server
}

async function openCard(search = '') {
  renderStoryEditor(`${path}?screen=review${search}`)
  await screen.findAllByText('Review and publish', undefined, SLOW)
  const header = await screen.findByRole('button', { name: /^Blog categories/ }, SLOW)

  if (header.getAttribute('aria-expanded') !== 'true')
    await userEvent.click(header)

  return header
}

const row = (name: RegExp | string) => screen.findByRole('button', { name }, SLOW)
const chosenList = () => screen.getByRole('list', { name: 'Chosen categories' })
const openSheet = async () => userEvent.click(await screen.findByRole('button', { name: /^(Choose|Change) categories$/ }, SLOW))
const save = async () => userEvent.click(screen.getByRole('button', { name: 'Save categories' }))

describe('[E4.3][AC87] the Blog categories card and sheet', () => {
  it('[E4.3][AC87] AC-1 tagging with Old Town and Practical tips shows both chips and saves two categories', async () => {
    serve([])
    await openCard()
    await openSheet()
    const list = await screen.findByRole('list', { name: 'Categories to choose from' }, SLOW)

    await waitFor(() => expect(within(list).getAllByRole('button')).toHaveLength(3), SLOW)
    await userEvent.click(await row(/^Old Town/))
    await userEvent.click(await row(/^Practical tips/))
    await save()
    await waitFor(() => expect(chosenList()).toHaveTextContent('Old Town in Swiss history'), SLOW)
    expect(chosenList()).toHaveTextContent('Practical tips')
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ categoryIds: [oldTown, tips] })
    expect(screen.getByRole('button', { name: 'Change categories' })).toBeInTheDocument()
  }, 40000)

  it('[E4.3][AC87] AC-1 a search that matches nothing says No category matches “xyz”.', async () => {
    serve([])
    await openCard()
    await openSheet()
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search categories' }, SLOW), 'xyz')
    expect(await screen.findByText('No category matches “xyz”.')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] the search matches the German name', async () => {
    serve([])
    await openCard()
    await openSheet()
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search categories' }, SLOW), 'Geschichte')
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Practical tips/ })).not.toBeInTheDocument(), SLOW)
    expect(screen.getByRole('button', { name: /^Swiss history/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Old Town/ })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] a parent reached through a sub-category has no chip, a line says so, and its row in the sheet says how to use it instead', async () => {
    serve([oldTown])
    await openCard()
    expect(await screen.findByText('Swiss history is included through Old Town.', undefined, SLOW)).toBeInTheDocument()
    expect(chosenList()).toHaveTextContent('Old Town in Swiss history')
    expect(within(chosenList()).getAllByRole('listitem')).toHaveLength(1)
    await openSheet()
    expect(await screen.findByText('Included through Old Town. Choose to use Swiss history instead', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText('No German name yet')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] AC-2 choosing Swiss history while Old Town is chosen leaves only Swiss history', async () => {
    serve([oldTown])
    await openCard()
    await openSheet()
    await userEvent.click(await row(/^Swiss history/))
    await save()
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ categoryIds: [history] })
  }, 30000)

  it('[E4.3][AC87] removing a chip saves without the sheet', async () => {
    serve([history, tips])
    await openCard()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Practical tips' }, SLOW))
    await waitFor(() => expect(groupPatches()).toHaveLength(1), SLOW)
    expect(groupPatches()[0]!.body).toEqual({ categoryIds: [history] })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] Cancel keeps the saved categories', async () => {
    serve([tips])
    await openCard()
    await openSheet()
    await userEvent.click(await row(/^Swiss history/))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await new Promise(resolve => setTimeout(resolve, 700))
    expect(groupPatches()).toHaveLength(0)
    expect(chosenList()).toHaveTextContent('Practical tips')
  }, 30000)

  it('[E4.3][AC87] AC-3 no category: the summary says None and the help line is the general-category sentence', async () => {
    serve([])
    const header = await openCard()

    expect(screen.getByText('A sub-category includes its parent. Choosing the parent instead puts the story in the general category.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose categories' })).toBeInTheDocument()
    await userEvent.click(header)
    expect(within(header).getByText('None')).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] AC-6 a category chosen in English shows in German with the German name, else the English one', async () => {
    serve([oldTown, tips])
    await openCard('&lang=de')
    await waitFor(() => expect(chosenList()).toHaveTextContent('Old Town in Schweizer Geschichte'), SLOW)
    expect(chosenList()).toHaveTextContent('Praktische Tipps')
  }, 30000)

  it('[E4.3][AC87] a failed category list shows the retry notice and the card does not crash', async () => {
    serve([], categories, call => (call.method === 'GET' && call.path === `/api/store/${storeId}/categories/blog` ? problem(500, 'internal') : undefined))
    await openCard()
    expect(await screen.findByRole('button', { name: 'Try again' }, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Blog categories/ })).toBeInTheDocument()
  }, 30000)

  it('[E4.3][AC87] the sheet refuses a 21st category', async () => {
    const many = Array.from({ length: 21 }, (_, n) => categoryItem(uuid(1000 + n), `Topic ${String(n).padStart(2, '0')}`, null, null, n))

    serve(many.slice(0, 20).map(item => item.id), many)
    await openCard()
    await openSheet()
    const last = await row(/^Topic 20/)

    await userEvent.click(last)
    expect(last).toHaveAttribute('aria-pressed', 'false')
    expect(await row(/^Topic 00/)).toHaveAttribute('aria-pressed', 'true')
  }, 40000)
})
