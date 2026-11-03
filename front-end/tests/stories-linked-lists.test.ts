import { describe, expect, it } from 'vitest'

import { hiddenFor, keepsakeOptionOf, MAX_KEEPSAKES, MAX_PLACES, MAX_RELATED, offeredKeepsakes, offeredStories, storyOptionOf, toggleLinked } from '@/features/stories/lib/linked-lists'
import { listItem as keepsakeItem } from './keepsakes-harness'
import { listVersion, publishedVersion, listItem as storyItem, uuid } from './stories-harness'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i + 1}`)

describe('[E4.3][AC33][AC54] the caps and the offered lists of the linked cards', () => {
  it('[E4.3][AC33] AC-1 a fourth related story changes nothing', () => {
    const chosen = ['a', 'b', 'c']

    expect(MAX_RELATED).toBe(3)
    expect(toggleLinked(chosen, 'd', MAX_RELATED)).toBe(chosen)
    expect(toggleLinked(chosen, 'b', MAX_RELATED)).toEqual(['a', 'c'])
  })

  it('[E4.3][AC54] AC-3 a seventh keepsake changes nothing, order is the order of choosing', () => {
    const six = ids(6)

    expect(MAX_KEEPSAKES).toBe(6)
    expect(toggleLinked(six, '7', MAX_KEEPSAKES)).toBe(six)
    expect(toggleLinked(['b'], 'a', 6)).toEqual(['b', 'a'])
  })

  it('[E4.3][AC30] AC-6 the places cap is 50', () => {
    const fifty = ids(50)

    expect(MAX_PLACES).toBe(50)
    expect(toggleLinked(fifty, 'extra', MAX_PLACES)).toBe(fifty)
    expect(toggleLinked(ids(49), 'extra', MAX_PLACES)).toHaveLength(50)
  })

  it('[E4.3][AC54] AC-3 only published keepsakes are offered, and a draft and an archived one are not', () => {
    const all = (['published', 'draft', 'archived'] as const).map((status, i) => keepsakeOptionOf(keepsakeItem({ id: uuid(i + 1), status, name: { en: `K${i}` } }) as never, 'en'))

    expect(offeredKeepsakes(all).map(option => option.name)).toEqual(['K0'])
  })

  it('[E4.3][AC54] AC-3 a keepsake option carries a name and a photo and no price key', () => {
    const option = keepsakeOptionOf(keepsakeItem({ name: { en: 'Classic' } }) as never, 'en')

    expect(option.name).toBe('Classic')
    expect(option.photo).toEqual(expect.any(String))
    expect(Object.keys(option)).not.toContain('price')
    expect(keepsakeOptionOf(keepsakeItem({ name: { de: 'Klassik' } }) as never, 'en').name).toBe('Klassik')
    expect(keepsakeOptionOf(keepsakeItem({ name: {} }) as never, 'en').name).toBe('')
  })

  it('[E4.3][AC33] AC-2 the story being edited is not offered', () => {
    const all = [1, 2, 3].map(n => storyOptionOf(storyItem(n) as never, 'en', 'Untitled'))

    expect(offeredStories(all, uuid(2)).map(option => option.id)).toEqual([uuid(1), uuid(3)])
  })

  it('[E4.3][AC33] AC-5 hiddenFor is about published in the open language', () => {
    const option = (over: Record<string, unknown>) => storyOptionOf(storyItem(1, over) as never, 'en', 'Untitled')
    const englishOnly = option({ languages: { en: publishedVersion(), de: null } })
    const germanDraft = option({ languages: { en: null, de: listVersion() } })
    const none = option({ languages: { en: null, de: null } })

    expect(hiddenFor(englishOnly, 'de')).toBe(true)
    expect(hiddenFor(englishOnly, 'en')).toBe(false)
    expect(hiddenFor(germanDraft, 'de')).toBe(true)
    expect(hiddenFor(germanDraft, 'en')).toBe(true)
    expect(hiddenFor(none, 'en')).toBe(true)
  })

  it('[E4.3][AC33] a story title falls back to the other language, then to the untitled word', () => {
    expect(storyOptionOf(storyItem(1, { title: { de: 'Titel' } }) as never, 'en', 'Untitled').title).toBe('Titel')
    expect(storyOptionOf(storyItem(1, { title: {} }) as never, 'en', 'Untitled').title).toBe('Untitled')
    expect(storyOptionOf(storyItem(1, { languages: { en: publishedVersion(), de: null } }) as never, 'en', 'U').states).toEqual({ en: 'published', de: 'none' })
  })
})
