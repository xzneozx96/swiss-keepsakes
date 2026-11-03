import type { JSONContent } from '@tiptap/react'

import { storyBodySchema } from '@sk/api-contract'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { createStoryExtensions } from '@/features/stories/editor/extensions'
import { FormatButtons, UndoRedo, useFormatState } from '@/features/stories/editor/format-bar'
import { LinkForm } from '@/features/stories/editor/link-form'
import { cleanBody } from '@/features/stories/lib/body'

const labels = { image: 'Photo', video: 'Video', audio: 'Recording' }
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]): JSONContent => ({ type: 'doc', content: content as JSONContent[] })

let current: ReturnType<typeof useEditor>

function Bar({ content, big = false }: { content: JSONContent, big?: boolean }) {
  const editor = useEditor({ extensions: createStoryExtensions(labels), content, immediatelyRender: true, shouldRerenderOnTransaction: false })
  const state = useFormatState(editor)
  const [linkOpen, setLinkOpen] = useState(false)

  useEffect(() => {
    current = editor
  }, [editor])

  return (
    <>
      <EditorContent editor={editor} />
      <div role="toolbar">
        <FormatButtons big={big} editor={editor} linkOpen={linkOpen} state={state} onLink={() => setLinkOpen(open => !open)} onPin={() => {}} />
        <UndoRedo big={big} editor={editor} state={state} />
      </div>
      {linkOpen && <LinkForm current={state.link} editor={editor} onDone={() => setLinkOpen(false)} />}
    </>
  )
}

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
  vi.stubGlobal('scrollTo', () => {})
})

const body = () => cleanBody(current!.getJSON())
const button = (name: string) => screen.getByRole('button', { name })
/** The editor's text selected from the first to the last character of the first block. */
const selectFirstBlock = () => act(() => void current!.commands.setTextSelection({ from: 1, to: current!.state.doc.firstChild!.content.size + 1 }))

describe('[E4.3][AC30][AC45] the formatting bar and the link form', () => {
  it('[E4.3][AC45] AC-4 with the cursor in bold text the Bold button has aria-pressed true; focusing it and pressing Enter removes the bold, and aria-pressed turns false', async () => {
    render(
      <LocaleProvider>
        <Bar content={doc(para(text('bold', [{ type: 'bold' }])))} />
      </LocaleProvider>,
    )
    selectFirstBlock()
    await waitFor(() => expect(button('Bold')).toHaveAttribute('aria-pressed', 'true'))

    act(() => button('Bold').focus())
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(button('Bold')).toHaveAttribute('aria-pressed', 'false'))
    expect(JSON.stringify(body())).not.toContain('"type":"bold"')
  })

  it('[E4.3][AC45] AC-4 Space presses a tool too, and Italic, H2, H3, Quote, Bullets and Numbers show pressed at their node', async () => {
    const first = render(
      <LocaleProvider>
        <Bar content={doc(para(text('italic', [{ type: 'italic' }])))} />
      </LocaleProvider>,
    )
    selectFirstBlock()
    await waitFor(() => expect(button('Italic')).toHaveAttribute('aria-pressed', 'true'))
    act(() => button('Italic').focus())
    await userEvent.keyboard(' ')
    await waitFor(() => expect(button('Italic')).toHaveAttribute('aria-pressed', 'false'))
    expect(JSON.stringify(body())).not.toContain('"type":"italic"')
    first.unmount()

    const cases: [string, JSONContent][] = [
      ['Heading', doc({ type: 'heading', attrs: { level: 2 }, content: [text('x')] })],
      ['Small heading', doc({ type: 'heading', attrs: { level: 3 }, content: [text('x')] })],
      ['Quote', doc({ type: 'blockquote', content: [para(text('x'))] })],
      ['Bulleted list', doc({ type: 'bulletList', content: [{ type: 'listItem', content: [para(text('x'))] }] })],
      ['Numbered list', doc({ type: 'orderedList', content: [{ type: 'listItem', content: [para(text('x'))] }] })],
    ]

    for (const [name, content] of cases) {
      const view = render(
        <LocaleProvider>
          <Bar content={content} />
        </LocaleProvider>,
      )

      act(() => void current!.commands.focus('end'))
      await waitFor(() => expect(button(name)).toHaveAttribute('aria-pressed', 'true'))
      view.unmount()
    }
  })

  it('[E4.3][AC45] each tool applies at a selection: H2 makes a level 2 heading, H3 a level 3, Quote a blockquote, the lists their lists, and pressing again undoes it', async () => {
    render(
      <LocaleProvider>
        <Bar content={doc(para(text('word')))} />
      </LocaleProvider>,
    )
    const first = () => body().content[0]!.type

    for (const [name, type] of [['Heading', 'heading'], ['Small heading', 'heading'], ['Quote', 'blockquote'], ['Bulleted list', 'bulletList'], ['Numbered list', 'orderedList']] as const) {
      selectFirstBlock()
      await userEvent.click(button(name))
      expect(first()).toBe(type)
      if (name === 'Heading')
        expect(body().content[0]).toMatchObject({ attrs: { level: 2 } })
      if (name === 'Small heading')
        expect(body().content[0]).toMatchObject({ attrs: { level: 3 } })
      await userEvent.click(button(name))
      expect(first()).toBe('paragraph')
    }
    expect(storyBodySchema.safeParse(body()).success).toBe(true)
  })

  it('[E4.3][AC30] AC-5 entering javascript:alert(1) in the link form and pressing Apply shows the error text, sets aria-invalid, and the document has no link; entering https://example.org then adds a link with that href', async () => {
    render(
      <LocaleProvider>
        <Bar content={doc(para(text('word')))} />
      </LocaleProvider>,
    )
    selectFirstBlock()
    await userEvent.click(button('Link'))
    const field = await screen.findByRole('textbox', { name: 'Link address' })

    await userEvent.clear(field)
    await userEvent.type(field, 'javascript:alert(1)')
    await userEvent.click(button('Apply'))
    expect(await screen.findByText('Use a web address (https://…) or an email (mailto:…).')).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(JSON.stringify(body())).not.toContain('"type":"link"')

    await userEvent.clear(field)
    await userEvent.type(field, 'https://example.org')
    await userEvent.click(button('Apply'))
    expect(body().content[0]).toMatchObject({ content: [{ text: 'word', marks: [{ type: 'link', attrs: { href: 'https://example.org' } }] }] })
    expect(screen.queryByRole('textbox', { name: 'Link address' })).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] Remove shows only on a link and removes the whole link range; Cancel closes without a change; Enter in the field applies', async () => {
    render(
      <LocaleProvider>
        <Bar content={doc(para(text('plain '), text('linked', [{ type: 'link', attrs: { href: 'https://a.ch' } }])))} />
      </LocaleProvider>,
    )

    // Off a link: no Remove. Cancel closes and changes nothing.
    act(() => void current!.commands.setTextSelection(2))
    await userEvent.click(button('Link'))
    expect(screen.queryByRole('button', { name: 'Remove link' })).not.toBeInTheDocument()
    await userEvent.click(button('Cancel'))
    expect(screen.queryByRole('textbox', { name: 'Link address' })).not.toBeInTheDocument()
    expect(JSON.stringify(body())).toContain('https://a.ch')

    // On a link: Remove takes the whole range off.
    act(() => void current!.commands.setTextSelection(10))
    await waitFor(() => expect(button('Link')).toHaveAttribute('aria-pressed', 'true'))
    await userEvent.click(button('Link'))
    expect(await screen.findByRole('textbox', { name: 'Link address' })).toHaveValue('https://a.ch')
    await userEvent.click(button('Remove link'))
    expect(JSON.stringify(body())).not.toContain('"type":"link"')

    // Enter applies.
    selectFirstBlock()
    await userEvent.click(button('Link'))
    const field = await screen.findByRole('textbox', { name: 'Link address' })

    await userEvent.clear(field)
    await userEvent.type(field, 'mailto:a@b.ch{Enter}')
    expect(JSON.stringify(body())).toContain('mailto:a@b.ch')
  })

  it('[E4.3][AC30] every button has an accessible name from the messages, and in German the names are German', async () => {
    const english = ['Heading', 'Small heading', 'Bold', 'Italic', 'Quote', 'Bulleted list', 'Numbered list', 'Link', 'Undo', 'Redo']
    const view = render(
      <LocaleProvider>
        <Bar content={doc(para(text('x')))} />
      </LocaleProvider>,
    )

    for (const name of english)
      expect(button(name)).toBeInTheDocument()
    view.unmount()

    localStorage.setItem('sk.language', JSON.stringify('de'))
    const { loadDictionary } = await import('@/contexts/locale-context')

    await loadDictionary('de')
    render(
      <LocaleProvider>
        <Bar content={doc(para(text('x')))} />
      </LocaleProvider>,
    )
    for (const name of ['Überschrift', 'Kleine Überschrift', 'Fett', 'Kursiv', 'Zitat', 'Aufzählung', 'Nummerierte Liste', 'Link', 'Rückgängig', 'Wiederholen'])
      expect(await screen.findByRole('button', { name })).toBeInTheDocument()
    localStorage.clear()
  })

  it('[E4.3][AC30] big renders 44 px targets (the size class) and the laptop size 36 px', () => {
    const small = render(
      <LocaleProvider>
        <Bar content={doc(para(text('x')))} />
      </LocaleProvider>,
    )

    expect(button('Bold').className).toContain('size-9')
    expect(button('Bold').className).not.toContain('size-11')
    small.unmount()
    render(
      <LocaleProvider>
        <Bar big content={doc(para(text('x')))} />
      </LocaleProvider>,
    )
    expect(button('Bold').className).toContain('size-11')
    expect(button('Undo').className).toContain('size-11')
  })
})
