import type { DataClient } from './data-client'

import { DataClientContext } from './data-client-context'

export function DataClientProvider({
  client,
  children,
}: {
  client: DataClient
  children: React.ReactNode
}) {
  return <DataClientContext value={client}>{children}</DataClientContext>
}
