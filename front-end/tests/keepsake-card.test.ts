import type { PublicKeepsakeCard } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { en } from '@/i18n/en'

const t = (key: keyof typeof en) => en[key]
const card: PublicKeepsakeCard = {
  id: '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11',
  slug: 'kapellbruecke-mug',
  name: 'Kapellbrücke mug',
  cover: { url: 'https://m.test/o.jpg', variants: [{ width: 400, url: 'https://m.test/400.webp' }, { width: 640, url: 'https://m.test/640.webp' }] },
  soldOut: false,
  language: 'en',
  requestedLanguage: 'de',
  fallback: true,
  availableLanguages: ['en'],
}

describe('[E6.4][AC64] a keepsake card', () => {
  it('links to the address of its own language, with the language note, when the guest\'s language has no version', () => {
    expect(toKeepsakeCard(card, t)).toMatchObject({ slug: 'kapellbruecke-mug', lang: 'en', languageNote: 'Text in English' })
  })

  it('shows the widest copy when none is as wide as the card', () => {
    expect(toKeepsakeCard(card, t).photo).toBe('https://m.test/640.webp')
  })
})
