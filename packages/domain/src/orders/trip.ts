/** The three optional trip questions (spec §4.9, R09). Never replace a pickup or tour date. */
export interface TripAnswers {
  travelStyle?: 'group' | 'independent'
  /** YYYY-MM-DD, Zurich calendar days. */
  arriveOn?: string
  leaveOn?: string
}

/**
 * Trip answers kept on one order or tour booking (2.17), so a guest with several trips is
 * reported per purchase. Absent until the guest answers or skips.
 */
export interface TripRecord extends TripAnswers {
  answeredAt?: string
  /** Demo time the guest skipped the questions for this purchase. */
  skippedAt?: string
}
