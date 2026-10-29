import type { DefaultOptions } from '@tanstack/react-query'
import type { MessageKey } from '@/i18n/en'

import { toast as heroToast } from '@heroui/react'
import { isCancelledError, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from './errors'

/** The one toast call the cache needs: a message, nothing else. A test injects a fake. */
export interface ToastApi {
  success: (message: string) => string
  danger: (message: string) => string
}

/**
 * What a command shows once it settles. Typed through `Register`, so `meta` cannot be a loose object.
 * A type, not an `interface`: TanStack's `MutationMeta` keeps only a type that TypeScript sees as
 * extending `Record<string, unknown>`, which an `interface` of only optional properties never does.
 */
// eslint-disable-next-line ts/consistent-type-definitions -- must be a `type`, see the comment above
export type MutationFeedback<TResult = unknown, TInput = unknown> = {
  /** Shown on success. A key, or a function for text that needs the result or the input (an email, an amount). Nothing toasts without this. */
  success?: MessageKey | ((result: TResult, input: TInput) => string)
  /** Copy for a refused `ApiProblem`, by its `type`. A type not listed, or a non-`ApiProblem` error, gets the generic copy. */
  error?: Partial<Record<string, MessageKey>>
  /** No automatic toast for this mutation's error. `success` still fires on its own; a field-level refusal the screen shows inline sets this. */
  silent?: boolean
}

/** What a query shows when a background refetch fails. A first load's failure is the route's error screen, never a toast. */
// eslint-disable-next-line ts/consistent-type-definitions -- same reason as `MutationFeedback` above
export type QueryFeedback = {
  /** No automatic toast for this query's background error. */
  silent?: boolean
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: MutationFeedback
    queryMeta: QueryFeedback
  }
}

/** `t` and `toast`, injected so the cache (built outside React) can show copy and a test can use a fake toast. */
export interface Feedback {
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  toast: ToastApi
}

export interface FeedbackHandle extends Feedback {
  /** Called by `ApiFeedbackBridge` whenever the locale's `t` changes. */
  setT: (t: Feedback['t']) => void
}

const keyAsText: Feedback['t'] = key => key

/** A `Feedback` whose `t` starts as a passthrough (the key itself) until `ApiFeedbackBridge` supplies the real one. */
export function createFeedback(toast: ToastApi = heroToast): FeedbackHandle {
  let current = keyAsText

  return {
    t: (key, vars) => current(key, vars),
    toast,
    setT: (t) => {
      current = t
    },
  }
}

/** Keeps a `Feedback`'s `t` in step with the locale, so the cache (made once, outside React) always has the current language. Render once, anywhere under `LocaleProvider` and above the screens. */
export function ApiFeedbackBridge({ feedback }: { feedback: FeedbackHandle }) {
  const { t } = useLocale()

  useEffect(() => {
    feedback.setT(t)
  }, [feedback, t])

  return null
}

/** The text for a problem no `error` map named: an `ApiProblem` reads as the API refusing, anything else as the connection failing. */
function genericFeedbackKey(error: unknown): MessageKey {
  return error instanceof ApiProblem ? 'apiFeedback.error.generic' : 'apiFeedback.error.network'
}

/**
 * The `QueryClient` every `DataClient` uses (demo and API): a `QueryCache` and `MutationCache` that show
 * `toast` for every command, so no screen calls `toast.*` next to a `mutate` or `submit` (`api-feedback.md`).
 *
 * Defaults: a mutation's error always toasts, mapped by `meta.error[problem.type]` then the generic copy,
 * unless `meta.silent`, a 401 (sign-in owns it) or a cancelled request. A mutation's success toasts only
 * with `meta.success`. A query toasts only when a background refetch fails while data is already on screen
 * (the first load is the route's error screen); `meta.silent` opts a query out, and a query toasts at most
 * once per `queryHash` until it next succeeds, so polling cannot stack toasts.
 *
 * A no-op on the server: `QueryCache.onError` also fires for a failed `ensureQueryData` in a loader.
 */
export function createApiQueryClient(
  feedback: Feedback,
  defaultOptions: DefaultOptions,
): QueryClient {
  const live = typeof window !== 'undefined'
  const toastedQueryHashes = new Set<string>()

  return new QueryClient({
    defaultOptions,
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!live || query.state.data === undefined || isCancelledError(error))
          return
        const meta = query.meta
        if (meta?.silent || toastedQueryHashes.has(query.queryHash))
          return
        toastedQueryHashes.add(query.queryHash)
        feedback.toast.danger(feedback.t(genericFeedbackKey(error)))
      },
      onSuccess: (_data, query) => {
        toastedQueryHashes.delete(query.queryHash)
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (data, variables, _onMutateResult, mutation) => {
        if (!live)
          return
        const success = mutation.meta?.success
        if (!success)
          return
        const message = typeof success === 'function' ? success(data, variables) : feedback.t(success)
        feedback.toast.success(message)
      },
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (!live || isCancelledError(error))
          return
        if (error instanceof ApiProblem && error.status === 401)
          return
        if (mutation.meta?.silent)
          return
        const key = error instanceof ApiProblem
          ? (mutation.meta?.error?.[error.type] ?? genericFeedbackKey(error))
          : genericFeedbackKey(error)

        feedback.toast.danger(feedback.t(key))
      },
    }),
  })
}
