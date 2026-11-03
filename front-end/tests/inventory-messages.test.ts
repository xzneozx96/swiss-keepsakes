import { describe, expect, it } from 'vitest'

import { inventoryEn } from '@/features/inventory/messages'
import { inventoryDe } from '@/features/inventory/messages.de'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const placeholders = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort()

describe('[E6.3][AC05][AC53] AC-5 the words of the Inventory screens', () => {
  it('[E6.3][AC05][AC53] AC-5 no English text says "on hand" or "held", and the screens say "In stock" and "Reserved"', () => {
    for (const [key, text] of Object.entries(inventoryEn)) {
      expect(text, key).not.toMatch(/\bon[ -]hand\b/i)
      expect(text, key).not.toMatch(/\bheld\b/i)
    }
    expect(inventoryEn['inventory.column.inStock']).toBe('In stock')
    expect(inventoryEn['inventory.column.reserved']).toBe('Reserved')
    expect(inventoryEn['inventory.tab.soldOut']).toBe('Sold out')
  })

  it('[E6.3][AC05][AC53] AC-5 has a German text for every English key, with the same placeholders, and registers both in the app dictionaries', () => {
    expect(Object.keys(inventoryDe).sort()).toEqual(Object.keys(inventoryEn).sort())
    for (const key of Object.keys(inventoryEn) as (keyof typeof inventoryEn)[]) {
      expect(inventoryDe[key], key).not.toBe('')
      expect(placeholders(inventoryDe[key]), key).toEqual(placeholders(inventoryEn[key]))
      expect(en[key], key).toBe(inventoryEn[key])
      expect(de[key], key).toBe(inventoryDe[key])
    }
  })

  it('[E6.3][AC05][AC53] AC-2 says the refusals in the words of the design', () => {
    expect(inventoryEn['inventory.error.whole']).toBe('Enter a whole number, 0 or more.')
    expect(inventoryEn['inventory.error.most']).toBe('Most 9999.')
    expect(inventoryEn['inventory.error.belowReserved.other']).toBe('{count} units are reserved by orders, so stock can’t go below the {count} reserved.')
    expect(inventoryEn['inventory.error.belowReserved.one']).toBe('{count} unit is reserved by orders, so stock can’t go below the {count} reserved.')
  })
})
