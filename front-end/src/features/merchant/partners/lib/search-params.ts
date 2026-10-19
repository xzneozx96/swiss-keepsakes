export const PARTNER_FILTERS = ['toPay', 'revoked', 'archived'] as const
export type PartnerFilter = (typeof PARTNER_FILTERS)[number]
