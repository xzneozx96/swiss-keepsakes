import type { MutationMeta } from '@tanstack/react-query'
import type { MutationFeedback } from './api-feedback'
import type { CommandName, Feature } from './commands'
import type { DataClient } from './data-client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { commandAffects } from './commands'
import { useDataClient } from './data-client-context'

type Command<F extends Feature, C extends CommandName<F>> = DataClient[F][C] extends (
  input: infer TInput,
) => Promise<infer TResult>
  ? { input: TInput, result: TResult }
  : never

/**
 * One command of a feature client, `useCommand('orders', 'accept')`. On success it refreshes every
 * query the command affects (`commandAffects`), the ones no screen shows right now too, and waits
 * for them, so the next screen never opens on an old read.
 *
 * Take `mutate`, `mutateAsync` or `isPending` from the result: the result itself changes on
 * every state change. To leave the screen after a write, pass `onSuccess` to `mutate`: it does
 * not run when the screen is gone by then.
 *
 * `meta` is the command's feedback (`api-feedback.md`): a success message, a map from an `ApiProblem.type`
 * to its copy, or `silent` to drop the automatic error toast (a screen that shows the refusal inline
 * sets this). Never call `toast.*` next to `mutate` or `submit` yourself; the query client's cache does.
 */
export function useCommand<F extends Feature, C extends CommandName<F>>(
  feature: F,
  command: C,
  options?: { meta?: MutationFeedback<Command<F, C>['result'], Command<F, C>['input']> },
) {
  type TInput = Command<F, C>['input']
  type TResult = Command<F, C>['result']
  const client = useDataClient()
  const queryClient = useQueryClient()
  const run = client[feature][command] as (input: TInput) => Promise<TResult>

  return useMutation<TResult, Error, TInput>({
    mutationFn: input => run(input),
    // The cache's feedback typing is looser than ours (it cannot know each command's result and
    // input), so it is cast here, once, instead of at every call site.
    meta: options?.meta as MutationMeta,
    onSuccess: () =>
      Promise.all(
        commandAffects[feature][command].map(queryKey =>
          queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
        ),
      ),
  })
}

/**
 * A command a screen submits once and then usually leaves, such as C06's send or a gift's save.
 * A repeat tap while it runs is ignored: a ref, not `isPending`, because both taps arrive before
 * React re-renders. Like any per-call callback, `onSuccess` and `onError` do not run when the
 * screen is gone by then. `submit` returns false for an ignored tap; disable the button with
 * `isPending`. `error` and `reset` are the mutation's, for a screen that shows a refusal next to its form.
 */
export function useSubmit<F extends Feature, C extends CommandName<F>>(
  feature: F,
  command: C,
  options?: { meta?: MutationFeedback<Command<F, C>['result'], Command<F, C>['input']> },
) {
  type TInput = Command<F, C>['input']
  type TResult = Command<F, C>['result']
  const { mutate, isPending, error, reset } = useCommand(feature, command, options)
  const runningRef = useRef(false)

  const submit = (
    input: TInput,
    callbacks: {
      onSuccess?: (result: TResult) => void
      onError?: (error: Error) => void
    } = {},
  ): boolean => {
    if (runningRef.current)
      return false
    runningRef.current = true
    mutate(input, {
      onSuccess: result => callbacks.onSuccess?.(result),
      onError: error => callbacks.onError?.(error),
      onSettled: () => {
        runningRef.current = false
      },
    })

    return true
  }

  return { submit, isPending, error, reset }
}
