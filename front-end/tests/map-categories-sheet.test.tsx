import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/contexts/locale-context'
import { CategoriesSheet } from '@/features/map/components/categories-sheet'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function category(n: number, parentId: string | null, position: number, name: string): PublicCategory {
  return { id: id(n), slug: `c${n}`, name: { en: name, de: name }, parentId, icon: null, showOnHome: false, position }
}

const walks = category(1, null, 0, 'Walks')
const info = category(2, null, 1, 'Useful info')
const water = category(3, info.id, 0, 'Drinking water')
const toilets = category(4, info.id, 1, 'Toilets')
const wifi = category(5, info.id, 2, 'Wi-Fi')
const categories = [walks, info, water, toilets, wifi]

function pin(n: number, categoryIds: string[]): PublicMapItem {
  return {
    id: id(100 + n),
    slug: `pin-${n}`,
    latitude: 47,
    longitude: 8,
    title: `Pin ${n}`,
    language: 'en',
    categoryIds,
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
  }
}

// Two walks, a fountain (info + water), a toilet (info + toilets).
const pins = [pin(1, [walks.id]), pin(2, [walks.id]), pin(3, [water.id, info.id]), pin(4, [toilets.id, info.id])]

function open(chosen: string[]) {
  const onApply = vi.fn()

  render(
    <LocaleProvider>
      <CategoriesSheet categories={categories} chosen={chosen} pins={pins} onApply={onApply} onClose={() => {}} />
    </LocaleProvider>,
  )

  return onApply
}

const box = (name: RegExp) => screen.getByRole<HTMLInputElement>('checkbox', { name })
const apply = () => userEvent.click(screen.getByRole('button', { name: /^Show \d+ place/ }))

describe('[map] the Categories sheet lists sub-categories', () => {
  it('opens on a chosen sub-category: parent expanded and indeterminate, child ticked, siblings not', async () => {
    open([water.id])

    expect(await screen.findByRole('button', { name: /Sub-categories of Useful info/ })).toHaveAttribute('aria-expanded', 'true')
    expect(box(/Drinking water/).checked).toBe(true)
    expect(box(/Toilets/).checked).toBe(false)
    expect(box(/Useful info/).checked).toBe(false)
    expect(box(/Useful info/).indeterminate).toBe(true)
    expect(box(/All categories/).indeterminate).toBe(true)
  })

  it('shows no chevron on a row without children and starts other parents collapsed', async () => {
    open([water.id])
    await screen.findByRole('button', { name: /Sub-categories of Useful info/ })

    expect(screen.getAllByRole('button', { name: /Sub-categories of/ })).toHaveLength(1)
  })

  it('counts each row, a parent including its children', async () => {
    open([water.id])

    expect(await screen.findByRole('checkbox', { name: /Useful info\s*2/ })).toBeInTheDocument()
    expect(box(/Drinking water\s*1/)).toBeInTheDocument()
    expect(box(/Walks\s*2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show 1 place' })).toBeInTheDocument()
  })

  it('ticking a second child applies both child slugs, parent still indeterminate', async () => {
    const onApply = open([water.id])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Toilets/ }))
    expect(box(/Useful info/).indeterminate).toBe(true)
    await apply()

    expect(onApply).toHaveBeenCalledWith([water.id, toilets.id])
  })

  it('ticking every child collapses to the parent', async () => {
    const onApply = open([water.id, toilets.id])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Wi-Fi/ }))
    expect(box(/Useful info/).checked).toBe(true)
    expect(box(/Useful info/).indeterminate).toBe(false)
    await apply()

    expect(onApply).toHaveBeenCalledWith([info.id])
  })

  it('unticking a child of a ticked parent keeps the other children', async () => {
    const onApply = open([info.id])

    await userEvent.click(await screen.findByRole('button', { name: /Sub-categories of Useful info/ }))
    expect(box(/Toilets/).checked).toBe(true)
    await userEvent.click(box(/Toilets/))
    expect(box(/Useful info/).checked).toBe(false)
    expect(box(/Useful info/).indeterminate).toBe(true)
    await apply()

    expect(onApply).toHaveBeenCalledWith([water.id, wifi.id])
  })

  it('ticking an indeterminate parent covers all its children', async () => {
    const onApply = open([water.id])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Useful info/ }))
    expect(box(/Toilets/).checked).toBe(true)
    await apply()

    expect(onApply).toHaveBeenCalledWith([info.id])
  })

  it('ticking every top-level row is All: apply sends no filter', async () => {
    const onApply = open([water.id])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Useful info/ }))
    await userEvent.click(box(/Walks/))
    expect(box(/All categories/).checked).toBe(true)
    await apply()

    expect(onApply).toHaveBeenCalledWith([])
  })

  it('clearing every child leaves the pick-one notice and a disabled apply', async () => {
    open([water.id])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Drinking water/ }))

    expect(screen.getByText('Pick at least one category.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Show \d+ place/ })).toBeDisabled()
  })

  it('the chevron opens and closes the children', async () => {
    open([])
    const chevron = screen.getByRole('button', { name: /Sub-categories of Useful info/ })

    expect(chevron).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(chevron)
    expect(chevron).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Useful info' })).toBeInTheDocument()
    await userEvent.click(chevron)
    expect(screen.queryByRole('checkbox', { name: /Toilets/ })).toBeNull()
  })
})
