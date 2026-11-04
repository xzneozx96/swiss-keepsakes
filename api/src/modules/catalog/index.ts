// What the composition root may use (architecture 4.1). main.ts builds the use cases with the repository from
// adapters/, and wraps them with guardUseCases.
export { makeCreateProduct } from './application/create-product.ts'
export { makeCreateVariant } from './application/create-variant.ts'
export { makeDeleteProduct } from './application/delete-product.ts'
export { makeGetProduct } from './application/get-product.ts'
export { makeListProducts } from './application/list-products.ts'
export { makeArchivePickupPlace, makeCreatePickupPlace, makeDeletePickupPlace, makeGetPickupPlace, makeListPickupPlaces, makeReorderPickupPlaces, makeRestorePickupPlace, makeSavePickupPlace } from './application/pickup-places.ts'
export { makePublishProduct } from './application/publish-product.ts'
export { makeSaveOptions } from './application/save-options.ts'
export { makeSaveProduct } from './application/save-product.ts'
export { makeSaveVariant } from './application/save-variant.ts'
export { makeSaveVariants } from './application/save-variants.ts'
export { makeUnpublishProduct } from './application/unpublish-product.ts'
