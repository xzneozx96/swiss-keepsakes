import type { ToursClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { createTourSeed } from '../seed'

const fallback = createTourSeed()

export function createToursDemoClient(store: DemoStore): ToursClient {
  return {
    tourData: async () => store.getState().data.tours ?? fallback,
  }
}
