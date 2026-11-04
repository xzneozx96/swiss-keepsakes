import { categoryIconGroups, categoryIcons } from '@sk/domain/content'

import { describe, expect, it } from 'vitest'

import {
  categoryIconComponents,
  categoryIconGroupKeys,
  categoryIconGroupLabelKey,
  categoryIconKeys,
  iconLabelKey,
} from '@/features/categories/lib/category-icons'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

describe('[E4.13][AC95] map category icons: drawings and labels', () => {
  it('draws every key of the domain list, with nothing extra', () => {
    expect(Object.keys(categoryIconComponents).sort()).toEqual([...categoryIcons].sort())
    for (const key of categoryIcons) {
      const drawing = categoryIconComponents[key]
      expect(drawing, key).toBeDefined()
      expect(['function', 'object'], key).toContain(typeof drawing)
    }
  })

  it('gives no two keys the same drawing, so two pins never look alike', () => {
    const drawings = Object.values(categoryIconComponents)
    expect(new Set(drawings).size).toBe(drawings.length)
  })

  it('keeps the groups and the keys in the order of the domain list, without duplicates', () => {
    expect(categoryIconGroupKeys).toEqual(categoryIconGroups.map(group => group.key))
    expect(categoryIconKeys).toEqual([...categoryIcons])
    expect(new Set(categoryIconKeys).size).toBe(categoryIconKeys.length)
  })

  it('labels every key and every group in English and German', () => {
    for (const key of categoryIcons) {
      const label = iconLabelKey(key)
      expect(en[label], `${key} en`).toBeTruthy()
      expect(de[label], `${key} de`).toBeTruthy()
    }
    for (const group of categoryIconGroups) {
      const label = categoryIconGroupLabelKey(group.key)
      expect(en[label], `${group.key} en`).toBeTruthy()
      expect(de[label], `${group.key} de`).toBeTruthy()
    }
  })

  it('gives the keys in one language different names, so a screen reader tells them apart', () => {
    for (const dictionary of [en, de]) {
      const names = categoryIcons.map(key => dictionary[iconLabelKey(key)])
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
