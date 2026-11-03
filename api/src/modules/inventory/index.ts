// What the composition root may use (architecture 4.1). main.ts builds the use cases with the repository from adapters/,
// and wraps them with guardUseCases. `makeReservedBySku` and `makeStockLevels` are the reads the catalog gets through
// the composition root (ADR-013).
export { makeGetStockItem } from './application/get-stock-item.ts'
export { makeListStock } from './application/list-stock.ts'
export { makeSeedStock } from './application/seed-stock.ts'
export { makeSetManyStock } from './application/set-many-stock.ts'
export { makeSetStock } from './application/set-stock.ts'
export { makeReservedBySku, makeStockLevels } from './application/stock-reads.ts'
