import { expect, test } from '@playwright/test'

// [E2.1] With no API configured (VITE_API_ENABLED unset, as on Vercel) the prototype's demo sign-in runs as before,
// and the auth client is never downloaded.
test('[E2.1] demo mode signs in with any 6 digits and never loads the auth client', async ({ page }) => {
  const requested: string[] = []

  page.on('request', request => requested.push(request.url()))
  await page.goto('/sign-in?returnTo=/account')
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await page.locator('#sign-in-code').pressSequentially('123456')

  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  expect(requested.filter(url => /better-auth@|\.vite\/deps\/better-auth|\/auth-client\.ts|\/api\/auth\//.test(url))).toEqual([])
})
