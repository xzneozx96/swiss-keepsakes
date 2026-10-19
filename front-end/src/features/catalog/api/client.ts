import type { PickupPlace, Product, Subcategory } from '@sk/domain/catalog'

/** Gifts, their sub-categories and pickup places (C01 to C03, M05, M14, M26). */
export interface CatalogClient {
  products: () => Promise<Product[]>
  subcategories: () => Promise<Subcategory[]>
  pickupPlaces: () => Promise<PickupPlace[]>
}
