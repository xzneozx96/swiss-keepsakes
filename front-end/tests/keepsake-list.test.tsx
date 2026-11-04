import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const MONEY = /CHF|Fr\.|\d\.\d{2}/

function card(over: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    slug: 'kapellbruecke-mug',
    name: 'Kapellbrücke mug',
    cover: { url: 'https://media.example/mug.jpg', variants: [{ width: 640, url: 'https://media.example/mug-640.webp' }] },
    soldOut: false,
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en', 'de'],
    ...over,
  }
}

let respond: (url: URL) => Response

async function routerAt(path: string) {
  if (typeof CSS.supports !== 'function')
    CSS.supports = () => false
  const { getRouter } = await import('@/router')
  const router = getRouter()
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  vi.stubGlobal('fetch', async (input: Request) => respond(new URL(input.url)))
})

afterEach(() => vi.unstubAllGlobals())

describe('[E6.4] the keepsake list', { timeout: 60_000 }, () => {
  it('[AC54] AC-1 shows a card per keepsake with the name and no price', async () => {
    respond = () => Response.json({ items: [card(), card({ slug: 'cow-bell', name: 'Cow bell', cover: null })] })
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Kapellbrücke mug')).toBeInTheDocument()
    expect(screen.getByText('Cow bell')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /mug|bell/i })).toHaveLength(2)
    expect(document.body.textContent).not.toMatch(MONEY)
  })

  it('[AC53] AC-2 a sold-out card says so and still opens its page', async () => {
    respond = () => Response.json({ items: [card({ soldOut: true })] })
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    const link = await screen.findByRole('link', { name: /Kapellbrücke mug/ })
    expect(link).toHaveTextContent('Sold out')
    expect(link).toHaveAttribute('href', '/en/gifts/kapellbruecke-mug')
  })

  it('[AC54] AC-4 an empty shop shows the shared empty state and no skeleton', async () => {
    respond = () => Response.json({ items: [] })
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    expect(await screen.findByText('No keepsakes for sale yet.')).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="gifts"]')).toBeNull()
  })

  it('[AC54] AC-4 a failed read shows an error with retry and no demo data; retry reads again', async () => {
    let calls = 0
    respond = () => {
      calls += 1
      return calls === 1 ? Response.json({ title: 'down' }, { status: 503 }) : Response.json({ items: [card()] })
    }
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Victorinox', { exact: false })).toBeNull()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(await screen.findByText('Kapellbrücke mug')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('[AC61] AC-3 the server HTML has the names, title, description, canonical and hreflang, and no price', async () => {
    respond = (url) => {
      expect(url.searchParams.get('lang')).toBe('de')
      return Response.json({ items: [card({ name: 'Kapellbrücke-Tasse', slug: 'kapellbruecke-tasse', language: 'de', requestedLanguage: 'de' })] })
    }
    const router = await routerAt('/de/gifts')

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('Kapellbrücke-Tasse')
    expect(html).toMatch(/<title[^>]*>[^<]*Andenken/)
    expect(html).toMatch(/<meta[^>]*name="description"/)
    expect(html).toMatch(/<link[^>]*rel="canonical"[^>]*href="[^"]*\/de\/gifts"/)
    expect(html).toMatch(/<link[^>]*hrefLang="en"[^>]*href="[^"]*\/en\/gifts"|<link[^>]*href="[^"]*\/en\/gifts"[^>]*hreflang="en"/i)
    expect(html.replace(/<(svg|script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, ' ')).not.toMatch(MONEY)
  })
})
