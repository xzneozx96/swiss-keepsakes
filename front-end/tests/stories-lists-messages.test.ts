import { describe, expect, it } from 'vitest'

import { storiesListsEn } from '@/features/stories/messages-lists'
import { storiesListsDe } from '@/features/stories/messages-lists.de'
import { en } from '@/i18n/en'

const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort()

describe('[E4.3][AC33] linked cards messages', () => {
  it('[E4.3][AC33] every storyLists key has a German string with the same placeholders', () => {
    const english = storiesListsEn as Record<string, string>
    const german = storiesListsDe as Record<string, string>

    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english)) {
      expect(german[key]?.trim(), key).not.toBe('')
      expect(names(german[key]!), key).toEqual(names(english[key]!))
    }
  })

  it('[E4.3][AC33] every key starts with storyLists. and the app dictionary holds each of them once', () => {
    const keys = Object.keys(storiesListsEn)

    expect(keys.every(key => key.startsWith('storyLists.'))).toBe(true)
    for (const key of keys)
      expect((en as Record<string, string>)[key], key).toBe((storiesListsEn as Record<string, string>)[key])
  })

  it('[E4.3][AC33] the plural keys come in pairs of one and other', () => {
    const keys = Object.keys(storiesListsEn)

    for (const key of keys.filter(item => item.endsWith('.one')))
      expect(keys, key).toContain(key.replace(/\.one$/, '.other'))
  })
})
