import { describe, expect, it } from 'vitest'
import { languageNotice, pickLanguage } from '../src/content/index.ts'

describe('[E2.12][AC64] pickLanguage', () => {
  it('falls back to the other language, prefers the requested one, and returns null when none', () => {
    expect(pickLanguage(['en'], 'de')).toEqual({ language: 'en', fallback: true })
    expect(pickLanguage(['en', 'de'], 'de')).toEqual({ language: 'de', fallback: false })
    expect(pickLanguage([], 'de')).toBeNull()
  })
})

describe('[E2.12][AC64] languageNotice', () => {
  it('names the language shown, the one asked for, the fallback and the languages that exist, or null when none', () => {
    expect(languageNotice(['en'], 'de')).toEqual({ language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
    expect(languageNotice(['en', 'de'], 'de')).toEqual({ language: 'de', requestedLanguage: 'de', fallback: false, availableLanguages: ['en', 'de'] })
    expect(languageNotice([], 'en')).toBeNull()
  })
})
