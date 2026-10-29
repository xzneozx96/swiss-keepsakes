import type { MutationMeta, QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiQueryClient, createFeedback } from '@/features/data-client/api-feedback'
import { ApiProblem } from '@/features/data-client/errors'

function fakeFeedback() {
  const success = vi.fn((message: string) => message)
  const danger = vi.fn((message: string) => message)
  const feedback = createFeedback({ success, danger })

  return { feedback, success, danger }
}

function setup(defaultOptions: Parameters<typeof createApiQueryClient>[1] = {}) {
  const { feedback, success, danger } = fakeFeedback()
  const queryClient = createApiQueryClient(feedback, defaultOptions)

  return { feedback, success, danger, queryClient }
}

/** Runs a mutation through the real cache (`MutationCache.build` plus `execute`, as `useMutation` does). */
function runMutation<TResult, TInput>(
  queryClient: QueryClient,
  options: { mutationFn: (input: TInput) => Promise<TResult>, meta?: MutationMeta, onError?: () => void },
  input: TInput,
) {
  const mutation = queryClient.getMutationCache().build(queryClient, options)

  return mutation.execute(input)
}

describe('createApiQueryClient mutations', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('toasts the mapped copy for a refused ApiProblem', async () => {
    const { queryClient, danger } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(409, 'slug-taken', 'Slug taken')
      },
      meta: { error: { 'slug-taken': 'stores.create.slugTaken' } },
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(danger).toHaveBeenCalledExactlyOnceWith('stores.create.slugTaken')
  })

  it('falls back to the generic copy for an ApiProblem type the map does not name', async () => {
    const { queryClient, danger } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(500, 'unexpected', 'Unexpected')
      },
      meta: { error: { 'slug-taken': 'stores.create.slugTaken' } },
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(danger).toHaveBeenCalledExactlyOnceWith('apiFeedback.error.generic')
  })

  it('shows the network copy for an error that is not an ApiProblem', async () => {
    const { queryClient, danger } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new Error('fetch failed')
      },
    }, undefined)).rejects.toThrow('fetch failed')

    expect(danger).toHaveBeenCalledExactlyOnceWith('apiFeedback.error.network')
  })

  it('meta.silent drops the automatic error toast', async () => {
    const { queryClient, danger } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(500, 'unexpected', 'Unexpected')
      },
      meta: { silent: true },
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(danger).not.toHaveBeenCalled()
  })

  it('never toasts a 401: sign-in owns it', async () => {
    const { queryClient, danger } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(401, 'unauthenticated', 'Unauthenticated')
      },
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(danger).not.toHaveBeenCalled()
  })

  it('never toasts a cancelled mutation', async () => {
    const { queryClient, danger } = setup()
    const { CancelledError } = await import('@tanstack/react-query')

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new CancelledError()
      },
    }, undefined)).rejects.toThrow(CancelledError)

    expect(danger).not.toHaveBeenCalled()
  })

  it('toasts success only when meta.success is given, as a key', async () => {
    const { queryClient, success } = setup()

    await runMutation(queryClient, {
      mutationFn: async () => 'ok',
      meta: { success: 'stores.info.saved' },
    }, undefined)

    expect(success).toHaveBeenCalledExactlyOnceWith('stores.info.saved')
  })

  it('never toasts success without meta.success', async () => {
    const { queryClient, success } = setup()

    await runMutation(queryClient, { mutationFn: async () => 'ok' }, undefined)

    expect(success).not.toHaveBeenCalled()
  })

  it('calls the function form of meta.success with the result and the input', async () => {
    const { queryClient, success } = setup()
    const text = vi.fn((result: unknown, input: unknown) => `${result}:${input}`)

    await runMutation(queryClient, {
      mutationFn: async (input: number) => `saved-${input}`,
      meta: { success: text },
    }, 7)

    expect(text).toHaveBeenCalledExactlyOnceWith('saved-7', 7)
    expect(success).toHaveBeenCalledExactlyOnceWith('saved-7:7')
  })

  it('toasts once even when the mutation also has its own onError', async () => {
    const { queryClient, danger } = setup()
    const localOnError = vi.fn()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(500, 'unexpected', 'Unexpected')
      },
      onError: localOnError,
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(localOnError).toHaveBeenCalledOnce()
    expect(danger).toHaveBeenCalledOnce()
  })

  it('does nothing on the server, where window is undefined', async () => {
    vi.stubGlobal('window', undefined)
    const { queryClient, danger, success } = setup()

    await expect(runMutation(queryClient, {
      mutationFn: async () => {
        throw new ApiProblem(500, 'unexpected', 'Unexpected')
      },
      meta: { success: 'stores.info.saved' },
    }, undefined)).rejects.toThrow(ApiProblem)

    expect(danger).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })
})

describe('createApiQueryClient queries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('never toasts a first load: the route error screen owns it', async () => {
    const { queryClient, danger } = setup()

    await expect(queryClient.fetchQuery({
      queryKey: ['first-load'],
      queryFn: async () => {
        throw new Error('boom')
      },
    })).rejects.toThrow('boom')

    expect(danger).not.toHaveBeenCalled()
  })

  it('toasts a background refetch failure while data is already on screen', async () => {
    const { queryClient, danger } = setup()

    queryClient.setQueryData(['background'], 'cached')

    await expect(queryClient.fetchQuery({
      queryKey: ['background'],
      queryFn: async () => {
        throw new Error('boom')
      },
    })).rejects.toThrow('boom')

    expect(danger).toHaveBeenCalledExactlyOnceWith('apiFeedback.error.network')
  })

  it('meta.silent drops a query\'s automatic toast', async () => {
    const { queryClient, danger } = setup()

    queryClient.setQueryData(['silent'], 'cached')

    await expect(queryClient.fetchQuery({
      queryKey: ['silent'],
      queryFn: async () => {
        throw new Error('boom')
      },
      meta: { silent: true },
    })).rejects.toThrow('boom')

    expect(danger).not.toHaveBeenCalled()
  })

  it('does nothing on the server, where window is undefined', async () => {
    vi.stubGlobal('window', undefined)
    const { queryClient, danger } = setup()

    queryClient.setQueryData(['ssr'], 'cached')

    await expect(queryClient.fetchQuery({
      queryKey: ['ssr'],
      queryFn: async () => {
        throw new Error('boom')
      },
    })).rejects.toThrow('boom')

    expect(danger).not.toHaveBeenCalled()
  })
})
