import { toast } from '@heroui/react'
import { COST_TYPES } from '@sk/domain/reporting'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useMerchantComments } from '@/features/content/merchant/hooks/use-merchant-comments'
import { useMerchantReviews } from '@/features/content/merchant/hooks/use-merchant-reviews'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { usePartnerActions } from '@/features/partners/hooks/use-partner-actions'
import { useCostActions } from '@/features/reports/hooks/use-cost-actions'

// The migrated call sites' own success text (`meta.success` functions), through the real cache and
// the real demo client: what each hook decides is the message, the query client shows it.
beforeEach(() => {
  localStorage.clear()
})

async function renderOwner<T>(useHook: () => T) {
  const state = createSeedState()

  localStorage.setItem('sk.demo', JSON.stringify({ ...state, role: 'owner' }))
  const demo = startDemo()

  await demo.ready
  const view = renderHook(useHook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
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

  await waitFor(() => expect(view.result.current).not.toBeNull())

  return { ...view, demo }
}

describe('the cost sheet saved text counts what is still missing', () => {
  const costs = (count: number) => Object.fromEntries(COST_TYPES.slice(0, count).map(type => [type, { amount: 100 }]))

  it.each([
    [2, 'Costs for O-1 saved, 3 still missing'],
    [4, 'Costs for O-1 saved, 1 still missing'],
    [5, 'Costs for O-1 saved and complete'],
  ])('with %i of the five costs', async (count, text) => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result } = await renderOwner(() => useCostActions('O-1'))

    act(() => result.current.save({ kind: 'order', id: 'o1' }, costs(count)))

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith(text))
  })
})

describe('the comment toast follows hide or show', () => {
  it.each([
    [true, 'Comment hidden. Guests no longer see it.'],
    [false, 'Comment shown again.'],
  ])('hidden %s', async (hidden, text) => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result, demo } = await renderOwner(() => useMerchantComments([]))
    const id = demo.store.getState().data.comments[0].id

    act(() => result.current.setHidden(id, hidden))

    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith(text))
  })
})

describe('the review toast follows posted or updated', () => {
  it('says posted for a first reply and updated for the next one', async () => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result, demo } = await renderOwner(() => useMerchantReviews([]))
    const unanswered = demo.store.getState().data.reviews.find(r => !r.reply)!

    act(() => result.current.saveReply(unanswered.id, 'Thank you', 'en'))
    await waitFor(() => expect(success).toHaveBeenLastCalledWith('Reply posted. It shows under the review.'))

    // Wait until the screen reads the new reply, then save a second one on the same review.
    await waitFor(() => expect(result.current.rows.find(row => row.id === unanswered.id)?.reply).toBeTruthy())
    act(() => result.current.saveReply(unanswered.id, 'Thanks again', 'en'))
    await waitFor(() => expect(success).toHaveBeenLastCalledWith('Reply updated.'))
    expect(success).toHaveBeenCalledTimes(2)
  })
})

describe('the partner toasts name the partner', () => {
  it('names the partner on archive and on restore', async () => {
    const success = vi.spyOn(toast, 'success').mockClear()
    const { result } = await renderOwner(() => usePartnerActions())

    act(() => result.current.archive('hotel-am-see'))
    await waitFor(() => expect(success).toHaveBeenLastCalledWith('Hotel am See archived'))

    act(() => result.current.restore('hotel-am-see'))
    await waitFor(() => expect(success).toHaveBeenLastCalledWith('Hotel am See restored'))
  })
})
