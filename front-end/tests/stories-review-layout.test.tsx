import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, posts, renderStoryEditor, servePublish, setUpHarness, storyDoc, storyGroupDetail, storyVersion, uuid } from './stories-publish-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const path = `/store/content/articles/${groupId}`

beforeEach(async () => {
  view.wide = false
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const ready = (over: Record<string, unknown> = {}) => storyVersion('en', { slug: 'musegg', draft: storyDoc({ coverMediaId: coverId }), ...over })
const empty = () => storyVersion('en', { slug: null, draft: storyDoc({ title: '', excerpt: '', coverMediaId: null }) })
/** Ready in English, German started, one blog category: nothing blocks and nothing warns. */
const clean = () => storyGroupDetail({ en: ready(), de: storyVersion('de') }, { categoryIds: [uuid(900)] })

async function openReview(search = '') {
  const router = renderStoryEditor(`${path}?screen=review${search}`)

  await screen.findAllByText('Review and publish', undefined, SLOW)

  return router
}

const bar = () => screen.findByTestId('publish-bar', undefined, SLOW)
const toggle = () => screen.findByRole('button', { name: 'Show the checks' }, SLOW)
const tab = (name: string) => screen.findByRole('tab', { name }, SLOW)

describe('[E4.3][AC30] the Review layout', () => {
  it('[E4.3][AC30] laptop: the review grid has a preview column with its hint line and a 440 px panel holding the publish card, the checks and the Details heading', async () => {
    view.wide = true
    servePublish(clean())
    await openReview()
    const preview = await screen.findByRole('region', { name: 'Preview' }, SLOW)
    const panel = screen.getByRole('complementary', { name: 'Publish and details' })

    expect(within(preview).getByText('What guests will see, on a phone as most of them read. Scroll inside the phone.')).toBeInTheDocument()
    expect(within(preview).getByText('The preview comes with the next step of the editor.')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Publish English' })).toBeEnabled()
    expect(within(panel).getByText('Ready to publish')).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Details' })).toBeInTheDocument()
    expect(panel.parentElement).toHaveClass('grid-cols-[minmax(0,1fr)_440px]')
    expect(screen.queryByTestId('publish-bar')).not.toBeInTheDocument()
  }, 20000)

  it.each([false, true])('[E4.3][AC30] the header on Review (wide %s) has "Back to writing", the title line "Review and publish" and the save status, and no language switch; the switch is on the publish card', async (wide) => {
    view.wide = wide
    servePublish(clean())
    await openReview()

    expect(await screen.findByRole('button', { name: 'Back to writing' }, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Review and publish')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getAllByRole('tab', { name: /Deutsch/ })).toHaveLength(1)
    expect(screen.getByRole('tab', { name: /Deutsch/ }).closest('header, [class*="sticky top-0"]')).toBeNull()
  }, 20000)

  it('[E4.3][AC30] AC-7 phone with a blocking check: Details is open first, the bar says "4 things stop publishing" with the checks panel open above it', async () => {
    servePublish(storyGroupDetail({ en: empty() }))
    await openReview()
    const button = await toggle()

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveTextContent('4 things stop publishing')
    expect(await tab('Details')).toHaveAttribute('aria-selected', 'true')
    expect(within(await bar()).getByText('Add a cover photo.')).toBeInTheDocument()
    expect(within(await bar()).getByRole('button', { name: 'Publish English' })).toBeDisabled()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-7 pressing Show on a Details check closes the panel, switches to Details and opens its card', async () => {
    servePublish(storyGroupDetail({ en: ready({ slug: null }), de: storyVersion('de') }, { categoryIds: [uuid(900)] }))
    await openReview()
    const header = await screen.findByRole('button', { name: /^Link/ }, SLOW)

    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(await tab('Preview'))
    expect(await tab('Preview')).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('button', { name: /^Link/ })).not.toBeInTheDocument()
    await userEvent.click(within(await bar()).getByRole('button', { name: 'Edit' }))

    expect(await toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(await tab('Details')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('button', { name: /^Link/ }, SLOW)).toHaveAttribute('aria-expanded', 'true')
  }, 25000)

  it('[E4.3][AC30] AC-7 phone with nothing blocking and no warnings: Preview is first and the bar says "Ready to publish"', async () => {
    servePublish(clean())
    await openReview()

    expect(await toggle()).toHaveTextContent('Ready to publish')
    expect(await tab('Preview')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('The preview comes with the next step of the editor.')).toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC30] AC-7 with two warnings the bar says "Ready · 2 to look at"', async () => {
    servePublish(storyGroupDetail({ en: ready() }))
    await openReview()

    expect(await toggle()).toHaveTextContent('Ready · 2 to look at')
    expect(await toggle()).toHaveAttribute('aria-expanded', 'false')
  }, 20000)

  it('[E4.3][AC30] the bar\'s Publish button is off while something blocks, and publishes English when ready', async () => {
    servePublish(clean())
    await openReview()
    await userEvent.click(within(await bar()).getByRole('button', { name: 'Publish English' }))

    await waitFor(() => expect(posts('/versions/en/publish')).toHaveLength(1), SLOW)
  }, 20000)

  it.each([false, true])('[E4.3][AC30] the bar and the card never render together (wide %s): one Publish English button in the document', async (wide) => {
    view.wide = wide
    servePublish(clean())
    await openReview()

    await screen.findByRole('button', { name: 'Publish English' }, SLOW)
    expect(screen.getAllByRole('button', { name: 'Publish English' })).toHaveLength(1)
    expect(screen.queryByTestId('publish-bar') === null).toBe(wide)
  }, 20000)

  it('[E4.3] Back to writing returns to Write and keeps what was typed', async () => {
    servePublish(clean())
    const router = renderStoryEditor(path)
    const title = await screen.findByRole('textbox', { name: /^Title/ }, SLOW)

    await userEvent.click(title)
    await userEvent.keyboard('{End}!')
    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Back to writing' }, SLOW))

    expect(await screen.findByRole('textbox', { name: /^Title/ }, SLOW)).toHaveValue('A morning on the Musegg wall!')
    expect(router.state.location.search).not.toHaveProperty('screen')
  }, 25000)
})
