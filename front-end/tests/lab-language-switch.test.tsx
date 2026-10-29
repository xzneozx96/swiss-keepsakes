import type { LanguageStatus } from '@/components/language-version-switch'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { LocaleProvider } from '@/contexts/locale-context'
import { StoryEditorLabApp } from '@/features/lab/story-editor-app'

// jsdom has no CSS.supports; the story editor's auto-sizing textarea asks it at import time.
vi.hoisted(() => {
  Object.assign(globalThis, { CSS: { supports: () => false, escape: (v: string) => v } })
})

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'de', label: 'Deutsch', short: 'DE' },
] as const

const STATUS: Record<'en' | 'de', LanguageStatus> = {
  en: { text: 'Published Sat 17 Oct', tone: 'success' },
  de: { text: 'Missing text', tone: 'warning' },
}

function renderSwitch({ compact = false, onChange = vi.fn() } = {}) {
  render(
    <LanguageVersionSwitch
      compact={compact}
      languages={LANGUAGES}
      selected="en"
      status={STATUS}
      onChange={onChange}
    />,
  )

  return onChange
}

describe('language version switch', () => {
  for (const compact of [false, true]) {
    it(`${compact ? 'compact: ' : ''}names the languages and says each status in words`, () => {
      renderSwitch({ compact })

      expect(screen.getByRole('tablist', { name: 'Language version' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: `${compact ? 'EN' : 'English'}, Published Sat 17 Oct` })).toHaveAttribute('aria-selected', 'true')
      // The status is text (in the name, and in a line below when not compact), never only the icon's colour.
      expect(screen.getByRole('tab', { name: `${compact ? 'DE' : 'Deutsch'}, Missing text` })).toBeInTheDocument()
      if (compact)
        expect(screen.queryByText('English · Published Sat 17 Oct')).toBeNull()
      else
        expect(screen.getByText('English · Published Sat 17 Oct')).toBeInTheDocument()
    })
  }

  it('a click on Deutsch calls onChange', () => {
    const onChange = renderSwitch()

    fireEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    expect(onChange).toHaveBeenCalledWith('de')
  })

  it('an arrow key only moves the focus; Enter then chooses', () => {
    const onChange = renderSwitch()
    const english = screen.getByRole('tab', { name: /English/ })
    const deutsch = screen.getByRole('tab', { name: /Deutsch/ })

    act(() => english.focus())
    fireEvent.keyDown(english, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(deutsch)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(deutsch, { key: 'Enter' })
    fireEvent.keyUp(deutsch, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('de')
  })
})

/** A laptop: `useIsWide` reads `(min-width: 1024px)`. */
function setWide() {
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('the story editor on the shared switch', () => {
  it('switches the open version from English to Deutsch', async () => {
    setWide()
    const { unmount } = render(
      <LocaleProvider>
        <StoryEditorLabApp state="draft" />
      </LocaleProvider>,
    )

    expect(screen.getByDisplayValue('A morning on the Musegg wall')).toBeInTheDocument()
    const [deutsch] = screen.getAllByRole('tab', { name: /^DE, Published/, hidden: true })

    fireEvent.click(deutsch!)
    expect(await screen.findByDisplayValue('Ein Morgen auf der Museggmauer')).toBeInTheDocument()
    expect(screen.getAllByRole('tab', { name: /^DE, Published/, hidden: true })[0]).toHaveAttribute('aria-selected', 'true')
    unmount()
  })

  it('an arrow onto a version not started leaves it not started; Enter starts it', async () => {
    setWide()
    const { unmount } = render(
      <LocaleProvider>
        <StoryEditorLabApp state="new" />
      </LocaleProvider>,
    )
    const [english] = screen.getAllByRole('tab', { name: /^EN, /, hidden: true })

    act(() => english!.focus())
    fireEvent.keyDown(english!, { key: 'ArrowRight' })
    const [deutsch] = screen.getAllByRole('tab', { name: /^DE, Not started/, hidden: true })

    expect(document.activeElement).toBe(deutsch)
    expect(deutsch).toHaveAttribute('aria-selected', 'false')
    fireEvent.keyDown(deutsch!, { key: 'Enter' })
    fireEvent.keyUp(deutsch!, { key: 'Enter' })
    expect((await screen.findAllByRole('tab', { name: /^DE, Draft/, hidden: true }))[0]).toHaveAttribute('aria-selected', 'true')
    unmount()
  })
})
