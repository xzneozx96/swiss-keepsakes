import type { Editor } from '@tiptap/react'
import type { BodyHandover } from '@/features/stories/hooks/use-story-version-editor'

import { storyBodySchema } from '@sk/api-contract'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import StoryBodyEditor from '@/features/stories/editor/story-body-editor'
import { libraryItem, photoId, pinItem, renderWithStore, secondPhotoId, serveMedia, servePins, setUpStoryMedia, storeId, uuid } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const PIN = uuid(1)
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never
const image = { type: 'image', attrs: { mediaId: photoId, alt: '', caption: '' } }

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
})

beforeEach(async () => {
  view.wide = true
  await setUpStoryMedia()
  serveMedia([libraryItem({ name: 'Ready.JPG', alt: { en: 'The Chapel Bridge' } }), libraryItem({ id: secondPhotoId, name: 'Busy.JPG', status: 'processing' })])
  servePins([
    pinItem(1, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower' }),
    pinItem(2, { title: { en: 'Draft cellar' }, status: 'draft' }),
  ])
})

function setUp(body: never) {
  const onChange = vi.fn()
  const registered: (BodyHandover | null)[] = []
  const pins = [
    { id: PIN, name: 'Zyt tower', status: 'published' as const, website: 'https://zyt.example/tower', photo: null },
    { id: uuid(2), name: 'Draft cellar', status: 'draft' as const, website: null, photo: null },
  ]
  const rendered = renderWithStore(<StoryBodyEditor body={body} language="en" pins={pins} registerHandover={handover => void registered.push(handover)} storeId={storeId} onChange={onChange} onDirty={() => {}} />)

  return { ...rendered, onChange, handover: () => registered.filter(Boolean).at(-1)! }
}

const root = () => document.querySelector<HTMLElement>('[aria-multiline="true"]')!
const editorOf = () => (root() as unknown as { editor: Editor }).editor
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))
const toolbarNames = () => within(screen.getByRole('toolbar', { name: 'Formatting' })).getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent)
const types = () => (editorOf().getJSON().content ?? []).map(node => node.type)

describe('[E4.3][AC45] the bars, the plus and the editor wiring', () => {
  it('[E4.3][AC45] AC-1 two paragraphs, cursor in the first, Insert, a ready photo, Insert photo: the editor holds paragraph, image, paragraph', async () => {
    const { onChange, handover } = setUp(doc(para(text('first')), para(text('second'))))

    act(() => void editorOf().commands.setTextSelection(2))
    await userEvent.click(screen.getByRole('button', { name: 'Insert' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    await userEvent.click(screen.getByRole('button', { name: 'Insert photo' }))
    expect(types()).toEqual(['paragraph', 'image', 'paragraph'])
    act(() => handover().handoff())
    const body = onChange.mock.calls.at(-1)![0]

    expect(storyBodySchema.safeParse(body).success).toBe(true)
    expect(body.content[1]).toEqual({ type: 'image', attrs: { mediaId: photoId, alt: 'The Chapel Bridge', caption: '' } })
  })

  it('[E4.3][AC45] the laptop bar order is the seven tools, Link, Link a pin, Insert, then Undo and Redo, all labelled, Insert opens the sheet on Photo', async () => {
    setUp(doc(para(text('first'))))

    expect(toolbarNames()).toEqual(['Heading', 'Small heading', 'Bold', 'Italic', 'Quote', 'Bulleted list', 'Numbered list', 'Link', 'Link a pin', 'Insert', 'Undo', 'Redo'])
    await userEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(await screen.findByRole('tab', { name: 'Photo' })).toHaveAttribute('aria-selected', 'true')
  })

  it('[E4.3][AC45] the "+" shows on an empty line only and its Video button opens the sheet on the Video tab', async () => {
    setUp(doc(para(text('first')), para()))

    act(() => void editorOf().commands.focus(2))
    expect(screen.queryByRole('button', { name: 'Insert a photo, video or recording' })).not.toBeInTheDocument()
    act(() => void editorOf().commands.focus('end'))
    await userEvent.click(await screen.findByRole('button', { name: 'Insert a photo, video or recording' }))
    await userEvent.click(screen.getByRole('button', { name: 'Insert a video' }))
    expect(await screen.findByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'true')
  })

  it('[E4.3][AC45] the phone bar starts with "Insert a photo, video or recording", has Link a pin, no Redo, and no "+" at the line', async () => {
    view.wide = false
    setUp(doc(para(text('first')), para()))

    act(() => void editorOf().commands.focus('end'))
    const names = toolbarNames()

    expect(names[0]).toBe('Insert a photo, video or recording')
    expect(names).toContain('Link a pin')
    expect(names).not.toContain('Redo')
    expect(screen.getAllByRole('button', { name: 'Insert a photo, video or recording' })).toHaveLength(1)
  })

  it('[E4.3][AC45] AC-4 select "Zyt tower", Link a pin, pick the published pin, Link this pin: the words carry a pinLink, the row showed the https website', async () => {
    setUp(doc(para(text('See Zyt tower now'))))

    act(() => void editorOf().commands.setTextSelection({ from: 5, to: 14 }))
    await userEvent.click(screen.getByRole('button', { name: 'Link a pin' }))
    const row = await screen.findByRole('button', { name: /Zyt tower/ })

    expect(row).toHaveTextContent('zyt.example/tower')
    await userEvent.click(row)
    await userEvent.click(screen.getByRole('button', { name: 'Link this pin' }))
    const marks = (editorOf().getJSON().content![0]!.content as { text: string, marks: unknown[] }[]).find(node => node.text === 'Zyt tower')!.marks

    expect(marks).toEqual([{ type: 'pinLink', attrs: { pinId: PIN } }])
  })

  it('[E4.3][AC45] AC-4 a draft pin can be chosen', async () => {
    setUp(doc(para(text('See Zyt tower now'))))

    act(() => void editorOf().commands.setTextSelection({ from: 5, to: 14 }))
    await userEvent.click(screen.getByRole('button', { name: 'Link a pin' }))
    await userEvent.click(await screen.findByRole('button', { name: /Draft cellar/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Link this pin' }))
    expect(JSON.stringify(editorOf().getJSON())).toContain(uuid(2))
  })

  it('[E4.3][AC45] AC-5 a plain link to the pin\'s website shows the warning in the sticky row, Link the pin instead converts it, and the warning is gone', async () => {
    setUp(doc(para(text('Zyt tower', [{ type: 'link', attrs: { href: 'https://www.zyt.example/other' } }]))))

    act(() => void editorOf().commands.setTextSelection(3))
    await userEvent.click(await screen.findByRole('button', { name: 'Link the pin instead' }))
    expect(JSON.stringify(editorOf().getJSON())).toContain(`"pinId":"${PIN}"`)
    expect(JSON.stringify(editorOf().getJSON())).not.toContain('"type":"link"')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Link the pin instead' })).not.toBeInTheDocument())
  })

  it('[E4.3][AC45] AC-6 with 100 media blocks the Insert sheet refuses with its message and the body is unchanged', async () => {
    setUp(doc(para(text('first')), ...Array.from({ length: 100 }, () => image)))

    act(() => void editorOf().commands.setTextSelection(2))
    await userEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(await screen.findByText('A story holds at most 100 photos, videos and recordings. Remove one first.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insert photo' })).toBeDisabled()
    expect(types()).toHaveLength(101)
    await wait(0)
  })

  it('[E4.3][AC30] the bubble has Link a pin and no Insert', async () => {
    setUp(doc(para(text('first words'))))

    act(() => void editorOf().commands.focus())
    act(() => void editorOf().commands.setTextSelection({ from: 1, to: 6 }))
    const bubble = await screen.findByRole('toolbar', { name: 'Formatting the selection' })
    const names = within(bubble).getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent)

    expect(names).toContain('Link a pin')
    expect(names).not.toContain('Insert')
  })
})
