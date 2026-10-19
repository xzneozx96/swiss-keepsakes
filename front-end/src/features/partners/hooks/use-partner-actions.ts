import type { Partner, PartnerPayout } from '@sk/domain/partners'
import type { QueriedData } from '@/features/demo/types'

import { useCommand } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'

import { usePartners } from '@/features/partners/api/queries'
import { commissionItems } from '../lib/ledger'
import { linkOpens } from '../lib/link-opens'

const PARTNER_CODE = /^[A-Z0-9]{3,12}$/
const NOT_CODE_CHAR = /[^A-Z0-9]/g
const COMBINING_MARKS = /[\u0300-\u036F]/g

export interface NewPartner {
  name: string
  kind: Partner['kind']
  email: string
  code: string
}

/** A referral code from a name: letters and digits, upper case, at most 12 ("Guide Anna" → "GUIDEANNA"). */
export function suggestCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toUpperCase()
    .replace(NOT_CODE_CHAR, '')
    .slice(0, 12)
}

export const isValidCode = (code: string) => PARTNER_CODE.test(code)

const TOKEN_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join('')
}

/**
 * True delete only for a partner with no link opens and no transactions, e.g. one added by
 * mistake (D17). Everyone else is archived, so the ledger and reports keep their history.
 */
export function canDeletePartner(
  data: Pick<
    QueriedData,
    'orders' | 'tours' | 'commissionAdjustments' | 'referralVisits'
  >,
  partnerId: string,
): boolean {
  return (
    !linkOpens(data).some(o => o.partnerId === partnerId)
    && commissionItems(data, partnerId).length === 0
  )
}

/** M15 and M16 partner management: add, archive, restore, delete (D17), payouts, report link. */
export function usePartnerActions() {
  const { mutate: addPartner } = useCommand('partners', 'addPartner')
  const { mutate: setPartnerArchived } = useCommand('partners', 'setPartnerArchived')
  const { mutate: deletePartner } = useCommand('partners', 'deletePartner')
  const { mutate: recordPayout } = useCommand('partners', 'recordPayout')
  const { mutate: revokeReportLink } = useCommand('partners', 'revokeReportLink')
  const { mutate: issueReportLink } = useCommand('partners', 'issueReportLink')
  const demoPartners = usePartners()
  const role = useDemoSelector(s => s.role)

  return {
    /** Adds the partner with a fresh report link; returns its id. */
    add(input: NewPartner): string {
      const base = suggestCode(input.name).toLowerCase() || 'partner'
      let id = base

      for (let n = 2; demoPartners.some(p => p.id === id); n++) {
        id = `${base}-${n}`
      }
      addPartner({
        id,
        name: input.name.trim(),
        kind: input.kind,
        code: input.code,
        email: input.email.trim(),
        reportToken: randomToken(),
        revokedTokens: [],
      })

      return id
    },
    archive(partnerId: string) {
      setPartnerArchived({ id: partnerId, archived: true })
    },
    restore(partnerId: string) {
      setPartnerArchived({ id: partnerId, archived: false })
    },
    remove(partnerId: string) {
      deletePartner({ id: partnerId })
    },
    /** M16 "Record as paid" (5.4, AC13): money paid outside the app; Owner or Manager. */
    recordPayout(
      payout: Omit<PartnerPayout, 'id' | 'recordedAt' | 'recordedBy'>,
    ) {
      if (role !== 'owner' && role !== 'manager')
        return
      recordPayout(payout)
    },
    /** M16, Owner only (R10, Q5): the current report link stops working at once. */
    revokeReportLink(partnerId: string) {
      if (role !== 'owner')
        return
      revokeReportLink({ id: partnerId })
    },
    /** M16, Owner only (R10): a new private report link after a revoke. */
    issueReportLink(partnerId: string) {
      if (role !== 'owner')
        return
      issueReportLink({ id: partnerId, token: randomToken() })
    },
  }
}
