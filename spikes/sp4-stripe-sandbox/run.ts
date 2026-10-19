import Stripe from 'stripe'
import { finish, requireEnv, secret } from '../lib/env.ts'

const SPIKE = 'SP4'
const env = requireEnv(SPIKE, { STRIPE_SECRET_KEY: secret('rk_test_') })
const stripe = new Stripe(env.STRIPE_SECRET_KEY)

const observations: string[] = []
const failures: string[] = []
const observe = (label: string, value: string) => {
  observations.push(`${label}: ${value}`)
  console.log(`obs  ${label}: ${value}`)
}
const fail = (label: string, reason: string) => {
  failures.push(label)
  console.log(`FAIL ${label}: ${reason}`)
}
const describeError = (error: unknown) =>
  error instanceof Stripe.errors.StripeError
    ? `${error.type} code=${error.code ?? 'none'} status=${error.statusCode ?? 'none'} message="${error.message}"`
    : error instanceof Error
      ? error.message
      : 'unknown error'

try {
  const account = await stripe.accounts.retrieveCurrent()
  observe('account.charges_enabled', String(account.charges_enabled))
  observe('account.payouts_enabled', String(account.payouts_enabled))
  observe('account.country', account.country ?? 'unknown')
  const twint = account.capabilities?.twint_payments
  observe('account.capabilities.twint_payments', twint ?? 'absent')
  if (twint === undefined) fail('twint capability', 'twint_payments is absent from capabilities; request it in Dashboard > Settings > Payment methods')
} catch (error) {
  fail('accounts.retrieveCurrent()', describeError(error))
}

try {
  const configs = await stripe.paymentMethodConfigurations.list({ limit: 10 })
  for (const config of configs.data) {
    observe(
      `payment method configuration ${config.name ?? config.id}`,
      `twint available=${config.twint?.available ?? 'n/a'} preference=${config.twint?.display_preference?.value ?? 'n/a'}`,
    )
  }
  if (configs.data.length === 0) observe('payment method configurations', 'none returned')
} catch (error) {
  fail('paymentMethodConfigurations.list()', describeError(error))
}

try {
  const early = await stripe.paymentIntents.create({ amount: 1000, currency: 'chf', automatic_payment_methods: { enabled: true } })
  const cancelledEarly = await stripe.paymentIntents.cancel(early.id)
  observe('cancel in requires_payment_method', `status ${early.status} -> ${cancelledEarly.status}`)

  const paid = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'chf',
    payment_method: 'pm_card_visa',
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  })
  observe('PaymentIntent after confirm with the test card', paid.status)
  if (paid.status !== 'succeeded') fail('cancel after success setup', `expected succeeded, got ${paid.status}`)
  try {
    const cancelled = await stripe.paymentIntents.cancel(paid.id)
    fail('cancel after success', `cancel unexpectedly succeeded, status ${cancelled.status}`)
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) observe('cancel after success returns', describeError(error))
    else fail('cancel after success', describeError(error))
  }
} catch (error) {
  fail('cancel behaviour', describeError(error))
}

try {
  const twintIntent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'chf',
    confirm: true,
    payment_method_data: { type: 'twint' },
    return_url: 'https://example.com/return',
    automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
  })
  observe('TWINT server-side confirm', `status ${twintIntent.status}, next_action ${twintIntent.next_action?.type ?? 'none'}`)
  await stripe.paymentIntents.cancel(twintIntent.id).catch(() => undefined)
} catch (error) {
  observe('TWINT server-side confirm', describeError(error))
}

console.log('MANUAL: TWINT in the Payment Element needs a browser. Run `npm --prefix spikes run sp4:twint`, open the printed URL, pick TWINT and complete the test redirect.')

finish({ spike: SPIKE, ran: true, scope: 'remote', pass: failures.length === 0, missing: [], detail: `${observations.length} observations` })
