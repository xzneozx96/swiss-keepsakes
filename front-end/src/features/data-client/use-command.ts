import type { QueryKey } from '@tanstack/react-query'

import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * A write through the data client. On success it invalidates every query the write affects and
 * waits for them to read again, so `mutateAsync` resolves only once the screens can see the change.
 * Take `mutate` or `mutateAsync` from the result: they keep their identity, the result does not.
 */
export function useCommand<TInput, TResult>(
  command: (input: TInput) => Promise<TResult>,
  affects: readonly QueryKey[],
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: command,
    onSuccess: () =>
      Promise.all(
        affects.map(queryKey => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}
