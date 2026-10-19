import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import Stripe from 'stripe'
import { requireEnv, secret } from '../lib/env.ts'

const env = requireEnv('SP4', {
  STRIPE_SECRET_KEY: secret('rk_test_'),
  STRIPE_PUBLISHABLE_KEY: secret('pk_test_'),
})
const stripe = new Stripe(env.STRIPE_SECRET_KEY)
const port = Number(process.env.SP4_PORT ?? 4242)

const app = new Hono()
app.get('/', async (c) => {
  const intent = await stripe.paymentIntents.create({ amount: 1000, currency: 'chf', automatic_payment_methods: { enabled: true } })
  return c.html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SP4 Payment Element</title>
<script src="https://js.stripe.com/v3/"></script></head>
<body>
<form id="form"><div id="payment-element"></div><button type="submit">Pay CHF 10.00</button><div id="message"></div></form>
<script>
  const stripe = Stripe(${JSON.stringify(env.STRIPE_PUBLISHABLE_KEY)});
  const elements = stripe.elements({ clientSecret: ${JSON.stringify(intent.client_secret)} });
  elements.create('payment').mount('#payment-element');
  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: location.origin + '/done' } });
    if (error) document.getElementById('message').textContent = error.message;
  });
</script></body></html>`)
})
app.get('/done', (c) => c.text(`Returned from the redirect. payment_intent_client_secret present: ${c.req.query('payment_intent_client_secret') ? 'yes' : 'no'}, redirect_status=${c.req.query('redirect_status') ?? 'none'}`))

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => console.log(`SP4 Payment Element page: http://127.0.0.1:${port}  (Ctrl+C to stop)`))
