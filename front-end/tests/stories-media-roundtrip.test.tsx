import type { Editor } from '@tiptap/react'

import { storyDraftSchema } from '@sk/api-contract'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, patches, renderStoryEditor, serveStory, setUpHarness, state, storyDoc, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view renders: its bar starts with the "+" that opens the Insert sheet.
const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }
const path = `/store/content/articles/${groupId}`
const PIN = '0198a000-0000-7000-8000-000000000010'
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const body = (...content: unknown[]) => ({ type: 'doc', content })

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
})

beforeEach(async () => {
  view.wide = false
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

const root = () => screen.findByRole('textbox', { name: 'Story text' }, SLOW)
const editorOf = (element: HTMLElement) => (element as unknown as { editor: Editor }).editor
const types = (element: HTMLElement) => (editorOf(element).getJSON().content ?? []).map(node => node.type)

describe('[E4.3][AC45] media and pin link round trip', () => {
  it('[E4.3][AC45] AC-1 a photo between two paragraphs survives a save and a reload', { timeout: 20_000 }, async () => {
    const server = serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ coverMediaId: coverId, body: body(para(text('first')), para(text('second'))) }) }) }))

    renderStoryEditor(path)
    const first = await root()

    act(() => void editorOf(first).commands.setTextSelection(2))
    await userEvent.click(screen.getByRole('button', { name: 'Insert a photo, video or recording' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }, SLOW))
    await userEvent.click(screen.getByRole('button', { name: 'Insert photo' }))
    expect(types(first)).toEqual(['paragraph', 'image', 'paragraph'])
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    const sent = (patches()[0]!.body as { draft: unknown }).draft

    expect(storyDraftSchema.safeParse(sent).success).toBe(true)
    const saved = (sent as { body: { content: { type: string, attrs?: { mediaId: string } }[] } }).body.content

    expect(saved.map(node => node.type)).toEqual(['paragraph', 'image', 'paragraph'])
    expect(saved[1]!.attrs!.mediaId).toBe(coverId)

    // Reload from what the server now holds.
    cleanup()
    state.demo.queryClient.clear()
    renderStoryEditor(path)
    const again = await root()

    await waitFor(() => expect(types(again)).toEqual(['paragraph', 'image', 'paragraph']))
    expect((server.group.versions.en as { rowVersion: number }).rowVersion).toBe(4)
    expect(patches()).toHaveLength(1)
  })

  it('[E4.3][AC45] a body with a pin link and a video round-trips unchanged and sends no PATCH on open', async () => {
    const stored = body(para(text('See '), text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }])), { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'Bells', caption: '' } }, para(text('end')))

    serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ body: stored }) }) }))
    renderStoryEditor(path)
    const element = await root()

    await screen.findByRole('group', { name: 'video' }, SLOW)
    await act(() => new Promise<void>(resolve => setTimeout(resolve, 2300)))
    expect(patches()).toHaveLength(0)
    expect(editorOf(element).getJSON().content!.map(node => node.type)).toEqual(['paragraph', 'video', 'paragraph'])
    expect(JSON.stringify(editorOf(element).getJSON())).toContain(PIN)
  })
})
