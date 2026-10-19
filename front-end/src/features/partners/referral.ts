import type { Partner, ReferralVisit } from '@sk/domain/partners'

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export function partnerByCode(partners: Partner[], code: string) {
  return partners.find(p => p.code.toLowerCase() === code.toLowerCase())
}

/**
 * Last-click attribution (PRD §10.1): the latest partner visit within 30 days before
 * the order wins. A direct visit does not clear it. Null when there is none.
 */
export function attributedPartnerId(
  visits: ReferralVisit[],
  at: Date,
): string | null {
  const from = at.getTime() - WINDOW_MS
  const valid = visits.filter((v) => {
    const t = Date.parse(v.at)

    return t >= from && t <= at.getTime()
  })

  if (valid.length === 0)
    return null

  return valid.reduce((latest, v) =>
    Date.parse(v.at) > Date.parse(latest.at) ? v : latest,
  ).partnerId
}
