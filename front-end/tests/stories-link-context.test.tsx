import type { JSONContent } from '@tiptap/react'

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor, useEditorState } from '@tiptap/react'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStoryExtensions } from '@/features/stories/editor/extensions'
import { LinkContext } from '@/features/stories/editor/link-context'
import { hostOf } from '@/features/stories/lib/pins'
import { pinItem, renderWithStore, servePins, setUpStoryMedia, state, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const PIN = '0198a000-0000-7000-8000-000000000010'
const labels = { image: 'Photo', video: 'Video', audio: 'Recording' }
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const doc = (...content: unknown[]): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph', content }] as JSONContent[] })
const published = pinItem(10, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower' })
const HREF = 'https://www.zyt.example/other'

let editor: Editor | undefined

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
  vi.stubGlobal('ClipboardEvent', class extends Event {})
})

beforeEach(setUpStoryMedia)

afterEach(() => {
  editor?.destroy()
  editor = undefined
})

/** The context line for the cursor inside the first text node, with the state the bar would read from the editor. */
function Harness({ target, onChangePin = () => {} }: { target: Editor, onChangePin?: () => void }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const { link, pinId } = useEditorState({
    editor: target,
    selector: ({ editor: e }) => ({
      link: e.isActive('link') ? String(e.getAttributes('link').href) : '',
      pinId: e.isActive('pinLink') ? String(e.getAttributes('pinLink').pinId) : '',
    }),
  })

  return <LinkContext dismissed={dismissed} editor={target} link={link} pinId={pinId} language="en" storeId={storeId} onChangePin={onChangePin} onKeep={host => setDismissed(current => [...current, host])} />
}

function setUp(content: JSONContent, pins: Record<string, unknown>[], onChangePin?: () => void) {
  servePins(pins)
  editor = new Editor({ extensions: createStoryExtensions(labels), content })
  editor.commands.setTextSelection(2)
  renderWithStore(<Harness target={editor} onChangePin={onChangePin} />)

  return editor
}

describe('[E4.3][AC45] the context line', () => {
  it('[E4.3][AC45] AC-5 a link whose host matches a pin\'s website shows the yellow warning and "Link the pin instead" turns it into a pin link and the warning goes', async () => {
    const target = setUp(doc(text('Zyt tower', [{ type: 'link', attrs: { href: HREF } }])), [published])
    const note = await screen.findByText(/links to zyt.example/)

    expect(note).toHaveTextContent('“Zyt tower” links to zyt.example, the website of your pin Zyt tower.')
    await userEvent.click(screen.getByRole('button', { name: 'Link the pin instead' }))
    expect(target.getJSON().content![0]!.content![0]!.marks).toEqual([{ type: 'pinLink', attrs: { pinId: PIN } }])
    await waitFor(() => expect(screen.queryByText(/links to zyt.example/)).not.toBeInTheDocument())
  })

  it('[E4.3][AC45] AC-5 Keep hides the warning for that address only', async () => {
    setUp(doc(text('Zyt tower', [{ type: 'link', attrs: { href: HREF } }])), [published])
    await userEvent.click(await screen.findByRole('button', { name: 'Keep' }))
    expect(screen.queryByText(/links to zyt.example/)).not.toBeInTheDocument()
    expect(hostOf(HREF)).toBe('zyt.example')
  })

  it('[E4.3][AC45] AC-4 on a pin link the line says Pin link: {name} and a draft pin adds "(not published: plain text for guests)"', async () => {
    setUp(doc(text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }])), [pinItem(10, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower', status: 'draft' })])
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Pin link: Zyt tower (not published: plain text for guests)'))
  })

  it('[E4.3][AC45] a pin id that is not in the list reads Unknown pin and Remove still works', async () => {
    const target = setUp(doc(text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }])), [])

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Pin link: Unknown pin'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(target.getJSON().content![0]!.content![0]!.marks).toBeUndefined()
  })

  it('[E4.3][AC45] Change opens the pin sheet', async () => {
    const onChangePin = vi.fn()

    setUp(doc(text('Zyt tower', [{ type: 'pinLink', attrs: { pinId: PIN } }])), [published], onChangePin)
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(onChangePin).toHaveBeenCalled()
  })

  it('[E4.3][AC45] a link to a draft pin\'s website shows no warning', async () => {
    setUp(doc(text('Zyt tower', [{ type: 'link', attrs: { href: HREF } }])), [pinItem(10, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower', status: 'draft' })])
    await waitFor(() => expect(state.calls.some(call => call.path.includes('/pins/lookup'))).toBe(true))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
