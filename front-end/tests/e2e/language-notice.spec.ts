import { expect, test } from '@playwright/test'

// E3.11 / AC64: a story address in a language the story has no version in.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

test.describe('[E3.11][AC64] story with no version in the URL language', () => {
  test('redirects the German address of an English-only story to the English one', async ({ request }) => {
    const response = await request.get('/de/stories/a-quiet-morning-on-the-reuss', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/en/stories/a-quiet-morning-on-the-reuss')
  })

  test('redirects the English address of a German-only story to the German one', async ({ request }) => {
    const response = await request.get('/en/stories/ein-ruhiger-morgen-an-der-reuss', { maxRedirects: 0 })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/de/stories/ein-ruhiger-morgen-an-der-reuss')
  })

  test('answers 404 for a story with no version in either language', async ({ request }) => {
    const response = await request.get('/de/stories/nope', { maxRedirects: 0 })

    expect(response.status()).toBe(404)
  })
})
