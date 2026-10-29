import type { CategoryKind, CategoryOrderBody, CategoryPatchBody, CategoryWriteBody, MerchantCategory, MerchantCategoryList } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent (`useIdempotencyKey`), so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's map and blog categories (E4.18). There is no demo implementation: every call goes to the API,
 * and a refusal arrives as an `ApiProblem`. A category has no row version, so the last write wins.
 */
export interface CategoriesClient {
  /** Top-level categories first, then sub-categories, each by position. */
  list: (input: { storeId: string, kind: CategoryKind }) => Promise<MerchantCategoryList>
  create: (input: Keyed<{ storeId: string, kind: CategoryKind } & CategoryWriteBody>) => Promise<MerchantCategory>
  /** `name` replaces both languages. A changed `parentId` appends the category last under the new parent. */
  save: (input: Keyed<{ storeId: string, kind: CategoryKind, id: string } & CategoryPatchBody>) => Promise<MerchantCategory>
  /** `ids` must be exactly the current siblings under `parentId`. */
  reorder: (input: Keyed<{ storeId: string, kind: CategoryKind } & CategoryOrderBody>) => Promise<MerchantCategoryList>
  remove: (input: Keyed<{ storeId: string, kind: CategoryKind, id: string }>) => Promise<void>
}
