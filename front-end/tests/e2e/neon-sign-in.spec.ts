import type { Page } from '@playwright/test'
import type { NeonAuthStub, Translate } from './neon-auth-stub'

import { expect, GOOGLE_URL, test } from './neon-auth-stub'

// C05 on Neon Auth (E2.1). These specs run in the `webkit-*` and `chromium-*` phone projects, whose
// dev server has VITE_NEON_AUTH_URL set (playwright.config.ts). Neon Auth is the stub in
// neon-auth-stub.ts on another site, as the real Neon Auth is, so its session cookie is third-party.

const EMAIL = 'guest@example.com'

/**
 * WebKit refuses a third-party cookie, `Partitioned` or not, so the session never reaches the jar.
 * The specs that need a session are expected to fail there until Neon Auth is served from our own
 * origin or D8 changes. Remove the mark when they pass.
 */
const WEBKIT_DROPS_THE_SESSION
  = 'WebKit refuses Neon Auth\'s session cookie, which is third-party on our origin (D8, R13). See the E2.1 report.'

async function openSignIn(page: Page) {
  await page.goto('/#/sign-in?returnTo=%2Faccount')
}

async function requestCode(page: Page, t: Translate) {
  await page.getByRole('textbox', { name: t('auth.email.label'), exact: true }).fill(EMAIL)
  await page.getByRole('button', { name: t('auth.email.send') }).click()
  await expect(page.getByRole('heading', { name: t('auth.code.title') })).toBeVisible()
}

async function typeCode(page: Page, code: string) {
  await page.locator('#sign-in-code').focus()
  await page.keyboard.type(code)
}

async function expectSignedIn(page: Page, t: Translate) {
  await expect(page).toHaveURL(/#\/account$/)
  await expect(page.getByRole('button', { name: t('account.signOut') })).toBeVisible()
}

async function expectSignedOut(page: Page, t: Translate) {
  await expect(page.getByRole('button', { name: t('auth.account.signIn') })).toBeVisible()
}

async function signIn(page: Page, t: Translate, neonAuth: NeonAuthStub) {
  await openSignIn(page)
  await requestCode(page, t)
  await typeCode(page, neonAuth.code)
  await expectSignedIn(page, t)
}

test.describe('[E2.1][AC01] C05 on Neon Auth: the code step', () => {
  test('emails a code for sign-in and says it works for 5 minutes', async ({ page, t, neonAuth }) => {
    await page.goto('/#/account')
    await page.getByRole('button', { name: t('auth.account.signIn') }).click()

    await requestCode(page, t)

    expect(neonAuth.calledAt('/email-otp/send-verification-otp').map(call => call.body)).toEqual([
      { email: EMAIL, type: 'sign-in' },
    ])
    await expect(page.getByText(t('auth.code.hint', { length: 6, minutes: 5 }))).toBeVisible()
  })

  test('a wrong code shows the tries left, and the 3rd wrong code locks it until a new code', async ({ page, t, neonAuth }) => {
    await openSignIn(page)
    await requestCode(page, t)

    await typeCode(page, '111111')
    await expect(page.getByText(t('auth.code.wrong'))).toBeVisible()
    await expect(page.getByText(t('auth.code.attemptsLeft.other', { count: 2 }))).toBeVisible()

    await typeCode(page, '222222')
    await expect(page.getByText(t('auth.code.attemptsLeft.one', { count: 1 }))).toBeVisible()

    await typeCode(page, '333333')
    await expect(page.getByText(t('auth.code.locked'))).toBeVisible()
    await expect(page.getByRole('button', { name: t('auth.code.submit') })).toBeHidden()
    expect(neonAuth.calledAt('/sign-in/email-otp')).toHaveLength(3)

    await page.getByRole('button', { name: t('auth.code.sendNew') }).click()
    await expect(page.getByText(t('auth.code.locked'))).toBeHidden()
    expect(neonAuth.calledAt('/email-otp/send-verification-otp')).toHaveLength(2)
  })

  test('an expired code asks for a new one', async ({ page, t, neonAuth }) => {
    await openSignIn(page)
    await requestCode(page, t)
    neonAuth.expireCode()

    await typeCode(page, neonAuth.code)
    await expect(page.getByText(t('auth.code.expired', { minutes: 5 }))).toBeVisible()

    await page.getByRole('button', { name: t('auth.code.sendNew') }).click()
    await expect(page.getByText(t('auth.code.expired', { minutes: 5 }))).toBeHidden()
    expect(neonAuth.calledAt('/email-otp/send-verification-otp')).toHaveLength(2)
  })

  test('resend unlocks after 30 seconds and sends a new code', async ({ page, t, neonAuth }) => {
    await page.clock.install()
    await openSignIn(page)
    await requestCode(page, t)

    await expect(page.getByRole('button', { name: t('auth.code.resendIn', { time: '0:30' }) })).toBeDisabled()
    await page.clock.fastForward(31_000)
    await page.getByRole('button', { name: t('auth.code.resend') }).click()

    await expect.poll(() => neonAuth.calledAt('/email-otp/send-verification-otp').length).toBe(2)
    await expect(page.getByRole('button', { name: t('auth.code.resendIn', { time: '0:30' }) })).toBeDisabled()
  })

  test('Continue with Google leaves for Google with this screen as the way back', async ({ page, t, neonAuth }) => {
    await page.route(`${GOOGLE_URL}**`, route => route.fulfill({ contentType: 'text/html', body: '<h1>Google consent (stub)</h1>' }))
    await openSignIn(page)

    await page.getByRole('button', { name: t('auth.google') }).click()

    await expect(page).toHaveURL(url => url.href.startsWith(GOOGLE_URL))
    expect(neonAuth.calledAt('/sign-in/social').map(call => call.body)).toEqual([
      {
        provider: 'google',
        callbackURL: 'http://localhost:5392/#/sign-in?returnTo=%2Faccount',
        errorCallbackURL: 'http://localhost:5392/#/sign-in?returnTo=%2Faccount&google=failed',
      },
    ])
  })

  test('a Google sign-in that did not finish says so, and the address is cleaned', async ({ page, t }) => {
    await page.goto('/?error=access_denied#/sign-in?returnTo=%2Faccount&google=failed')

    await expect(page.getByRole('alert').filter({ hasText: t('auth.google.failed') })).toBeVisible()
    await expect(page.getByRole('button', { name: t('auth.google') })).toBeEnabled()
    expect(new URL(page.url()).search).toBe('')
  })

  test('when Neon Auth cannot be reached, the app starts signed out and sign-in says so', async ({ page, t, neonAuth }) => {
    neonAuth.goOffline()
    await page.goto('/#/account')
    await expectSignedOut(page, t)

    await page.getByRole('button', { name: t('auth.account.signIn') }).click()
    await page.getByRole('textbox', { name: t('auth.email.label'), exact: true }).fill(EMAIL)
    await page.getByRole('button', { name: t('auth.email.send') }).click()
    await expect(page.getByRole('alert').filter({ hasText: t('auth.unavailable') })).toBeVisible()
  })
})

test.describe('[E2.1][AC01] C05 on Neon Auth: the session', () => {
  test.fail(({ browserName }) => browserName === 'webkit', WEBKIT_DROPS_THE_SESSION)

  test('the browser keeps Neon Auth\'s session cookie after sign-in', async ({ page, t, neonAuth }) => {
    await openSignIn(page)
    await requestCode(page, t)
    await typeCode(page, neonAuth.code)

    await expect.poll(() => neonAuth.storedCookie()).toMatch(/^opaque-/)
  })

  test('signs in with an emailed code and stays signed in after a reload', async ({ page, t, neonAuth, browserName }) => {
    await page.goto('/#/account')
    await expectSignedOut(page, t)
    await signIn(page, t, neonAuth)

    await page.reload()
    await expectSignedIn(page, t)
    // Only Chromium's routes show the request's cookies.
    if (browserName === 'chromium')
      expect(neonAuth.calledAt('/get-session').at(-1)!.cookie).toContain('__Secure-neon-auth.session_token=opaque-')
  })

  test('coming back from Google signs the guest in and cleans the address', async ({ page, t, neonAuth }) => {
    const verifier = neonAuth.googleFinished()

    await page.goto(`/?neon_auth_session_verifier=${verifier}#/sign-in?returnTo=%2Faccount`)

    await expectSignedIn(page, t)
    expect(neonAuth.calledAt('/get-session')[0]!.search).toContain(`neon_auth_session_verifier=${verifier}`)
    expect(page.url()).toBe('http://localhost:5392/#/account')

    await page.reload()
    await expectSignedIn(page, t)
  })

  test('the session decides who is signed in, not the demo data saved in the browser', async ({ page, t, neonAuth }) => {
    await signIn(page, t, neonAuth)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sk.demo')!).data.signedInGuestId as string | null)

    expect(saved).not.toBeNull()
    neonAuth.endSessions()
    await page.reload()

    await expectSignedOut(page, t)
  })

  test('sign out ends the Neon Auth session, so a reload stays signed out', async ({ page, t, neonAuth }) => {
    await signIn(page, t, neonAuth)

    await page.getByRole('button', { name: t('account.signOut') }).click()
    await expectSignedOut(page, t)
    expect(neonAuth.calledAt('/sign-out')).toHaveLength(1)

    await page.reload()
    await expectSignedOut(page, t)
  })

  test('the JWT stays in memory and goes to the API as a Bearer token', async ({ page, t, neonAuth, storageWrites }) => {
    const apiCalls: (string | undefined)[] = []

    await page.route('**/healthz', async (route) => {
      apiCalls.push((await route.request().allHeaders()).authorization)
      await route.fulfill({ json: { status: 'ok' } })
    })
    // No screen imports the API client yet, so the dev server bundles its dependencies when the
    // first page does and may reload that page. Load it before signing in.
    await page.goto('/#/')
    await expect(async () => {
      await page.evaluate(() => import('/src/features/data-client/api-client.ts'))
    }).toPass()
    await signIn(page, t, neonAuth)

    // No screen calls the API yet (E2.5 moves the first feature), so the page builds the client a
    // feature will use and calls the one route the contract has.
    const callApi = () => page.evaluate(async () => {
      const { createSignedApiClient } = await import('/src/features/data-client/api-client.ts')
      const { getAccessToken } = await import('/src/features/auth/lib/neon-auth.ts')

      await createSignedApiClient(location.origin, getAccessToken).GET('/healthz')
    })

    await callApi()
    expect(apiCalls).toEqual([`Bearer ${neonAuth.lastJwt}`])

    await page.reload()
    await expectSignedIn(page, t)
    await callApi()
    expect(apiCalls[1]).toBe(`Bearer ${neonAuth.lastJwt}`)

    const written = (await storageWrites()).join('\n')

    expect(neonAuth.secrets.length).toBeGreaterThan(2)
    for (const secret of neonAuth.secrets)
      expect(written, 'a token was written to storage or a cookie').not.toContain(secret)
    expect(await page.context().cookies('http://localhost:5392'), 'our code set a cookie on the app').toEqual([])
  })
})
