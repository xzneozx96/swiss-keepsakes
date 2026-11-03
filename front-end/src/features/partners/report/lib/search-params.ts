/** The commission states the transactions filter accepts in the report's URL, kept apart from the dashboard so the route can validate them without loading it. */

export const COMMISSION_FILTERS = ['recorded', 'estimated', 'none'] as const
export type CommissionFilter = (typeof COMMISSION_FILTERS)[number]
