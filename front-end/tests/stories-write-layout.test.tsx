import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { groupId, renderStoryEditor, serveStory, setUpHarness, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => false }))

beforeEach(async () => {
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

describe('[S8-UI-02] the Write screen layout', () => {
  it('puts the cover card and the story card in two columns from lg, cover first in the DOM so phones stack it on top', async () => {
    serveStory(storyGroupDetail({ en: storyVersion('en') }))
    renderStoryEditor(`/store/content/articles/${groupId}`)
    const cover = await screen.findByRole('region', { name: 'Cover and title' }, { timeout: 8000 })
    const body = screen.getByRole('region', { name: 'Story' })
    const columns = screen.getByTestId('write-columns')

    expect(columns).toHaveClass('lg:grid-cols-12')
    expect(columns.children).toHaveLength(2)
    expect(columns.children[0]).toContainElement(cover)
    expect(columns.children[0]).toHaveClass('lg:col-span-5')
    expect(columns.children[1]).toContainElement(body)
    expect(columns.children[1]).toHaveClass('lg:col-span-7')
    // Each column scrolls with the page: nothing is sticky or has its own scroll area.
    expect(columns.className).not.toMatch(/sticky|overflow/)
  })
})
