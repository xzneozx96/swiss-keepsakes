import type { Mail } from '@sk/domain/notifications'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const notificationsQueries = {
  mail: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.notifications.mail,
      queryFn: client.notifications.mail,
    }),
}

export function useMail<T = Mail[]>(
  select?: (mail: Mail[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...notificationsQueries.mail(client), select }).data
}
