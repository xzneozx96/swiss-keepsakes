import { expect, test } from '@playwright/test'

test('the app mounts at the home route without page errors @smoke', async ({
  page,
}) => {
  const errors: string[] = []

  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/#/')

  await expect(page.locator('#root > *').first()).toBeVisible()
  expect(errors).toEqual([])
})
