import type { Editor } from '@tiptap/react'
import type { BodyHandover } from '@/features/stories/hooks/use-story-version-editor'

import { storyBodySchema } from '@sk/api-contract'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import StoryBodyEditor from '@/features/stories/editor/story-body-editor'

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never
const empty = { type: 'doc', content: [{ type: 'paragraph' }] } as never
const sample = doc(
  para(text('one '), text('bold', [{ type: 'bold' }]), text(' and '), text('link', [{ type: 'link', attrs: { href: 'https://example.org' } }])),
  { type: 'heading', attrs: { level: 2 }, content: [text('Head')] },
  { type: 'blockquote', content: [para(text('quoted'))] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('item'))] }] },
  para(text('two')),
)

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
})

beforeEach(() => {
  view.wide = true
  localStorage.clear()
})

function setUp(body: never = sample, language: 'en' | 'de' = 'en') {
  const onChange = vi.fn()
  const onDirty = vi.fn()
  const registered: (BodyHandover | null)[] = []
  const props = { body, language, onChange, onDirty, registerHandover: (handover: BodyHandover | null) => void registered.push(handover) }
  const rendered = render(
    <LocaleProvider>
      <StoryBodyEditor {...props} />
    </LocaleProvider>,
  )
  const handover = () => registered.filter(Boolean).at(-1)!

  return { ...rendered, onChange, onDirty, registered, handover }
}

const textbox = () => screen.getByRole('textbox')
const editorOf = () => (textbox() as unknown as { editor: Editor }).editor
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))
const lastBody = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)![0]

describe('[E4.3][AC30][AC45] the story body editor', () => {
  it('[E4.3][AC30] AC-1 the editor opened on a body with bold, a link, an H2, a quote, a bullet list and two paragraphs shows strong, an a with the href, an h2, a blockquote, a ul and two p, and fires no onChange and no onDirty on creation', async () => {
    const { onChange, onDirty } = setUp()
    const root = textbox()

    expect(root.querySelector('strong')).toHaveTextContent('bold')
    expect(root.querySelector('a')).toHaveAttribute('href', 'https://example.org')
    expect(root.querySelector('h2')).toHaveTextContent('Head')
    expect(root.querySelector('blockquote')).toHaveTextContent('quoted')
    expect(root.querySelector('ul li')).toHaveTextContent('item')
    expect(root.querySelectorAll(':scope > p')).toHaveLength(2)
    await wait(450)
    expect(onChange).not.toHaveBeenCalled()
    expect(onDirty).not.toHaveBeenCalled()
  })

  it('[E4.3][AC30] typing calls onDirty at once and onChange once, 300 ms after the last key, with a body that parses with storyBodySchema', async () => {
    const { onChange, onDirty } = setUp()

    act(() => void editorOf().commands.focus('end'))
    act(() => void editorOf().commands.insertContent('a'))
    act(() => void editorOf().commands.insertContent('b'))
    expect(onDirty).toHaveBeenCalledTimes(2)
    expect(onChange).not.toHaveBeenCalled()
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1), { timeout: 1500 })
    expect(JSON.stringify(lastBody(onChange))).toContain('twoab')
    expect(storyBodySchema.safeParse(lastBody(onChange)).success).toBe(true)
    await wait(450)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('[E4.3][AC45] Review Focus 1: handoff() runs a pending hand-over now (once; a second call does nothing), cancel() drops it, and unmounting with a pending hand-over delivers it', async () => {
    const first = setUp()

    act(() => void editorOf().commands.insertContent('x'))
    act(() => first.handover().handoff())
    expect(first.onChange).toHaveBeenCalledTimes(1)
    act(() => first.handover().handoff())
    expect(first.onChange).toHaveBeenCalledTimes(1)
    await wait(450)
    expect(first.onChange).toHaveBeenCalledTimes(1)
    first.unmount()

    const second = setUp()

    act(() => void editorOf().commands.insertContent('y'))
    act(() => second.handover().cancel())
    await wait(450)
    expect(second.onChange).not.toHaveBeenCalled()
    second.unmount()
    expect(second.onChange).not.toHaveBeenCalled()

    const third = setUp()

    act(() => void editorOf().commands.insertContent('z'))
    third.unmount()
    expect(third.onChange).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(lastBody(third.onChange))).toContain('z')
    expect(third.registered.at(-1)).toBeNull()
  })

  it('[E4.3][AC30] the placeholder reads "Tell your story…" on an empty body and "Erzählen Sie Ihre Geschichte …" in German, and disappears on the first character', async () => {
    const english = setUp(empty)

    expect(screen.getByText('Tell your story…')).toBeInTheDocument()
    act(() => void editorOf().commands.insertContent('a'))
    await waitFor(() => expect(screen.queryByText('Tell your story…')).not.toBeInTheDocument())
    english.unmount()

    localStorage.setItem('sk.language', JSON.stringify('de'))
    const { loadDictionary } = await import('@/contexts/locale-context')

    await loadDictionary('de')
    setUp(empty, 'de')
    expect(await screen.findByText('Erzählen Sie Ihre Geschichte …')).toBeInTheDocument()
    expect(textbox()).toHaveAttribute('lang', 'de')
    expect(screen.getByRole('textbox', { name: 'Text der Geschichte' })).toBe(textbox())
  })

  it('[E4.3][AC30] the editor has lang set to the language and the accessible name "Story text"', () => {
    setUp()
    expect(screen.getByRole('textbox', { name: 'Story text' })).toHaveAttribute('lang', 'en')
  })

  it('[E4.3][AC30] wide: the toolbar shows the seven tools, Link, Undo and Redo; a text selection opens the bubble with the tools and without Undo and Redo; phone: the bar has no Redo and Done shows only while the editor has focus; neither shows Insert, "+" or Link a pin', async () => {
    const wide = setUp()
    const bar = screen.getByRole('toolbar', { name: 'Formatting' })

    for (const name of ['Heading', 'Small heading', 'Bold', 'Italic', 'Quote', 'Bulleted list', 'Numbered list', 'Link', 'Undo', 'Redo'])
      expect(within(bar).getByRole('button', { name })).toBeInTheDocument()
    expect(screen.queryByRole('toolbar', { name: 'Formatting the selection' })).not.toBeInTheDocument()
    act(() => void editorOf().commands.focus())
    act(() => void editorOf().commands.setTextSelection({ from: 2, to: 5 }))
    const bubble = await screen.findByRole('toolbar', { name: 'Formatting the selection' })

    expect(within(bubble).getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(within(bubble).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(within(bubble).queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument()
    for (const name of [/insert/i, /^\+$/, /pin/i])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    wide.unmount()

    view.wide = false
    setUp()
    const phone = screen.getByRole('toolbar', { name: 'Formatting' })

    expect(within(phone).getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(within(phone).queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('toolbar', { name: 'Formatting the selection' })).not.toBeInTheDocument()
    expect(within(phone).queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    act(() => void editorOf().commands.focus())
    await userEvent.click(await within(phone).findByRole('button', { name: 'Done' }))
    await waitFor(() => expect(within(phone).queryByRole('button', { name: 'Done' })).not.toBeInTheDocument())
    for (const name of [/insert/i, /^\+$/, /pin/i])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  })
})
