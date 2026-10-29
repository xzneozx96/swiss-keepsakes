import type { LabState } from '@/features/lab/story-editor-search-params'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { StoryEditorLabApp } from '@/features/lab/story-editor-app'
import { stateIds } from '@/features/lab/story-editor-search-params'

// jsdom has no CSS.supports; the step shell's auto-sizing textarea asks it at import time.
vi.hoisted(() => {
  Object.assign(globalThis, { CSS: { supports: () => false, escape: (v: string) => v } })
})

const original = window.matchMedia

/** `useIsWide` reads `(min-width: 1024px)`; this makes it answer like a laptop or a phone. */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeAll(() => {
  // ProseMirror measures the selection; jsdom has no layout.
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }

  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  document.elementFromPoint = () => null
  // C20's contents bar scrolls its chips into view.
  Element.prototype.scrollTo = () => {}
})

afterEach(() => {
  window.matchMedia = original
})

const PHONE_STATES: LabState[] = ['draft', 'typing', 'media', 'publish', 'reviewtype', 'categories', 'blocked', 'loading']
const SLOW = { timeout: 10_000 }

function renderEditor(state: LabState) {
  return render(
    <LocaleProvider>
      <StoryEditorLabApp state={state} />
    </LocaleProvider>,
  )
}

describe('[E4.3] the story editor renders every lab state', () => {
  for (const wide of [true, false]) {
    // Every state at laptop width; on a phone the states whose layout differs there.
    for (const state of stateIds.filter(s => wide || PHONE_STATES.includes(s))) {
      it(`${state} · ${wide ? 'laptop' : 'phone'}`, async () => {
        setWide(wide)
        const { unmount } = renderEditor(state)

        if (state === 'loading') {
          expect(screen.getByLabelText('Loading the story')).toHaveAttribute('aria-busy', 'true')
        }
        else if (['draft', 'new', 'typing', 'media', 'pinpicker', 'unsaved', 'de'].includes(state)) {
          // The lazily loaded editor arrives, under the Cover and title card.
          expect(await screen.findByRole('textbox', { name: 'Story text', hidden: true }, SLOW)).toBeInTheDocument()
          expect(screen.getByRole('region', { name: 'Cover and title', hidden: true })).toBeInTheDocument()
          expect(screen.queryByText(/^Role$/)).toBeNull()
          // The formatting bar is always there, without focus: pinned in the card on a laptop, at the
          // bottom on a phone (above the tab bar, or above the keyboard while typing).
          expect(screen.getAllByRole('toolbar', { name: 'Formatting', hidden: true }).length).toBeGreaterThan(0)
          expect(screen.getAllByRole('button', { name: 'Bold', hidden: true }).length).toBeGreaterThan(0)
        }
        if (state === 'media')
          expect(await screen.findByRole('tab', { name: 'Photo', hidden: true }, SLOW)).toBeInTheDocument()
        if (state === 'pinpicker')
          expect(await screen.findByText(/“Zyt tower” will open the pin/, {}, SLOW)).toBeInTheDocument()
        if (state === 'reviewtype')
          expect(await screen.findByText('Facts checked on', {}, SLOW)).toBeInTheDocument()
        if (state === 'categories')
          expect(await screen.findByRole('list', { name: 'Blog categories', hidden: true }, SLOW)).toBeInTheDocument()
        if (state === 'blocked')
          expect(screen.getByText('Add the day the facts were checked.')).toBeInTheDocument()
        if (state === 'publish')
          expect(screen.getAllByText(wide ? 'Ready to publish' : /^Ready · \d+ to look at$/).length).toBeGreaterThan(0)
        if (state === 'unsaved')
          expect(screen.getByText('Leave without saving?')).toBeInTheDocument()
        if (state === 'draft')
          expect(await screen.findAllByText(/the website of your pin Hotel am See/, {}, SLOW)).not.toHaveLength(0)
        unmount()
      })
    }
  }
})

describe('[E4.3] the pin-website warning offers a pin link', () => {
  it('switches the raw link to a pin link and the warning goes', async () => {
    setWide(true)
    const { container, unmount } = renderEditor('draft')
    const [switchButton] = await screen.findAllByRole('button', { name: 'Switch to pin link' }, SLOW)

    expect(container.querySelector('a[href*="hotel-am-see"]')).not.toBeNull()
    fireEvent.click(switchButton!)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Switch to pin link' })).toBeNull(), SLOW)
    expect(container.querySelector('a[href*="hotel-am-see"]')).toBeNull()
    expect(container.querySelectorAll('a.pin-link[data-pin-id="p10"]').length).toBeGreaterThan(0)
    unmount()
  })
})

describe('[E4.3] ordered Details lists reorder from the grip', () => {
  it('moves a keepsake with the arrow keys and keeps the focus on its grip', async () => {
    setWide(true)
    const { container, unmount } = renderEditor('publish')
    const card = container.querySelector('#details-keepsakes')!

    fireEvent.click(card.querySelector('button[aria-expanded]')!)
    const rows = () => Array.from(card.querySelectorAll<HTMLElement>('[data-row]'), r => r.dataset.row)
    const before = rows()

    expect(before).toEqual(['p-postcards', 'p-vx-old-town', 'p-vx-lion'])
    const grip = card.querySelector<HTMLButtonElement>('[data-row="p-postcards"] [data-grip]')!

    grip.focus()
    fireEvent.keyDown(grip, { key: 'ArrowDown' })
    await waitFor(() => expect(rows()).toEqual(['p-vx-old-town', 'p-postcards', 'p-vx-lion']))
    expect(document.activeElement).toBe(card.querySelector('[data-row="p-postcards"] [data-grip]'))
    // Remove stays on every row; there are no up and down chevrons.
    expect(card.querySelectorAll('button[aria-label^="Remove"]')).toHaveLength(3)
    expect(card.querySelector('button[aria-label^="Move"][aria-label$="up"]')).toBeNull()
    unmount()
  })

  it('has no language card: Details are shared, the switch heads the publish card', () => {
    setWide(true)
    const { container, unmount } = renderEditor('publish')

    expect(container.querySelector('#details-language')).toBeNull()
    expect(screen.getByText('Shared by English and Deutsch.')).toBeInTheDocument()
    expect(container.querySelector('#publish-card [aria-label="Language version"]')).not.toBeNull()
    unmount()
  })
})
