import type {
  LocalizedText,
  PickupPlace,
  Product,
  Subcategory,
} from '@sk/domain/catalog'

/** Gifts, their sub-categories and pickup places (C01 to C03, M11, M12, M14, M26). */
export interface CatalogClient {
  products: () => Promise<Product[]>
  subcategories: () => Promise<Subcategory[]>
  pickupPlaces: () => Promise<PickupPlace[]>
  /** Adds the gift, or replaces the stored one with the same id. */
  saveProduct: (product: Product) => Promise<void>
  /** Archived gifts are hidden from guests; restoring brings one back as a draft. */
  setProductArchived: (input: { id: string, archived: boolean }) => Promise<void>
  addSubcategory: (input: { name: LocalizedText }) => Promise<void>
  renameSubcategory: (input: { id: string, name: LocalizedText }) => Promise<void>
  /** Swaps with the neighbour in the same category; the list order is the guests' order. */
  moveSubcategory: (input: { id: string, direction: -1 | 1 }) => Promise<void>
  /** Refused while any keepsake is in it, so no product is ever left without one. */
  removeSubcategory: (input: { id: string }) => Promise<void>
  savePickupPlace: (place: PickupPlace) => Promise<void>
}
