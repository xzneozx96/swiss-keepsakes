import { keyDrift } from '@sk/i18n/key-drift'

import { describe, expect, it } from 'vitest'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

describe('[E1.12][S11] front-end dictionaries', () => {
  it('has every English key in German and no German key without an English one', () => {
    expect(keyDrift(en, de)).toEqual({ onlyEn: [], onlyDe: [] })
  })
})
