import { describe, expect, it } from 'vitest'
import { signInCodeLanguage } from '../../src/platform/auth.ts'

describe('[E2.2] signInCodeLanguage: the SPA sends its language in Accept-Language', () => {
  it.each([
    ['de', 'de'],
    ['de-CH', 'de'],
    ['DE-ch,en;q=0.8', 'de'],
    ['en', 'en'],
    ['en-US,de;q=0.5', 'en'],
    ['fr', 'en'],
    ['deutsch', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    [null, 'en'],
  ])('[E2.2] %j is %s', (header, language) => {
    expect(signInCodeLanguage(header)).toBe(language)
  })
})
