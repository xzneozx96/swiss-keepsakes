import type { ReportsClient } from './client'
import type { DemoStore } from '@/features/demo/store'

export function createReportsDemoClient(store: DemoStore): ReportsClient {
  const data = () => store.getState().data

  return {
    costs: async () => data().costs,
  }
}
