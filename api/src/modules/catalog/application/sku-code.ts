// `skus_sku_code_check`: letters and digits joined by - _ or .
const skuCode = /^[A-Z0-9]+(?:[-_.][A-Z0-9]+)*$/i

export function isSkuCode(code: string): boolean {
  return skuCode.test(code)
}
