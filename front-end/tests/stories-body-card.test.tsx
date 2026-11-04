import type { Editor } from '@tiptap/react'

import { storyBodySchema } from '@sk/api-contract'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { groupId, patches, problem, renderStoryEditor, serveStory, setUpHarness, storyDoc, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }
const path = `/store/content/articles/${groupId}`
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const sample = doc(
  para(text('one '), text('bold', [{ type: 'bold' }]), text(' and '), text('link', [{ type: 'link', attrs: { href: 'https://example.org' } }])),
  { type: 'heading', attrs: { level: 2 }, content: [text('Head')] },
  { type: 'blockquote', content: [para(text('quoted'))] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('item'))] }] },
  para(text('two')),
)

beforeEach(async () => {
  view.wide = false
  await setUpHarness()
  vi.stubGlobal('ClipboardEvent', class extends Event {})
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
})

afterEach(() => vi.restoreAllMocks())

function serve(body: unknown = sample, extra?: Parameters<typeof serveStory>[1]) {
  const german = storyVersion('de', { draft: storyDoc({ title: 'Deutsch', body: doc(para(text('Ein Wort zwei drei'))) }) })

  return serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ body }) }), de: german }), extra)
}

const storyText = () => screen.findByRole('textbox', { name: /^(?:Story text|Text der Geschichte)$/ }, SLOW)
const editorOf = async () => ((await storyText()) as unknown as { editor: Editor }).editor
async function type(character: string) {
  const editor = await editorOf()

  act(() => void editor.commands.focus('end'))
  act(() => void editor.commands.insertContent(character))
}
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))
const sentBody = (index = 0) => (patches()[index]!.body as { draft: { body: unknown } }).draft.body

describe('[E4.3][AC30][AC45] the Story card on Write', () => {
  it('[E4.3][AC45] AC-6 on first render the card shows the skeleton (aria-busy) and no textbox; the textbox appears after the dynamic import resolves', async () => {
    serve()
    renderStoryEditor(path)
    await screen.findByRole('textbox', { name: /^Title/ }, SLOW)
    const skeleton = screen.queryByLabelText('Loading the editor')

    // The cover card is there; the Story card is either still loading (skeleton, no text box) or already loaded.
    if (skeleton) {
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
      expect(screen.queryByRole('textbox', { name: 'Story text' })).not.toBeInTheDocument()
    }
    expect(await storyText()).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading the editor')).not.toBeInTheDocument()
    expect(skeleton).not.toBeNull()
  })

  it('[E4.3][AC45] AC-1 a story whose English draft has bold, a link, an H2, a quote, a bullet list and two paragraphs opens with each format shown; after one typed character and the autosave the PATCH body parses with storyBodySchema and equals the stored body plus the character', async () => {
    serve()
    renderStoryEditor(path)
    const root = await storyText()

    expect(root.querySelector('strong')).toHaveTextContent('bold')
    expect(root.querySelector('a')).toHaveAttribute('href', 'https://example.org')
    expect(root.querySelector('h2')).toHaveTextContent('Head')
    expect(root.querySelector('blockquote')).toBeInTheDocument()
    expect(root.querySelector('ul li')).toBeInTheDocument()
    await type('!')
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)

    const expected = structuredClone(sample)

    expected.content[4] = para(text('two!'))
    expect(sentBody()).toEqual(expected)
    expect(storyBodySchema.safeParse(sentBody()).success).toBe(true)
  })

  it('[E4.3][AC45] Review Focus 2: opening that story and waiting 2 s sends no PATCH, also for a body that ends in a list and for one that holds an image, a video, an audio and a pinLink', async () => {
    const media = doc(
      para(text('x')),
      { type: 'image', attrs: { mediaId: ID, alt: 'a', caption: 'c' } },
      { type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 't', caption: '' } },
      { type: 'audio', attrs: { mediaId: ID, title: 't', caption: '' } },
      para(text('pin', [{ type: 'pinLink', attrs: { pinId: ID } }])),
      { type: 'image', attrs: { mediaId: ID, alt: '', caption: '' } },
    )
    const endsInList = doc(para(text('x')), { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('a'))] }] })

    for (const body of [sample, endsInList, media]) {
      serve(body)
      renderStoryEditor(path)
      await storyText()
      await wait(2000)
      expect(patches()).toHaveLength(0)
      cleanup()
    }
  }, 30_000)

  it('[E4.3][AC45] Review Focus 1: typing then pressing Back at once opens the leave dialog; typing then choosing the other language saves the typed text first; typing then Review saves it first', async () => {
    serve()
    renderStoryEditor(path)
    await type('!')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)

    await type('?')
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    expect(await screen.findByText('Ein Wort zwei drei', undefined, SLOW)).toBeInTheDocument()
    expect(patches().length).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(sentBody(patches().length - 1))).toContain('two!?')
  }, 30_000)

  it('[E4.3][AC45] Review Focus 1: typing then Review saves the typed text first', async () => {
    serve()
    renderStoryEditor(path)
    await type('!')
    await userEvent.click(screen.getByRole('button', { name: 'Review and publish' }))
    expect(await screen.findByText('Review and publish', undefined, SLOW)).toBeInTheDocument()
    expect(patches()).toHaveLength(1)
    expect(JSON.stringify(sentBody())).toContain('two!')
  }, 20_000)

  it('[E4.3][AC45] "Leave without saving" after typing sends no PATCH', async () => {
    serve()
    renderStoryEditor(path)
    await type('!')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }))
    expect(await screen.findByText('Stories list')).toBeInTheDocument()
    await wait(2000)
    expect(patches()).toHaveLength(0)
  }, 20_000)

  it('[E4.3][AC45] Review Focus 5: a 422 validation-failed answer on a body save keeps the text on screen and shows the failed notice with Retry (Try again); Retry sends the same body', async () => {
    let refuse = true

    serve(sample, call => (call.method === 'PATCH' && refuse ? problem(422, 'validation-failed') : undefined))
    renderStoryEditor(path)
    await type('!')
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    const retry = await screen.findByRole('button', { name: 'Try again' }, SLOW)

    expect((await storyText()).textContent).toContain('two!')
    const refused = sentBody()

    refuse = false
    await userEvent.click(retry)
    await waitFor(() => expect(patches()).toHaveLength(2), SLOW)
    expect(sentBody(1)).toEqual(refused)
  }, 30_000)

  it('[E4.3][AC45] AC-3 the facts line under the editor reads "{n} words · {m} min read · …" for the stored body, updates after typing, and reads in German on the German version', async () => {
    serve()
    renderStoryEditor(path)
    await storyText()
    expect(screen.getByText('8 words · 1 min read · No contents list (needs 2 headings)')).toBeInTheDocument()
    await type(' more')
    expect(await screen.findByText('9 words · 1 min read · No contents list (needs 2 headings)', undefined, SLOW)).toBeInTheDocument()
  }, 20_000)

  it('[E4.3][AC45] AC-3 the facts line reads in German with the German interface', async () => {
    localStorage.setItem('sk.language', JSON.stringify('de'))
    await (await import('@/contexts/locale-context')).loadDictionary('de')
    serve()
    renderStoryEditor(`${path}?lang=de`)
    await storyText()
    expect(await screen.findByText('4 Wörter · 1 Min. Lesezeit · Kein Inhaltsverzeichnis (braucht 2 Überschriften)', undefined, SLOW)).toBeInTheDocument()
    expect(await storyText()).toHaveAttribute('lang', 'de')
    localStorage.clear()
  }, 20_000)

  it('[E4.3][AC30] a body pasted with an h1 and a table through the real editor saves as paragraphs only and the PATCH parses with storyBodySchema', async () => {
    serve(doc(para()))
    renderStoryEditor(path)
    const editor = await editorOf()

    act(() => void editor.commands.focus('end'))
    act(() => editor.view.pasteHTML('<h1>Big</h1><table><tr><td>A</td><td>B</td></tr></table>', new ClipboardEvent('paste')))
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(JSON.stringify(sentBody())).not.toMatch(/"type":"(?:heading|table)/)
    expect(JSON.stringify(sentBody())).toContain('A B')
    expect(storyBodySchema.safeParse(sentBody()).success).toBe(true)
  }, 20_000)
})
