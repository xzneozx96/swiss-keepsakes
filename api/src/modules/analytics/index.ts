// What other modules may use (architecture 4.1). The order flow (E7.1) calls the function makeRecordOrderSubmit
// returns when an order is placed. The composition root builds it with createFunnelCounter.
export { createFunnelCounter } from './adapters/funnel-counter.ts'
export { makeRecordOrderSubmit } from './application/record-order-submit.ts'
export { InvalidOrderSubmit } from './ports.ts'
export type { FunnelCounter, ReferrerClass, Segment } from './ports.ts'
