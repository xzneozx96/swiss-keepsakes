import { toast } from '@heroui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useArticleEditor } from '@/features/content/merchant/hooks/use-article-editor'
import { articleSeed } from '@/features/content/seed'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'

const waterTower = articleSeed.find(a => a.id === 'water-tower-en')!
const published = { ...waterTower, publication: { status: 'published' as const, publishedAt: '2026-10-01T10:00:00.000Z' } }
const draft = { ...waterTower, publication: { status: 'draft' as const } }

beforeEach(() => {
  localStorage.clear()
})

/** The editor on the real demo client, with `updateArticle` held until `release` so a second tap can arrive while it is in flight. */
async function renderEditor(article: typeof waterTower) {
  const state = createSeedState()

  localStorage.setItem('sk.demo', JSON.stringify({ ...state, data: { ...state.data, articles: [article] } }))
  const demo = startDemo()

  await demo.ready
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const dataClient = {
    ...demo.dataClient,
    content: {
      ...demo.dataClient.content,
      updateArticle: async (input: Parameters<typeof demo.dataClient.content.updateArticle>[0]) => {
        await held
        await demo.dataClient.content.updateArticle(input)
      },
    },
  }
  const view = renderHook(() => useArticleEditor(article.id, 'en'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={dataClient}>
          <LocaleProvider>
            <ApiFeedbackBridge feedback={demo.feedback} />
            <DemoProvider store={demo.store}>
              <Suspense fallback={null}>{children}</Suspense>
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })

  await waitFor(() => expect(view.result.current?.stored).toBeDefined())

  return { ...view, release }
}

describe('the article editor toasts the text of the save that ran', () => {
  it.each([
    ['publishes a draft', draft, (e: ReturnType<typeof useArticleEditor>) => e.publish(), 'Published. It now shows under Stories in English.'],
    ['saves a draft', draft, (e: ReturnType<typeof useArticleEditor>) => e.save('draft'), 'Draft saved.'],
    ['saves a published article', published, (e: ReturnType<typeof useArticleEditor>) => e.save('publish'), 'Changes saved. Guests see them now.'],
    ['unpublishes', published, (e: ReturnType<typeof useArticleEditor>) => e.unpublish(), 'Unpublished. Guests no longer see it.'],
  ])('%s', async (_name, article, act_, text) => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result, release } = await renderEditor(article)

    act(() => {
      act_(result.current)
    })
    release()

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith(text))
  })

  it('adds the other language as a draft and says so', async () => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result, release } = await renderEditor(published)

    act(() => {
      result.current.addOtherVersion(() => {})
    })
    release()

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('German draft added. Translate it, then publish.'))
  })

  it('keeps the first save\'s text when a second tap arrives in the same tick and is dropped', async () => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result, release } = await renderEditor(draft)

    act(() => {
      result.current.save('draft')
      // The dropped tap: `useSubmit` ignores it, so it must not change the text of the save in flight.
      result.current.publish()
    })
    release()

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('Draft saved.'))
  })
})
