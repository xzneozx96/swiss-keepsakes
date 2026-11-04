import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadPublicStories } from '@/features/content/api/public-stories'
import { storiesHead } from '@/features/content/lib/stories-head'
import { contentEn } from '@/features/content/messages'
import { contentDe as de } from '@/features/content/messages.de'
import { storyCard } from './support/story-cards'

afterEach(() => vi.unstubAllGlobals())

describe('[E4.4] public stories read', () => {
  it('[E4.4][AC61] reads the public list in the page language and keeps the server order', async () => {
    const urls: string[] = []
    const cards = [storyCard({ title: 'New' }), storyCard({ title: 'Old' })]
    vi.stubGlobal('fetch', async (input: Request | string) => {
      urls.push(typeof input === 'string' ? input : input.url)
      return Response.json({ items: cards })
    })

    const items = await loadPublicStories('de')

    expect(items.map(s => s.title)).toEqual(['New', 'Old'])
    expect(new URL(urls[0]!).pathname).toBe('/api/public/stories')
    expect(new URL(urls[0]!).searchParams.get('lang')).toBe('de')
  })

  it('[E4.4][AC54] a failed read throws, so the page shows the error and never a demo story', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 500 }))

    await expect(loadPublicStories('en')).rejects.toThrow()
  })
})

describe('[E4.4] head', () => {
  it('[E4.4][AC61] carries title, description, canonical and both language alternates as absolute URLs', () => {
    const head = storiesHead('de')

    expect(head.meta).toEqual(expect.arrayContaining([{ title: de['stories.title'] }, { name: 'description', content: de['stories.intro'] }]))
    const href = (rel: string, hrefLang?: string) => head.links.find(l => l.rel === rel && l.hrefLang === hrefLang)?.href
    expect(href('canonical')).toMatch(/^https?:\/\/.+\/de\/stories$/)
    expect(href('alternate', 'en')).toMatch(/^https?:\/\/.+\/en\/stories$/)
    expect(href('alternate', 'de')).toMatch(/^https?:\/\/.+\/de\/stories$/)
    expect(href('alternate', 'x-default')).toMatch(/^https?:\/\/.+\/en\/stories$/)
  })

  it('[E4.4][AC61] the head words match the screen words', () => {
    expect(storiesHead('en').meta).toEqual(expect.arrayContaining([{ title: contentEn['stories.title'] }, { name: 'description', content: contentEn['stories.intro'] }]))
  })
})
