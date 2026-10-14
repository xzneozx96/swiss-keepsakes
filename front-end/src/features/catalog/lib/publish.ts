import type { Product } from "../types";

/** A gift is published unless the merchant set it to draft in M11; a missing flag counts as published. */
export function isPublished(product: Product): boolean {
  return product.published !== false;
}
