export const orderTabs = [
  'overview',
  'payments',
  'timeline',
  'policy',
] as const
export type OrderTab = (typeof orderTabs)[number]
