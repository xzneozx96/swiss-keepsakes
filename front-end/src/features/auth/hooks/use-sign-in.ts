import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { sendMail } from '@/features/notifications/mail'
import { demoGuest } from '@/features/orders/seed'
import { apiEnabled } from '@/lib/api-mode'
import { authFetchOptions, loadAuthClient } from '../lib/auth-api'
import { codeFailure } from '../lib/code-errors'
import { signInErrorUrl, signInUrl } from '../lib/return-to'

/** The API's rule (Zod's `z.email()`, which Better Auth applies): no empty or doubled dots, no dot before the @, a TLD of 2 letters or more. */
const EMAIL_SHAPE = /^(?:[\w'+-]+\.)*[\w'+-]*[\w+-]@(?:[A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i

/** Spec §4.5 and §6 N01: a code works for 5 minutes (the API's `emailOTP` setting); resend unlocks after 30 seconds. */
export const CODE_LENGTH = 6
export const CODE_LIFETIME_MS = 5 * 60_000
export const RESEND_AFTER_MS = 30_000

/** Spec §4.5: 3 tries per code, then a new code is needed. The API refuses a 4th try. */
export const MAX_ATTEMPTS = 3
/** Prototype codes: any 6 digits sign in, except these two (P01 uses the same rule). */
export const WRONG_CODE = '000000'
export const EXPIRED_CODE = '999999'
const GOOGLE_DELAY_MS = 700

export type CodeStatus = 'idle' | 'wrong' | 'expired' | 'locked'

/** A call to the API that failed for a reason other than the code, or a Google sign-in that came back unfinished. */
export type SignInProblem = 'unavailable' | 'rateLimited' | 'google'

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
 * C05 sign-in state: Google or an emailed 6-digit code. With the API (`VITE_API_ENABLED`), Better Auth
 * sends and checks the code and runs Google sign-in. Without it, the demo simulates both. The state
 * lives in the caller, so closing the sheet to read N01 in the Mail panel keeps the code step.
 * `googleFailed`: Better Auth sent the guest back here because Google sign-in did not finish.
 */
export function useSignIn(returnTo: string, googleFailed: boolean) {
  const { update } = useDemoActions()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const { language } = useLocale()
  const [email, setEmail] = useState(apiEnabled ? '' : demoGuest.email)
  const [emailError, setEmailError] = useState(false)
  const [code, setCode] = useState('')
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null)
  const [pending, setPending] = useState<'google' | 'send' | 'verify' | null>(null)
  const [problem, setProblem] = useState<SignInProblem | null>(
    googleFailed ? 'google' : null,
  )
  // Seconds Better Auth's rate limiter asked the guest to wait, for the rate limited message.
  const [retryAfter, setRetryAfter] = useState(60)
  const [realNow, setRealNow] = useState(() => Date.now())
  // A repeat tap or a second `onComplete` in the same tick must not send a second call: `pending` is state
  // and still reads null until the next render.
  const callingRef = useRef(false)

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

  // Back from Google in Safari restores this page from its cache with the button still pending.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted)
        setPending(current => (current === 'google' ? null : current))
    }

    window.addEventListener('pageshow', reset)

    return () => window.removeEventListener('pageshow', reset)
  }, [])

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

  // Better Auth deletes every expired code whenever anyone looks one up, so a code that expired a while ago
  // reads as unknown (INVALID_OTP), not as expired. The guest knows when this code was sent.
  const refuseCall = (error: unknown, sentAt: number, waitSeconds?: number) => {
    const failure = codeFailure(error)

    if (failure === 'wrong' && Date.now() - sentAt > CODE_LIFETIME_MS) {
      refuseCode('expired')

      return
    }
    if (failure === 'wrong' || failure === 'expired' || failure === 'locked') {
      refuseCode(failure)

      return
    }
    // The code stays in the field: a refused call says nothing against it, and Continue sends it again.
    if (failure === 'rateLimited' && waitSeconds)
      setRetryAfter(waitSeconds)
    setProblem(failure === 'invalidEmail' ? 'unavailable' : failure)
  }

  const sendCode = async (to: string) => {
    setProblem(null)
    if (!apiEnabled) {
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
    if (callingRef.current)
      return
    callingRef.current = true
    setPending('send')
    try {
      const auth = await loadAuthClient()
      // The code mail is in the language the guest uses now (D8): the API reads the first tag.
      const { error } = await auth.emailOtp.sendVerificationOtp({
        email: to,
        type: 'sign-in',
        fetchOptions: authFetchOptions({ 'Accept-Language': language }, setRetryAfter),
      })

      if (!error) {
        startCodeStep(to, Date.now())
      }
      else if (codeFailure(error) === 'invalidEmail') {
        setEmailError(true)
        setCodeStep(null)
      }
      else {
        const failure = codeFailure(error)

        setProblem(failure === 'rateLimited' ? 'rateLimited' : 'unavailable')
      }
    }
    catch {
      setProblem('unavailable')
    }
    finally {
      callingRef.current = false
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

  const verify = async (value: string) => {
    if (!codeStep || codeStep.status === 'locked' || codeStep.status === 'expired')
      return
    if (value.length !== CODE_LENGTH)
      return

    if (!apiEnabled) {
      const age = demoNow(clockStartedAt).getTime() - codeStep.sentAt

      if (value === EXPIRED_CODE || age > CODE_LIFETIME_MS)
        refuseCode('expired')
      else if (value === WRONG_CODE)
        refuseCode('wrong')
      else finish()

      return
    }
    if (callingRef.current)
      return
    callingRef.current = true
    setPending('verify')
    setProblem(null)
    try {
      const auth = await loadAuthClient()
      // The only way in is signIn.emailOtp. The check-only routes are off in the API.
      let waitSeconds: number | undefined
      const { error } = await auth.signIn.emailOtp({
        email: codeStep.email,
        otp: value,
        fetchOptions: authFetchOptions(undefined, (seconds) => {
          waitSeconds = seconds
        }),
      })

      if (error)
        refuseCall(error, codeStep.sentAt, waitSeconds)
      else finish()
    }
    catch (error) {
      refuseCall(error, codeStep.sentAt)
    }
    finally {
      callingRef.current = false
      setPending(null)
    }
  }

  const continueWithGoogle = async () => {
    setPending('google')
    setProblem(null)
    if (!apiEnabled) {
      window.setTimeout(() => {
        setPending(null)
        finish()
      }, GOOGLE_DELAY_MS)

      return
    }
    try {
      const auth = await loadAuthClient()
      // On success the client leaves the page for Google, so the button stays pending.
      const { error } = await auth.signIn.social({
        provider: 'google',
        callbackURL: signInUrl(returnTo),
        errorCallbackURL: signInErrorUrl(returnTo),
        fetchOptions: authFetchOptions(),
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
    retryAfter,
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
