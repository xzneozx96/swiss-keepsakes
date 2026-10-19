export const COST_FILTERS = ["missing", "complete", "all"] as const;
export type CostFilter = (typeof COST_FILTERS)[number];
