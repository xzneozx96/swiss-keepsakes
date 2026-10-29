import type { LabState } from '@/features/lab/media-search-params'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { MediaLabApp } from '@/features/lab/media-app'
import { stateIds } from '@/features/lab/media-search-params'

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

afterEach(() => {
  window.matchMedia = original
})

function renderLibrary(state: LabState) {
  return render(
    <LocaleProvider>
      <MediaLabApp search={{ embed: 1, state, width: 'desktop' }} />
    </LocaleProvider>,
  )
}

describe('[E4.11] the media library renders every state', () => {
  for (const wide of [true, false]) {
    for (const state of stateIds) {
      it(`${state} · ${wide ? 'laptop' : 'phone'}`, () => {
        setWide(wide)
        const { unmount } = renderLibrary(state)

        // `hidden`: in the refused state the open sheet hides the page behind it.
        expect(screen.getByRole('searchbox', { name: 'Search by name', hidden: true })).toBeInTheDocument()
        if (state === 'empty')
          expect(screen.getByText(/No files yet/)).toBeInTheDocument()
        if (state === 'nomatch')
          expect(screen.getByText(/No file matches/)).toBeInTheDocument()
        unmount()
      })
    }
  }
})

describe('[E4.11] the photo wall', () => {
  it('shows 24 photos a page, each with its name under it, and no upload card', () => {
    setWide(true)
    renderLibrary('normal')
    const wall = screen.getByRole('list', { name: 'Photos' })

    const tiles = wall.querySelectorAll(':scope > li button')

    expect(tiles).toHaveLength(24)
    for (const tile of tiles)
      expect(tile.textContent).toContain(tile.getAttribute('aria-label') ?? '-')
    expect(screen.queryByText('Uploads')).toBeNull()
    expect(screen.queryByText('Clear finished')).toBeNull()
  })

  it('puts just-uploaded files at the top of their kind, processing', () => {
    setWide(true)
    renderLibrary('upload')
    const tiles = screen.getByRole('list', { name: 'Photos' }).querySelectorAll(':scope > li button')

    expect(tiles[0]).toHaveAccessibleName('kapellbruecke-dawn.jpg')
    expect(tiles[1]).toHaveAccessibleName('hofkirche-organ.jpg')
  })
})

describe('[E4.11] retire refused', () => {
  for (const wide of [true, false]) {
    it(`shows the reason in the sheet and Retire off · ${wide ? 'laptop' : 'phone'}`, () => {
      setWide(wide)
      renderLibrary('refused')

      expect(screen.getByText('Not retired')).toBeInTheDocument()
      expect(screen.getByText('Only in drafts (1)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retire' })).toBeDisabled()
      expect(screen.getByText(/Used on 1 page/)).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('old-swiss-house.jpg')
      // Where used: the whole row is the link, with the page title and what the file is there.
      expect(screen.getByRole('button', { name: /The dying lion of Lucerne.*Story · DE · photo/ })).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.queryByText(/Alt text/)).toBeNull()
      // Info: one row per fact, the file name with non-breaking hyphens so it never splits mid-name.
      expect(screen.getByRole('heading', { name: 'Info' })).toBeInTheDocument()
      expect(screen.getByText('Uploaded as').nextElementSibling).toHaveTextContent('old\u2011swiss\u2011house.jpg')
    })
  }
})
