import type { MerchantCategory } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { categoryLabel, includedParents, toggleCategory, visibleCategories } from '@/features/stories/lib/categories'

function category(id: string, en: string | null, de: string | null, parentId: string | null = null, position = 0): MerchantCategory {
  return { id, slug: id, parentId, name: { en, de }, icon: null, showOnHome: false, position, childCount: 0, useCount: 0 }
}

const all = [
  category('history', 'Swiss history', 'Schweizer Geschichte'),
  category('oldTown', 'Old Town', null, 'history'),
  category('tips', 'Practical tips', 'Praktische Tipps'),
]

describe('[E4.3][AC87] blog category rules', () => {
  it.each([
    [[], 'oldTown', ['oldTown']],
    [['oldTown'], 'history', ['history']],
    [['history'], 'oldTown', ['oldTown']],
    [['oldTown'], 'oldTown', []],
    [[], 'history', ['history']],
  ])('[E4.3][AC87] AC-2 toggling %j with %s gives %j', (before, pick, after) => {
    expect(toggleCategory(before, pick, all)).toEqual(after)
  })

  it('[E4.3][AC87] a parent never selects its children and a second parent is independent', () => {
    expect(toggleCategory(['tips'], 'history', all)).toEqual(['tips', 'history'])
  })

  it('[E4.3][AC87] at 20 chosen a 21st changes nothing', () => {
    const ids = Array.from({ length: 20 }, (_, n) => `c${n}`)

    expect(toggleCategory(ids, 'x', all)).toEqual(ids)
    expect(toggleCategory(ids, 'c3', all)).toHaveLength(19)
  })

  it('[E4.3][AC87] includedParents lists a parent once even with two chosen children', () => {
    const two = [...all, category('gate', 'Gate', null, 'history')]

    expect(includedParents(['oldTown', 'gate'], two)).toEqual(['history'])
    expect(includedParents(['history'], two)).toEqual([])
  })

  it('[E4.3][AC87] AC-1 search matches either language', () => {
    const ids = (query: string) => visibleCategories(all, query).map(item => item.id)

    expect(ids('geschichte')).toEqual(['history', 'oldTown'])
    expect(ids('old')).toEqual(['history', 'oldTown'])
    expect(ids('xyz')).toEqual([])
    expect(ids('')).toEqual(['history', 'oldTown', 'tips'])
  })

  it('[E4.3][AC87] categoryLabel falls back to the other language', () => {
    expect(categoryLabel(all[1]!, 'de')).toBe('Old Town')
    expect(categoryLabel(all[0]!, 'de')).toBe('Schweizer Geschichte')
  })
})
