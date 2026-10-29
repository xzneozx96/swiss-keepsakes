import type { KeepsakeLabSearch, LabState } from '@/features/lab/keepsake-editor-search-params'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { KeepsakeEditorLabApp } from '@/features/lab/keepsake-editor-app'
import { stateIds } from '@/features/lab/keepsake-editor-search-params'

// jsdom has no CSS.supports; some shared fields ask it at import time.
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

afterEach(() => {
  window.matchMedia = original
})

function renderApp(state: LabState, patch: Partial<KeepsakeLabSearch> = {}) {
  return render(
    <LocaleProvider>
      <KeepsakeEditorLabApp search={{ embed: 1, state, width: 'desktop', ...patch }} />
    </LocaleProvider>,
  )
}

describe('[E6.1][E6.2][E6.3] every screen renders in every lab state', () => {
  for (const wide of [true, false]) {
    for (const state of stateIds) {
      it(`${state}, ${wide ? 'laptop' : 'phone'}`, () => {
        setWide(wide)
        const { unmount } = renderApp(state)

        expect(document.body.textContent).not.toMatch(/engrav/i)
        unmount()
      })
    }
  }
})

describe('each refusal shows where it happens', () => {
  const cases: { state: LabState, text: RegExp }[] = [
    { state: 'inuse', text: /Can’t delete Lion Monument\. Used by 2 variants \(VX-S-LION, VX-L-LION\)/ },
    { state: 'newoption', text: /VX-M-STEAMBOAT needs a colour/ },
    { state: 'duplicate', text: /already sold as VX-S-SWAN/ },
    { state: 'belowheld', text: /2 units are reserved by orders, so stock can’t go below the 2 reserved/ },
    { state: 'blocked', text: /2 things stop publishing/ },
  ]

  for (const { state, text } of cases) {
    it(state, () => {
      setWide(true)
      const { unmount } = renderApp(state)

      expect(screen.getAllByText(text).length).toBeGreaterThan(0)
      unmount()
    })
  }
})

describe('the screens link and save', () => {
  it('the inventory item lists what orders reserve, which adds up to the reserved figure', () => {
    setWide(true)
    const { unmount } = renderApp('item')

    expect(screen.getByText('SK-1044')).toBeTruthy()
    expect(screen.getByText('SK-1049')).toBeTruthy()
    expect(screen.getByText('3 reserved')).toBeTruthy()
    unmount()
  })

  it('the item links to its variant, and the variant to the product', () => {
    setWide(true)
    const { unmount } = renderApp('item')

    fireEvent.click(screen.getByRole('button', { name: /Small \/ Pilatus/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Small / Pilatus' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Victorinox pocket knife, Lucerne designs' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Victorinox pocket knife, Lucerne designs' })).toBeTruthy()
    unmount()
  })

  it('adding Colour saves once every variant has one, and the table gets a Colour column', () => {
    setWide(true)
    const { unmount } = renderApp('newoption')

    fireEvent.click(screen.getAllByRole('button', { name: 'Red' })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Save options' }))
    expect(screen.getAllByRole('columnheader', { name: 'Colour' }).length).toBe(1)
    unmount()
  })

  it('the create flow creates only the ticked combinations', () => {
    setWide(true)
    const { unmount } = renderApp('create-variants')

    fireEvent.click(screen.getByRole('button', { name: /Next: Stock/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Victorinox SwissCard, Lucerne designs' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /^All\s*7$/ })).toBeTruthy()
    unmount()
  })

  it('no screen has a breadcrumb; each page reached by clicking has a back arrow, the lists have none', () => {
    setWide(true)
    const back: [LabState, string | null][] = [
      ['products', null],
      ['inventory', null],
      ['product', 'Back to Keepsakes'],
      ['review', 'Back to editing'],
      ['create-details', 'Back to Keepsakes'],
      ['variant', 'Back to Victorinox pocket knife, Lucerne designs'],
      ['item', 'Back to Inventory'],
    ]

    for (const [state, name] of back) {
      const { unmount } = renderApp(state)

      expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).toBeNull()
      expect(screen.queryAllByRole('button', { name: /^Back to/ }).map(b => b.getAttribute('aria-label'))).toEqual(name ? [name] : [])
      unmount()
    }
  })

  it('the item opened from its variant goes back to the variant; the sidebar follows', () => {
    setWide(true)
    const { unmount } = renderApp('variant')
    const sidebar = () => screen.getAllByRole('navigation', { name: 'Merchant' })[0]!
    const current = () => sidebar().querySelector('[aria-current=page]')?.textContent

    expect(current()).toBe('Keepsakes')
    fireEvent.click(screen.getByRole('button', { name: 'Open inventory item' }))
    expect(current()).toBe('Inventory')
    fireEvent.click(screen.getByRole('button', { name: 'Back to the variant VX-S-PILATUS' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Small / Pilatus' })).toBeTruthy()
    expect(current()).toBe('Keepsakes')
    unmount()
  })

  it('give all: each variant picks a named value of the new option, never an empty chip', () => {
    setWide(true)
    const { unmount } = renderApp('newoption')
    const section = screen.getByRole('region', { name: 'A colour for every variant' })
    const row = within(section).getByText('VX-S-SWAN').closest('li')!
    const chips = () => Array.from(row.querySelectorAll('.tag'), t => t.textContent)

    expect(chips()).toEqual(['Red', 'Black', 'Navy'])
    expect(within(row).getByRole('row', { name: 'Red' }).getAttribute('aria-selected')).toBe('true')
    // A value with no name yet (Add a value) was an empty capsule in every row.
    fireEvent.click(screen.getByRole('button', { name: 'Add a value' }))
    expect(chips()).toEqual(['Red', 'Black', 'Navy'])
    expect(within(section).getAllByRole('button').map(b => b.textContent)).toEqual(['Red', 'Black', 'Navy'])
    unmount()
  })

  it('a new option asks for a value per variant only once a value has a name', () => {
    setWide(true)
    const { unmount } = renderApp('product')

    fireEvent.click(screen.getByRole('button', { name: 'Add option' }))
    expect(screen.queryByText(/for each of your/)).toBeNull()
    fireEvent.change(screen.getAllByRole('textbox', { name: 'English' })[0]!, { target: { value: 'Gold' } })
    const section = screen.getByRole('region', { name: 'A value for every variant' })
    const row = within(section).getByText('VX-S-SWAN').closest('li')!

    expect(Array.from(row.querySelectorAll('.tag'), t => t.textContent)).toEqual(['Gold'])
    unmount()
  })

  it('shows one status line per page, under the title, with no badge', () => {
    setWide(true)
    for (const [state, text] of [['product', 'Published'], ['variant', 'For sale'], ['item', '2 available']] as const) {
      const { unmount } = renderApp(state)
      const title = screen.getByRole('heading', { level: 1 })

      expect(title.getAttribute('title')).toBe(title.textContent)
      const head = title.closest('header, .sticky')!

      expect(head.textContent).toContain(text)
      expect(head.querySelector('.chip')).toBeNull()
      expect(screen.getAllByText(text)).toHaveLength(1)
      unmount()
    }
  })

  it('the name and text card uses the shared language switch', () => {
    setWide(true)
    const { unmount } = renderApp('product')
    const tabs = within(screen.getByRole('tablist', { name: 'Language version' })).getAllByRole('tab')

    expect(tabs).toHaveLength(2)
    expect(tabs[0]!.textContent).toContain('English')
    expect(tabs[1]!.textContent).toContain('Deutsch')
    expect(screen.getAllByText(/Complete/).length).toBeGreaterThan(0)
    unmount()
  })

  it('options show their values as small chips; variants stay plain text', () => {
    setWide(true)
    const { unmount } = renderApp('product')

    const sizeRow = screen.getByRole('rowheader', { name: /Size/ }).closest('tr')!
    expect(Array.from(sizeRow.querySelectorAll('.chip'), c => c.textContent)).toEqual(['Small', 'Medium', 'Large'])
    expect(document.querySelector('#product-variants td span.rounded-full.bg-default')).toBeNull()
    expect(document.querySelector('#product-variants table')!.textContent).toContain('Pilatus')
    unmount()
  })

  it('name, text, media and commission autosave on the edit screen', () => {
    vi.useFakeTimers()
    setWide(true)
    const { unmount } = renderApp('product')

    fireEvent.change(screen.getByRole('textbox', { name: /Name \(English\)/ }), { target: { value: 'Victorinox pocket knife' } })
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.getByText('Saving…')).toBeTruthy()
    act(() => vi.advanceTimersByTime(700))
    expect(screen.getByText(/^Saved \d/)).toBeTruthy()
    expect(screen.getAllByText('Published · edits not live')).toHaveLength(1)
    unmount()
    vi.useRealTimers()
  })

  it('review shows the checks; Edit goes back to the field, Publish is off while blocked', () => {
    setWide(true)
    const { unmount } = renderApp('blocked')

    expect(screen.getByText('2 things stop publishing')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/The preview is a stand-in/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    expect(screen.getByRole('button', { name: /Review and publish/ })).toBeTruthy()
    expect(screen.getAllByText('Add the text in the same language as the name.').length).toBeGreaterThan(0)
    unmount()
  })

  it('review on a phone shows only the preview, its language switch and the pinned bar', () => {
    setWide(false)
    const { unmount } = renderApp('review')

    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Show' })).toBeNull()
    expect(screen.queryByText('Complete in')).toBeNull()
    expect(screen.getByRole('tablist', { name: 'Language version' })).toBeTruthy()
    expect(screen.getByText(/Ready · 3 to look at/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeTruthy()
    unmount()
  })

  it('on a phone the blocked review opens the checks, and Edit still goes back to the field', () => {
    setWide(false)
    const { unmount } = renderApp('blocked')

    expect(screen.getAllByText('2 things stop publishing').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    // Back on the edit screen: its top bar has Review again (phone and laptop labels in one button).
    expect(screen.getByRole('button', { name: /^Review/ })).toBeTruthy()
    expect(screen.getAllByText('Add the text in the same language as the name.').length).toBeGreaterThan(0)
    unmount()
  })

  it('available and reserved are two lines, never joined with a dot', () => {
    // The laptop inventory table has its own Reserved and Available columns.
    for (const [state, wide] of [['product', true], ['product', false], ['inventory', false]] as const) {
      setWide(wide)
      const { unmount } = renderApp(state)
      // VX-L-SWAN: sold out with 2 reserved, as the first line and the muted line under it.
      const sold = screen.getAllByText('Sold out').find(e => e.nextElementSibling?.textContent === '2 reserved')!

      expect(sold.className).toContain('whitespace-nowrap')
      expect(sold.nextElementSibling!.className).toContain('whitespace-nowrap')
      expect(document.body.textContent).not.toMatch(/reserved · |available · \d+ reserved/)
      unmount()
    }
  })

  it('destructive menu items use the danger tone, and the wording says reserved', () => {
    setWide(true)
    const { unmount } = renderApp('product')

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Size' }))
    expect(screen.getByRole('menuitem', { name: 'Delete' }).className).toContain('menu-item--danger')
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).not.toContain('danger')
    expect(document.body.textContent).not.toMatch(/\bheld\b/i)
    unmount()
  })

  it('stock reads "In stock", never "on hand", on the stock screens', () => {
    setWide(true)
    for (const state of ['inventory', 'item', 'belowheld', 'variant'] as const) {
      const { unmount } = renderApp(state)

      expect(document.body.textContent).not.toMatch(/on hand/i)
      expect(document.body.textContent).toContain('In stock')
      unmount()
    }
  })
})
