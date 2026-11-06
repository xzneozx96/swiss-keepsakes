import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const MONEY = /CHF|Fr\.|\d\.\d{2}/

function card(over: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    slug: 'kapellbruecke-mug',
    name: 'Kapellbrücke mug',
    cover: { url: 'https://media.example/mug.jpg', variants: [{ width: 640, url: 'https://media.example/mug-640.webp' }] },
    photos: [{ url: 'https://media.example/mug.jpg', variants: [{ width: 640, url: 'https://media.example/mug-640.webp' }] }],
    subtitle: 'Hand-painted ceramic',
    storeName: 'Swiss Native',
    soldOut: false,
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en', 'de'],
    ...over,
  }
}

/** A page as the API sends it (ADR-033). */
const page = (items: ReturnType<typeof card>[]) => ({ items, total: items.length, nextCursor: null })

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
    respond = () => Response.json(page([card(), card({ slug: 'cow-bell', name: 'Cow bell', cover: null })]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Kapellbrücke mug')).toBeInTheDocument()
    expect(screen.getByText('Cow bell')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /mug|bell/i })).toHaveLength(2)
    expect(document.body.textContent).not.toMatch(MONEY)
  })

  it('[AC53] AC-2 a sold-out card says so and still opens its page', async () => {
    respond = () => Response.json(page([card({ soldOut: true })]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    const link = await screen.findByRole('link', { name: /Kapellbrücke mug/ })
    expect(link).toHaveTextContent('Sold out')
    expect(link).toHaveAttribute('href', '/en/gifts/kapellbruecke-mug')
  })

  it('[E6.4] AC-5 each card is a showcase card: the partner block, the name, the subtitle and one link with the photo strip out of the tab order', async () => {
    respond = () => Response.json(page([card()]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    const link = await screen.findByRole('link', { name: /Kapellbrücke mug/ })
    expect(link).toHaveTextContent('Swiss Native')
    expect(link).toHaveTextContent('Victorinox')
    expect(link).toHaveTextContent('Hand-painted ceramic')
    expect(link.querySelector('h3')).toHaveTextContent('Kapellbrücke mug')
    expect(link.querySelector('[data-strip]')).toHaveAttribute('tabindex', '-1')
    expect(link.closest('li')?.querySelectorAll('a, button')).toHaveLength(1)
  })

  it('[E6.4] AC-6 a one-photo keepsake has no dots; two photos show aria-hidden dots', async () => {
    const photo = (n: number) => ({ url: `https://media.example/${n}.jpg`, variants: [{ width: 800, url: `https://media.example/${n}-800.webp` }] })
    respond = () => Response.json(page([card({ slug: 'one', name: 'One photo', photos: [photo(1)] }), card({ slug: 'two', name: 'Two photos', photos: [photo(2), photo(3)] })]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    const one = await screen.findByRole('link', { name: /One photo/ })
    const two = screen.getByRole('link', { name: /Two photos/ })
    expect(one.querySelector('[data-dots]')).toBeNull()
    expect(two.querySelector('[data-dots]')).toHaveAttribute('aria-hidden', 'true')
    expect(two.querySelectorAll('[data-strip] img')).toHaveLength(2)
    expect(two.querySelectorAll('[data-dots] > span')).toHaveLength(2)
  })

  it('[AC53] AC-7 a sold-out card greys its photo and keeps the label as text inside the one link', async () => {
    respond = () => Response.json(page([card({ soldOut: true })]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    const link = await screen.findByRole('link', { name: /Sold out/ })
    expect(link).toHaveTextContent('Sold out')
    expect(link.querySelector('[data-strip]')?.parentElement?.className).toContain('grayscale')
    expect(link).toHaveAttribute('href', '/en/gifts/kapellbruecke-mug')
  })

  it('[AC54] AC-4 an empty shop shows the shared empty state and no skeleton', async () => {
    respond = () => Response.json(page([]))
    const router = await routerAt('/en/gifts')

    render(<RouterProvider router={router} />)

    expect(await screen.findByText('No keepsakes for sale yet.')).toBeInTheDocument()
    expect(document.querySelector('[data-skeleton="gifts"]')).toBeNull()
  })

  it('[AC54] AC-4 a failed read shows an error with retry and no demo data; retry reads again', async () => {
    let calls = 0
    respond = () => {
      calls += 1
      return calls === 1 ? Response.json({ title: 'down' }, { status: 503 }) : Response.json(page([card()]))
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
      return Response.json(page([card({ name: 'Kapellbrücke-Tasse', slug: 'kapellbruecke-tasse', language: 'de', requestedLanguage: 'de' })]))
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

describe('[ADR-033] the keepsake list pages with infinite scroll', { timeout: 60_000 }, () => {
  let serial = 0
  const many = (count: number, prefix = 'item') => Array.from({ length: count }, (_, i) => card({ id: `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`, slug: `${prefix}-${String(i + 1).padStart(2, '0')}`, name: `${prefix} ${String(i + 1).padStart(2, '0')}` }))
  const names = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
  const loadMore = () => screen.getByRole('button', { name: 'Load more' })
  const asked: URL[] = []

  /** The stubbed API pages like the real one: `limit`, a cursor that is the offset, and a `category` that keeps the keepsakes whose slug starts with it. */
  function api(all: ReturnType<typeof card>[], over: { failPageFrom?: number } = {}) {
    asked.length = 0
    respond = (url) => {
      asked.push(url)
      const category = url.searchParams.get('category')
      const matching = category === null ? all : all.filter(item => (item.slug as string).startsWith(category))
      const start = Number(url.searchParams.get('cursor') ?? 0)
      if (over.failPageFrom !== undefined && start >= over.failPageFrom)
        return Response.json({ title: 'down' }, { status: 503 })
      const limit = Number(url.searchParams.get('limit') ?? matching.length)
      return Response.json({ items: matching.slice(start, start + limit), total: matching.length, nextCursor: start + limit < matching.length ? String(start + limit) : null })
    }
  }

  it('the server HTML holds the first ten cards in the order the API sends, and no eleventh, with the total from the server', async () => {
    api(many(25))
    const router = await routerAt('/en/gifts')

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('item 01')
    expect(html).toContain('item 10')
    expect(html).not.toContain('item 11')
    expect(html.indexOf('item 01')).toBeLessThan(html.indexOf('item 02'))
    expect(html).toContain('25 items')
    expect(asked.map(u => u.searchParams.get('limit'))).toEqual(['10'])
  })

  it('load more adds the next ten, says so in a polite live region, and no end line shows when the list is complete', async () => {
    api(many(25))
    render(<RouterProvider router={await routerAt('/en/gifts')} />)
    await screen.findByText('item 01')
    expect(names()).toHaveLength(10)

    await userEvent.click(loadMore())
    await waitFor(() => expect(names()).toHaveLength(20))
    expect(screen.getByText('10 more keepsakes')).toHaveAttribute('role', 'status')

    await userEvent.click(loadMore())
    await waitFor(() => expect(names()).toHaveLength(25))
    expect(screen.getByText('5 more keepsakes')).toHaveAttribute('role', 'status')
    expect(screen.queryByText(/That’s all/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    expect(asked.map(u => u.searchParams.get('cursor'))).toEqual([null, '10', '20'])
  })

  it('a keepsake that shows on two pages draws once', async () => {
    const base = many(11)
    api([...base, base[0]!])
    render(<RouterProvider router={await routerAt('/en/gifts')} />)
    await screen.findByText('item 01')

    await userEvent.click(loadMore())

    await waitFor(() => expect(names()).toHaveLength(11))
    expect(names().filter(name => name === 'item 01')).toHaveLength(1)
  })

  it('a failed page shows Try again in place of the button, no toast, and does not retry by itself', async () => {
    api(many(25), { failPageFrom: 10 })
    render(<RouterProvider router={await routerAt('/en/gifts')} />)
    await screen.findByText('item 01')
    const before = asked.length

    await userEvent.click(loadMore())

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('The next page did not load.')
    expect(document.querySelector('.toast')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
    expect(names()).toHaveLength(10)
    expect(asked.length).toBe(before + 1)
  })

  it('a category in the address is a server filter, and a change of it starts again at page 1', async () => {
    api([...many(12, 'knife'), ...many(12, 'mug')])
    const router = await routerAt('/en/gifts')
    render(<RouterProvider router={router} />)
    await screen.findByText('knife 01')
    await userEvent.click(loadMore())
    await waitFor(() => expect(names()).toHaveLength(20))

    await act(() => router.navigate({ to: '/$lang/gifts', params: { lang: 'en' }, search: { category: 'mug' } }))

    await waitFor(() => expect(names()).toHaveLength(10))
    expect(names()[0]).toBe('mug 01')
    const last = asked.at(-1)!
    expect(last.searchParams.get('category')).toBe('mug')
    expect(last.searchParams.get('cursor')).toBeNull()
    expect(screen.getByText('12 items')).toBeInTheDocument()
  })

  it('the server HTML of a category link carries only that category\'s first page', async () => {
    api([...many(3, 'knife'), ...many(3, 'mug')])
    const router = await routerAt('/en/gifts?category=mug')

    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain('mug 01')
    expect(html).not.toContain('knife 01')
    expect(asked.map(u => u.searchParams.get('category'))).toEqual(['mug'])
  })

  it('an old ?subcategory= or ?q= link still opens the whole list and sends no filter', async () => {
    api(many(3))
    await routerAt('/en/gifts?subcategory=knives&q=mug')

    expect(asked.map(u => u.searchParams.get('category'))).toEqual([null])
  })
})
