import type { CommandName, Feature } from './commands'
import type { DataClient } from './data-client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
 */
export function useCommand<F extends Feature, C extends CommandName<F>>(
  feature: F,
  command: C,
) {
  type TInput = Command<F, C>['input']
  type TResult = Command<F, C>['result']
  const client = useDataClient()
  const queryClient = useQueryClient()
  const run = client[feature][command] as (input: TInput) => Promise<TResult>

  return useMutation<TResult, Error, TInput>({
    mutationFn: input => run(input),
    onSuccess: () =>
      Promise.all(
        commandAffects[feature][command].map(queryKey =>
          queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
        ),
      ),
  })
}
