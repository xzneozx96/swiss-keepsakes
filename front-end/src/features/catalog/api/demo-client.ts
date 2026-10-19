import type { CatalogClient } from './client'
import type { DemoStore } from '@/features/demo/store'

export function createCatalogDemoClient(store: DemoStore): CatalogClient {
  const data = () => store.getState().data

  return {
    products: async () => data().products,
    subcategories: async () => data().subcategories,
    pickupPlaces: async () => data().pickupPlaces,
  }
}
