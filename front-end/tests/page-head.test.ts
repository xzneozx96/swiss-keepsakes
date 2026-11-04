import { describe, expect, it } from 'vitest'
import { alternateHead } from '@/features/seo/lib/page-head'

describe('[E6.4][AC61] alternateHead', () => {
  const head = alternateHead({ lang: 'de', path: l => `/${l}/gifts`, title: 'Andenken', description: 'Beschreibung' })

  it('sets title and description', () => {
    expect(head.meta).toEqual([
      { title: 'Andenken' },
      { name: 'description', content: 'Beschreibung' },
    ])
  })

  it('sets an absolute canonical for the page language and hreflang for en, de and x-default (en)', () => {
    const site = (import.meta.env.VITE_SITE_URL || 'http://localhost:3002').replace(/\/+$/, '')

    expect(head.links).toEqual([
      { rel: 'canonical', href: `${site}/de/gifts` },
      { rel: 'alternate', hrefLang: 'en', href: `${site}/en/gifts` },
      { rel: 'alternate', hrefLang: 'de', href: `${site}/de/gifts` },
      { rel: 'alternate', hrefLang: 'x-default', href: `${site}/en/gifts` },
    ])
  })
})
