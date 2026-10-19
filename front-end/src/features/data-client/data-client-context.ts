import type { DataClient } from './data-client'

import { createContext, use } from 'react'

export const DataClientContext = createContext<DataClient | null>(null)

export function useDataClient(): DataClient {
  const client = use(DataClientContext)

  if (!client)
    throw new Error('useDataClient must be used inside DataClientProvider')

  return client
}
