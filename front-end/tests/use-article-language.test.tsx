import type { Language } from '@sk/domain/shared'

import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadDictionary, LocaleOverride } from '@/contexts/locale-context'
import { useArticle } from '@/features/content/hooks/use-article'
import { articleSeed } from '@/features/content/seed'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'

const waterTower = articleSeed.find(a => a.slug === 'water-tower')!

beforeAll(() => loadDictionary('de'))

beforeEach(() => {
  localStorage.clear()
})

async function renderArticle(slug: string, language: Language, articles: typeof articleSeed) {
  const state = createSeedState()

  localStorage.setItem('sk.demo', JSON.stringify({ ...state, data: { ...state.data, articles } }))
  const demo = startDemo()

  await demo.ready

  return renderHook(() => useArticle(slug), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
          <DemoProvider store={demo.store}>
            <LocaleOverride language={language}>
              <Suspense fallback={null}>{children}</Suspense>
            </LocaleOverride>
          </DemoProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
}

describe('[E3.11] the article is never shown in the other language', () => {
  it('shows the German version when it is published', async () => {
    const { result } = await renderArticle('water-tower', 'de', [...articleSeed, { ...waterTower, id: 'water-tower-de', language: 'de' }])

    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current?.article.language).toBe('de')
  })

  it('finds nothing in German when the German version is a draft, rather than showing the English text', async () => {
    const { result } = await renderArticle('water-tower', 'de', [...articleSeed, { ...waterTower, id: 'water-tower-de', language: 'de', publication: { status: 'draft' } }])

    await waitFor(() => expect(result.current).toBeNull())
  })

  it('finds nothing in German for an English-only story', async () => {
    const { result } = await renderArticle('water-tower', 'de', articleSeed)

    await waitFor(() => expect(result.current).toBeNull())
  })

  it('still shows the English version at the English address', async () => {
    const { result } = await renderArticle('water-tower', 'en', articleSeed)

    await waitFor(() => expect(result.current?.article.language).toBe('en'))
  })
})
