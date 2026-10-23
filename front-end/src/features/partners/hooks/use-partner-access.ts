import type { Partner } from '@sk/domain/partners'
import type { CodeStatus } from '@/features/auth/hooks/use-sign-in'

import { useEffect, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import {
  CODE_LENGTH,
  RESEND_AFTER_MS,
} from '@/features/auth/hooks/use-sign-in'
import { useDemoActions, useDemoNow, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { sendMail } from '@/features/notifications/mail'
import { usePartners } from '@/features/partners/api/queries'

/** Prototype partner codes: any 6 digits open the report, except these two. */
export const WRONG_CODE = '000000'
export const EXPIRED_CODE = '999999'

/** R10: once the code is entered, the report opens on this browser for 30 days. */
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

/** Q8: partner codes are our own, not Better Auth's, and keep 10 minutes and 5 tries. */
export const PARTNER_CODE_LIFETIME_MS = 10 * 60_000
export const PARTNER_MAX_ATTEMPTS = 5

/** "g***@hotel-am-see.example": enough to recognise, not enough to copy (spec §4.8). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')

  return at > 0 ? `${email[0]}***${email.slice(at)}` : email
}

interface CodeStep {
  sentAt: number
  resendAt: number
  attempts: number
  status: CodeStatus
}

export type PartnerAccess
  = | { kind: 'invalid' }
    | { kind: 'report', partner: Partner }
    | ({ kind: 'code', partner: Partner } & ReturnType<typeof useCodeStep>)

/** The C05 code step's state for one partner, with the same demo code rules. */
function useCodeStep(partner: Partner | undefined, token: string) {
  const { update } = useDemoActions()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const { language } = useLocale()
  const [step, setStep] = useState<CodeStep | null>(null)
  const [code, setCode] = useState('')
  const [realNow, setRealNow] = useState(() => Date.now())
  const resendIn = step
    ? Math.max(0, Math.ceil((step.resendAt - realNow) / 1000))
    : 0

  useEffect(() => {
    if (resendIn === 0)
      return
    const timer = window.setInterval(() => setRealNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [resendIn])

  const send = () => {
    if (!partner)
      return
    const now = Date.now()
    const sentAt = demoNow(clockStartedAt, now)
    // Shown only in the N19 email; any 6 digits open the report (as C05).
    const mailedCode = String(Math.floor(100_000 + Math.random() * 900_000))

    update(s =>
      sendMail(s, {
        at: sentAt.toISOString(),
        to: 'partner',
        partnerId: partner.id,
        language,
        template: 'N19',
        params: { code: mailedCode, partner: partner.name },
      }),
    )
    setStep({
      sentAt: sentAt.getTime(),
      resendAt: now + RESEND_AFTER_MS,
      attempts: 0,
      status: 'idle',
    })
    setRealNow(now)
    setCode('')
  }

  const verify = (value: string) => {
    if (!partner || !step || step.status === 'locked')
      return
    if (value.length !== CODE_LENGTH)
      return
    const now = demoNow(clockStartedAt)

    if (
      value === EXPIRED_CODE
      || now.getTime() - step.sentAt > PARTNER_CODE_LIFETIME_MS
    ) {
      setStep({ ...step, status: 'expired' })
      setCode('')

      return
    }
    if (value === WRONG_CODE) {
      const attempts = step.attempts + 1

      setStep({
        ...step,
        attempts,
        status: attempts >= PARTNER_MAX_ATTEMPTS ? 'locked' : 'wrong',
      })
      setCode('')

      return
    }
    update(s => ({
      ...s,
      data: {
        ...s.data,
        partnerSessions: [
          ...s.data.partnerSessions.filter(x => x.token !== token),
          { token, partnerId: partner.id, verifiedAt: now.toISOString() },
        ],
      },
    }))
  }

  return {
    isSent: step !== null,
    send,
    maskedEmail: partner ? maskEmail(partner.email) : '',
    status: step?.status ?? ('idle' as CodeStatus),
    codeSentAt: step?.sentAt ?? 0,
    resendIn,
    code,
    onCodeChange: (value: string) => {
      setCode(value)
      if (step?.status === 'wrong')
        setStep({ ...step, status: 'idle' })
    },
    verify,
    resend: send,
    attemptsLeft: PARTNER_MAX_ATTEMPTS - (step?.attempts ?? 0),
    codeMinutes: PARTNER_CODE_LIFETIME_MS / 60_000,
  }
}

/**
 * P01 (spec §4.8, AC12, R10): a report link opens only after the code sent to the partner's
 * registered email. A revoked or reissued token, or an archived partner (D17), is invalid.
 * A valid session on this browser skips the code for 30 days.
 */
export function usePartnerAccess(token: string): PartnerAccess {
  const now = useDemoNow()
  const partner = usePartners(partners =>
    partners.find(p => p.reportToken === token && !p.archivedAt),
  )
  const partnerSessions = useDemoSelector(s => s.data.partnerSessions)
  const codeStep = useCodeStep(partner, token)

  if (!partner)
    return { kind: 'invalid' }
  const session = partnerSessions.find(
    s => s.token === token && s.partnerId === partner.id,
  )

  if (session && now.getTime() - Date.parse(session.verifiedAt) < SESSION_MS) {
    return { kind: 'report', partner }
  }

  return { kind: 'code', partner, ...codeStep }
}
