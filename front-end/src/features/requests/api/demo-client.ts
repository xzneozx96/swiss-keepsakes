import type { RequestsClient } from './client'
import type { DemoStore } from '@/features/demo/store'

export function createRequestsDemoClient(store: DemoStore): RequestsClient {
  const data = () => store.getState().data

  return {
    adviceQuestions: async () => data().adviceQuestions,
    adviceRequests: async () => data().adviceRequests,
    privateTourRequests: async () => data().privateTourRequests,
  }
}
