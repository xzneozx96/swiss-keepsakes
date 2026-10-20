import { useEffect, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { sendMail } from '@/features/notifications/mail'
import { demoGuest } from '@/features/orders/seed'
import { codeErrorStatus } from '../lib/code-errors'
import { loadNeonAuth, neonAuthUrl } from '../lib/neon-auth'
import { signInUrl } from '../lib/return-to'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/** Spec §4.5 and §6 N01: a code works for 5 minutes (Neon Auth's limit, F16); resend unlocks after 30 seconds. */
export const CODE_LENGTH = 6
export const CODE_LIFETIME_MS = 5 * 60_000
export const RESEND_AFTER_MS = 30_000

/** Spec §4.5: 3 tries per code, then a new code is needed. Neon Auth refuses a 4th try. */
export const MAX_ATTEMPTS = 3
/** Prototype codes: any 6 digits sign in, except these two (P01 uses the same rule). */
export const WRONG_CODE = '000000'
export const EXPIRED_CODE = '999999'
const GOOGLE_DELAY_MS = 700

export type CodeStatus = 'idle' | 'wrong' | 'expired' | 'locked'

/** A call to Neon Auth that failed for a reason other than the code, or a Google sign-in that came back unfinished. */
export type SignInProblem = 'unavailable' | 'google'

interface CodeStep {
  email: string
  /** When the latest code was sent: demo time in demo mode, where expiry counts from here. */
  sentAt: number
  /** Real time the resend link unlocks. */
  resendAt: number
  attempts: number
  status: CodeStatus
}

/**
 * C05 sign-in state: Google or an emailed 6-digit code. With `VITE_NEON_AUTH_URL` set, Neon Auth
 * sends and checks the code and runs Google sign-in. Without it, the demo simulates both. The
 * state lives in the caller, so closing the sheet to read N01 in the Mail panel keeps the code step.
 */
export function useSignIn(returnTo: string, googleFailed: boolean) {
  const { update } = useDemoActions()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const { language } = useLocale()
  const [email, setEmail] = useState(neonAuthUrl ? '' : demoGuest.email)
  const [emailError, setEmailError] = useState(false)
  const [code, setCode] = useState('')
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null)
  const [pending, setPending] = useState<'google' | 'send' | 'verify' | null>(null)
  const [problem, setProblem] = useState<SignInProblem | null>(
    googleFailed ? 'google' : null,
  )
  const [realNow, setRealNow] = useState(() => Date.now())

  const resendIn = codeStep
    ? Math.max(0, Math.ceil((codeStep.resendAt - realNow) / 1000))
    : 0

  // Ticks only while the resend countdown runs.
  useEffect(() => {
    if (resendIn === 0)
      return
    const timer = window.setInterval(() => setRealNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [resendIn])

  const finish = () => {
    update(s => ({
      ...s,
      data: { ...s.data, signedInGuestId: demoGuest.id },
    }))
    setCodeStep(null)
    setCode('')
  }

  const startCodeStep = (to: string, sentAt: number) => {
    const now = Date.now()

    setCodeStep({
      email: to,
      sentAt,
      resendAt: now + RESEND_AFTER_MS,
      attempts: 0,
      status: 'idle',
    })
    setRealNow(now)
    setCode('')
  }

  const refuseCode = (status: 'wrong' | 'expired' | 'locked') => {
    setCodeStep((step) => {
      if (!step || status !== 'wrong')
        return step && { ...step, status }
      const attempts = step.attempts + 1

      return {
        ...step,
        attempts,
        status: attempts >= MAX_ATTEMPTS ? 'locked' : 'wrong',
      }
    })
    setCode('')
  }

  const sendCode = async (to: string) => {
    setProblem(null)
    if (!neonAuthUrl) {
      const sentAt = demoNow(clockStartedAt)
      // Shown only in the N01 email; any 6 digits sign in (see the codes above).
      const mailedCode = String(Math.floor(100_000 + Math.random() * 900_000))

      update(s =>
        sendMail(s, {
          at: sentAt.toISOString(),
          to: 'guest',
          guestId: demoGuest.id,
          language,
          template: 'N01',
          params: { code: mailedCode, email: to },
        }),
      )
      startCodeStep(to, sentAt.getTime())

      return
    }
    setPending('send')
    try {
      const auth = await loadNeonAuth(neonAuthUrl)
      const { error } = await auth.emailOtp.sendVerificationOtp({
        email: to,
        type: 'sign-in',
      })

      if (error)
        setProblem('unavailable')
      else startCodeStep(to, Date.now())
    }
    catch {
      setProblem('unavailable')
    }
    finally {
      setPending(null)
    }
  }

  const submitEmail = () => {
    const trimmed = email.trim()

    if (!EMAIL_SHAPE.test(trimmed)) {
      setEmailError(true)

      return
    }
    void sendCode(trimmed)
  }

  const refuseNeonCode = (error: unknown) => {
    const status = codeErrorStatus(error)

    if (status) {
      refuseCode(status)

      return
    }
    setProblem('unavailable')
    setCode('')
  }

  const verify = async (value: string) => {
    if (!codeStep || codeStep.status === 'locked' || pending)
      return
    if (value.length !== CODE_LENGTH)
      return

    if (!neonAuthUrl) {
      const age = demoNow(clockStartedAt).getTime() - codeStep.sentAt

      if (value === EXPIRED_CODE || age > CODE_LIFETIME_MS)
        refuseCode('expired')
      else if (value === WRONG_CODE)
        refuseCode('wrong')
      else finish()

      return
    }
    setPending('verify')
    setProblem(null)
    try {
      const auth = await loadNeonAuth(neonAuthUrl)
      const { error } = await auth.signIn.emailOtp({
        email: codeStep.email,
        otp: value,
      })

      if (error) {
        refuseNeonCode(error)

        return
      }
      // The session lives in Neon Auth's cookie. Reading it back proves the browser kept the cookie.
      const { data } = await auth.getSession()

      if (data)
        finish()
      else setProblem('unavailable')
    }
    catch (error) {
      refuseNeonCode(error)
    }
    finally {
      setPending(null)
    }
  }

  const continueWithGoogle = async () => {
    setPending('google')
    setProblem(null)
    if (!neonAuthUrl) {
      window.setTimeout(() => {
        setPending(null)
        finish()
      }, GOOGLE_DELAY_MS)

      return
    }
    try {
      const auth = await loadNeonAuth(neonAuthUrl)
      // On success the SDK leaves the page for Google, so the button stays pending.
      const { error } = await auth.signIn.social({
        provider: 'google',
        callbackURL: signInUrl(returnTo),
        errorCallbackURL: signInUrl(returnTo, 'failed'),
      })

      if (error) {
        setProblem('unavailable')
        setPending(null)
      }
    }
    catch {
      setProblem('unavailable')
      setPending(null)
    }
  }

  return {
    step: codeStep ? ('code' as const) : ('start' as const),
    email,
    emailError,
    onEmailChange: (value: string) => {
      setEmail(value)
      setEmailError(false)
    },
    submitEmail,
    sending: pending === 'send',
    verifying: pending === 'verify',
    googlePending: pending === 'google',
    continueWithGoogle: () => {
      void continueWithGoogle()
    },
    problem,
    sentTo: codeStep?.email ?? '',
    /** Changes with every code sent, so the sheet can refocus the code field. */
    codeSentAt: codeStep?.sentAt ?? 0,
    codeMinutes: CODE_LIFETIME_MS / 60_000,
    code,
    onCodeChange: (value: string) => {
      setCode(value)
      // Typing again clears a wrong-code message; expired and locked need a new code.
      if (codeStep?.status === 'wrong') {
        setCodeStep({ ...codeStep, status: 'idle' })
      }
    },
    verify: (value: string) => {
      void verify(value)
    },
    status: codeStep?.status ?? 'idle',
    attemptsLeft: MAX_ATTEMPTS - (codeStep?.attempts ?? 0),
    resendIn,
    resend: () => {
      if (codeStep)
        void sendCode(codeStep.email)
    },
    changeEmail: () => {
      setCodeStep(null)
      setCode('')
      setProblem(null)
    },
  }
}

export type SignInView = ReturnType<typeof useSignIn>
