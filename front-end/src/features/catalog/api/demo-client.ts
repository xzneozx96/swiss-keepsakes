import type { CatalogClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection, updateWithinBudget } from '@/features/demo/store'

export function createCatalogDemoClient(store: DemoStore): CatalogClient {
  const data = () => store.getState().data

  return {
    products: async () => data().products,
    subcategories: async () => data().subcategories,
    pickupPlaces: async () => data().pickupPlaces,
    saveProduct: async (product) => {
      updateWithinBudget(store, s => ({
        ...s,
        data: {
          ...s.data,
          products: s.data.products.some(p => p.id === product.id)
            ? s.data.products.map(p => (p.id === product.id ? product : p))
            : [...s.data.products, product],
        },
      }))
    },
    setProductArchived: async ({ id, archived }) => {
      updateCollection(store, 'products', (products, s) => {
        const at = archived
          ? demoNow(s.clockStartedAt).toISOString()
          : undefined

        return products.map(p =>
          p.id === id ? { ...p, archivedAt: at, published: false } : p,
        )
      })
    },
    addSubcategory: async ({ name }) => {
      const { uniqueSlug } = await import(
        '@/features/merchant/products/lib/records',
      )

      updateCollection(store, 'subcategories', list => [
        ...list,
        {
          id: uniqueSlug(
            name,
            list.map(c => c.id),
            'subcategory',
          ),
          categoryId: 'keepsakes',
          name,
        },
      ])
    },
    renameSubcategory: async ({ id, name }) => {
      updateCollection(store, 'subcategories', list =>
        list.map(c => (c.id === id ? { ...c, name } : c)))
    },
    moveSubcategory: async ({ id, direction }) => {
      updateCollection(store, 'subcategories', (list) => {
        const from = list.findIndex(c => c.id === id)
        const category = list[from]?.categoryId
        let to = from + direction

        while (list[to] && list[to].categoryId !== category) to += direction
        if (!list[to])
          return list
        const next = [...list];

        [next[from], next[to]] = [next[to], next[from]]

        return next
      })
    },
    removeSubcategory: async ({ id }) => {
      updateCollection(store, 'subcategories', (list, s) =>
        s.data.products.some(p => p.subcategoryId === id)
          ? list
          : list.filter(c => c.id !== id))
    },
    savePickupPlace: async (place) => {
      updateCollection(store, 'pickupPlaces', places =>
        places.map(p => (p.id === place.id ? place : p)))
    },
  }
}
