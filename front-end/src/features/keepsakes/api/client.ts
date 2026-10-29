import type { Product, ProductCreateBody, ProductList, ProductSaveBody, VariantSaveBody } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's keepsakes (E6.1). There is no demo implementation: every call goes to the API, and a refusal arrives
 * as an `ApiProblem`. A save and a publish carry the row version they opened (`If-Match`), and an old one is a 412.
 */
export interface KeepsakesClient {
  /** The store's keepsakes, newest first. */
  list: (storeId: string) => Promise<ProductList>
  get: (input: { storeId: string, id: string }) => Promise<Product>
  /** A draft with its one variant for sale. */
  create: (input: Keyed<{ storeId: string } & ProductCreateBody>) => Promise<Product>
  /** The autosave: `name`, `text` and `photoIds` replace the draft, `commissionRate` is live at once. */
  save: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & ProductSaveBody>) => Promise<Product>
  publish: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Product>
  unpublish: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Product>
  /** One variant's code, price or status. Live at once, no row version. */
  saveVariant: (input: Keyed<{ storeId: string, id: string, variantId: string } & VariantSaveBody>) => Promise<Product>
}
