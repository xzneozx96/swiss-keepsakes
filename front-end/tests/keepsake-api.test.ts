import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAvailability, fetchKeepsake } from '@/features/catalog/api/keepsake'

const id = '0b1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a11'
const detail = {
  id,
  slug: 'kapellbruecke-tasse',
  name: 'Kapellbrücke mug',
  cover: null,
  soldOut: false,
  language: 'en',
  requestedLanguage: 'en',
  availableLanguages: ['en', 'de'],
  fallback: false,
  description: { type: 'doc', content: [] },
  photos: [],
  options: [],
  variants: [{ id: '5a1f3c1e-0a53-4d5e-8f0d-2f0f4d3b8a22', values: {}, photo: null }],
  otherSlug: null,
}

afterEach(() => vi.unstubAllGlobals())

describe('[E6.4][AC52] fetchKeepsake reads the public detail', () => {
  it('asks /api/public/keepsakes/{slug} in the language and returns the parsed keepsake', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json(detail)
    })

    expect(await fetchKeepsake('kapellbruecke-tasse', 'de')).toEqual(detail)
    expect(new URL(urls[0]!).pathname).toBe('/api/public/keepsakes/kapellbruecke-tasse')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('de')
  })

  it('returns null for a 404 (no such published keepsake)', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'Not found' }, { status: 404 }))

    expect(await fetchKeepsake('nope', 'en')).toBeNull()
  })

  it('throws for any other failure and for a body that is not a keepsake', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'down' }, { status: 503 }))
    await expect(fetchKeepsake('x', 'en')).rejects.toThrow()

    vi.stubGlobal('fetch', async () => Response.json({ slug: 1 }))
    await expect(fetchKeepsake('x', 'en')).rejects.toThrow()
  })
})

describe('[E6.4][AC52] fetchAvailability reads price and units', () => {
  it('asks /availability with the language and returns the parsed items', async () => {
    const urls: string[] = []
    const items = [{ variantId: id, priceRappen: 1990, currency: 'CHF', available: 3 }]
    vi.stubGlobal('fetch', async (input: Request) => {
      urls.push(input.url)
      return Response.json({ items })
    })

    expect((await fetchAvailability('kapellbruecke-tasse', 'en')).items).toEqual(items)
    expect(new URL(urls[0]!).pathname).toBe('/api/public/keepsakes/kapellbruecke-tasse/availability')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('en')
  })

  it('throws when the read fails', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ title: 'down' }, { status: 500 }))

    await expect(fetchAvailability('x', 'en')).rejects.toThrow()
  })
})
