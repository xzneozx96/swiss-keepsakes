import { expect, test } from '@playwright/test'

test('the app mounts at the home route without page errors @smoke', async ({
  page,
}) => {
  const errors: string[] = []

  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')

  // The prototype bar renders only after the client boots, so this proves hydration, not just the server HTML.
  await expect(page.getByRole('region', { name: 'Prototype controls' })).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  expect(errors).toEqual([])
})
