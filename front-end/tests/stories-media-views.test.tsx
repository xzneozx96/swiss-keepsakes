import type { Editor } from '@tiptap/react'
import type { BodyHandover } from '@/features/stories/hooks/use-story-version-editor'

import { storyBodySchema } from '@sk/api-contract'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import StoryBodyEditor from '@/features/stories/editor/story-body-editor'
import { libraryItem, photoId, problem, renderWithStore, serveExtra, serveMedia, setUpStoryMedia, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const AUDIO = '0198a000-0000-7000-8000-0000000000a1'
const text = (value: string) => ({ type: 'text', text: value })
const para = (value: string) => ({ type: 'paragraph', content: [text(value)] })
const image = (over: Record<string, unknown> = {}) => ({ type: 'image', attrs: { mediaId: photoId, alt: 'Wall', caption: '', ...over } })
const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
})

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
  serveMedia([libraryItem({ name: 'Ready.JPG' }), libraryItem({ id: AUDIO, kind: 'audio', name: 'Bells.mp3', contentType: 'audio/mpeg', variants: [], width: null, height: null })])
})

function setUp(body: never) {
  const onChange = vi.fn()
  const registered: (BodyHandover | null)[] = []
  const rendered = renderWithStore(<StoryBodyEditor body={body} language="en" pins={[]} registerHandover={handover => void registered.push(handover)} storeId={storeId} onChange={onChange} onDirty={() => {}} />)

  return { ...rendered, onChange }
}

const root = () => document.querySelector<HTMLElement>('[aria-multiline="true"]')!
const editorOf = () => (root() as unknown as { editor: Editor }).editor
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))
const types = () => (editorOf().getJSON().content ?? []).map(node => node.type)
const lastBody = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)![0]

describe('[E4.3][AC45] media blocks in the body', () => {
  it('[E4.3][AC45] AC-1 the node view reads the Query and Locale providers (it draws the library photo through useMediaFile)', async () => {
    setUp(doc(para('one'), image()))

    await waitFor(() => expect(root().querySelector('img')).toHaveAttribute('src', 'https://storage.test/media/s/p/w640.webp'))
    expect(screen.getByRole('group', { name: 'photo' })).toBeInTheDocument()
  })

  it('[E4.3][AC45] typing in the caption sets the node\'s caption attribute, the hand-over carries it, and Backspace in the field keeps the block and the text selection', async () => {
    const { onChange } = setUp(doc(para('one'), image()))
    const caption = await screen.findByRole('textbox', { name: 'Caption' })

    act(() => void editorOf().commands.setTextSelection(2))
    await userEvent.type(caption, 'Dawn')
    expect(editorOf().getJSON().content![1]!.attrs!.caption).toBe('Dawn')
    await userEvent.type(caption, '{Backspace}')
    expect(types()).toEqual(['paragraph', 'image'])
    expect(editorOf().getJSON().content![1]!.attrs!.caption).toBe('Daw')
    expect(editorOf().state.selection.from).toBe(2)
    await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1500 })
    await wait(400)
    expect(lastBody(onChange).content[1].attrs.caption).toBe('Daw')
  })

  it('[E4.3][AC45] an image takes its alt from the field and the cleaned body keeps mediaId, alt and caption only', async () => {
    const { onChange } = setUp(doc(para('one'), image({ alt: '' })))

    await userEvent.type(await screen.findByRole('textbox', { name: 'Description' }), 'The wall')
    await waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1500 })
    await wait(400)
    const body = lastBody(onChange)

    expect(body.content[1]).toEqual({ type: 'image', attrs: { mediaId: photoId, alt: 'The wall', caption: '' } })
    expect(storyBodySchema.safeParse(body).success).toBe(true)
  })

  it('[E4.3][AC45] Move down swaps the block with the next paragraph, Remove deletes it, both are labelled "Move photo down" and "Remove photo"', async () => {
    setUp(doc(image(), para('after')))

    expect(screen.getByRole('button', { name: 'Move photo up' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move photo down' }))
    expect(types()).toEqual(['paragraph', 'image'])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Move photo down' })).toBeDisabled())
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(types()).toEqual(['paragraph'])
  })

  it('[E4.3][AC45] a retired library file shows the unavailable text and Remove still works', async () => {
    serveMedia([libraryItem({ status: 'retired' })])
    setUp(doc(para('one'), image()))

    expect(await screen.findByText('This file is not available. Remove the block or choose another file.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(types()).toEqual(['paragraph'])
  })

  it('[E4.3][AC45] a file that is missing (404) shows the unavailable text and does not crash the editor', async () => {
    serveExtra(call => (call.path === `/api/store/${storeId}/media/${photoId}` ? problem(404, 'not-found') : undefined))
    setUp(doc(para('one'), image()))

    expect(await screen.findByText('This file is not available. Remove the block or choose another file.')).toBeInTheDocument()
    expect(root()).toBeInTheDocument()
  })

  it('[E4.3][AC45] a video block shows the poster and a title field, a recording shows its title and file name', async () => {
    setUp(doc(para('one'), { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'Bells', caption: '' } }, { type: 'audio', attrs: { mediaId: AUDIO, title: 'Town hall', caption: '' } }))

    expect(await screen.findByRole('group', { name: 'video' })).toBeInTheDocument()
    expect(root().querySelector('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(screen.getAllByRole('textbox', { name: 'Title' }).map(field => (field as HTMLInputElement).value)).toEqual(['Bells', 'Town hall'])
    expect(await screen.findByText('Bells.mp3')).toBeInTheDocument()
  })
})
