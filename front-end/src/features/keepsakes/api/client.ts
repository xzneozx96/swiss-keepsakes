import type { OptionsSaveBody, Product, ProductCreateBody, ProductList, ProductRemoval, ProductSaveBody, VariantCreateBody, VariantSaveBody, VariantsSaveBody } from '@sk/api-contract'

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
  /** A draft with its options and a variant for each combination that is sold. */
  create: (input: Keyed<{ storeId: string } & ProductCreateBody>) => Promise<Product>
  /** The autosave: `name`, `text` and `photoIds` replace the draft, `commissionRate` is live at once. */
  save: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & ProductSaveBody>) => Promise<Product>
  publish: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Product>
  unpublish: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<Product>
  /** Delete when no order names the keepsake, else archive (final). The answer says which happened. */
  remove: (input: Keyed<{ storeId: string, id: string, ifMatch: number }>) => Promise<ProductRemoval>
  /** One variant's code, price, status or values. Live at once, no row version. Archiving is final. */
  saveVariant: (input: Keyed<{ storeId: string, id: string, variantId: string } & VariantSaveBody>) => Promise<Product>
  /** Several variants' price or status, all or nothing. Live at once, no row version. */
  saveVariants: (input: Keyed<{ storeId: string, id: string } & VariantsSaveBody>) => Promise<Product>
  /** The options, the new values of the variants and the new variants (`newVariants`), in one write. A refusal is a 422 with `errors`, an old version a 412. */
  saveOptions: (input: Keyed<{ storeId: string, id: string, ifMatch: number } & OptionsSaveBody>) => Promise<Product>
  /** One more variant, live at once. */
  createVariant: (input: Keyed<{ storeId: string, id: string } & VariantCreateBody>) => Promise<Product>
}
