import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useParams } from '@tanstack/react-router'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { OnboardingCard } from '@/features/onboarding/components/onboarding-card'
import { OnboardingHost } from '@/features/onboarding/components/onboarding-host'
import { getVisit } from '@/features/onboarding/lib/visit'
import { onboardingDe } from '@/features/onboarding/messages.de'
import { freshBrowser } from './support/onboarding-harness'

type Who = 'guest' | 'staff' | 'unknown'

// A small store, so a test can resolve the audience after the page opened and the card re-renders.
const audience = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  let current: Who = 'guest'

  return {
    get value() { return current },
    set value(next: Who) {
      current = next
      listeners.forEach(listener => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)

      return () => void listeners.delete(listener)
    },
  }
})

vi.mock('@/features/onboarding/hooks/use-onboarding-audience', async () => {
  const { useSyncExternalStore } = await import('react')

  return { useOnboardingAudience: () => useSyncExternalStore(audience.subscribe, () => audience.value) }
})

const TITLE = 'Find what you’ll love in Lucerne'
const SEARCH = 'https://www.google.com/'
const card = () => screen.queryByRole('complementary', { name: TITLE })

function Story() {
  const { slug } = useParams({ strict: false })

  // The story page keys its content by story, as the route does.
  return (
    <div key={slug}>
      <article>
        <p>Story text</p>
      </article>
      <OnboardingCard />
    </div>
  )
}

/** The guest shell in miniature, with fake timers on: the host, a story route and the pages the card must not show on. */
async function open(url: string, referrer = SEARCH) {
  freshBrowser(referrer)
  const root = createRootRoute({
    component: () => (
      <LocaleProvider>
        <OnboardingHost />
        <Outlet />
      </LocaleProvider>
    ),
  })
  const page = (path: string, component: () => React.JSX.Element) => createRoute({ getParentRoute: () => root, path, component })
  const router = createRouter({
    routeTree: root.addChildren([
      page('/$lang', () => <h1>Home page</h1>),
      page('/$lang/stories', () => <h1>Stories</h1>),
      page('/$lang/stories/$slug', Story),
      page('/$lang/gifts/$slug', () => (
        <>
          <h1>Keepsake</h1>
          <OnboardingCard />
        </>
      )),
      page('/$lang/map', () => (
        <>
          <h1>Map</h1>
          <OnboardingCard />
        </>
      )),
      page('/store', () => (
        <>
          <h1>Store</h1>
          <OnboardingCard />
        </>
      )),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
  })

  window.scrollTo = () => {}
  await act(async () => {
    render(<RouterProvider router={router} />)
    await router.load()
  })

  return router
}

async function elapse(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  audience.value = 'guest'
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('[E4.5][AC91] the card appears 10 seconds after a deep-link story opens', () => {
  it('[E4.5][AC91] shows no card at 9 seconds and the card at 10 seconds', async () => {
    await open('/en/stories/lucerne')

    expect(card()).toBeNull()
    await elapse(9_000)
    expect(card()).toBeNull()
    await elapse(1_000)
    expect(card()).toBeInTheDocument()
  })

  it('[E4.5][AC91] stays until hidden: scrolling and time do not hide it', async () => {
    await open('/en/stories/lucerne')
    await elapse(10_000)
    window.dispatchEvent(new Event('scroll'))
    await elapse(60_000)

    expect(card()).toBeInTheDocument()
  })

  it('[E4.5][AC91] the card floats outside the story text, which stays as it was', async () => {
    await open('/en/stories/lucerne')
    const article = document.querySelector('article')!
    const before = article.outerHTML

    await elapse(10_000)

    const aside = card()!

    expect(article.outerHTML).toBe(before)
    expect(article.contains(aside)).toBe(false)
    expect(aside).toHaveClass('fixed')
    expect(aside).not.toHaveAttribute('aria-hidden')
    expect(aside).not.toHaveAttribute('inert')
    // Entry slides and fades over 300 ms, and not under reduced motion; no backdrop comes with it.
    expect(aside.className).toContain('duration-300')
    expect(aside.className).toContain('motion-reduce:transition-none')
    expect(document.querySelector('[data-slot="backdrop"], [data-overlay]')).toBeNull()
  })

  it('[E4.5][AC91] holds the anatomy of the design: photo, title, close, description, one full-width button', async () => {
    await open('/en/stories/lucerne')
    await elapse(10_000)

    const aside = card()!

    expect(aside.querySelector('img')).toHaveClass('size-11', 'rounded-xl')
    expect(aside).toHaveTextContent('Tell us about what you love, and discover places picked just for you.')
    expect(screen.getByRole('button', { name: 'Hide for now' })).toHaveClass('size-11')
    expect(screen.getByRole('button', { name: 'Personalize my visit' })).toHaveClass('h-11')
    expect(aside.querySelectorAll('button')).toHaveLength(2)
  })
})

describe('[E4.5][AC91][AC92] pages and visitors that never see it', () => {
  it.each([
    ['a keepsake page', '/en/gifts/mug'],
    ['the map', '/en/map'],
    ['the home', '/en'],
    ['the stories list', '/en/stories'],
    ['a store screen', '/store'],
  ])('[E4.5][AC92] shows no card on %s after 20 seconds', async (_name, url) => {
    await open(url)
    await elapse(20_000)

    expect(card()).toBeNull()
  })

  it.each([
    ['staff', 'staff'],
    ['an unknown audience', 'unknown'],
  ] as const)('[E4.5][AC92] shows no card for %s on a story after 20 seconds', async (_name, who) => {
    audience.value = who
    await open('/en/stories/lucerne')
    await elapse(20_000)

    expect(card()).toBeNull()
  })

  it('[E4.5][AC91] shows no card when the visit began on the home, even on a story later', async () => {
    const router = await open('/en', '')

    await act(async () => {
      await router.navigate({ to: '/$lang/stories/$slug', params: { lang: 'en', slug: 'lucerne' } })
    })
    await elapse(20_000)

    expect(getVisit()).toEqual({ entry: 'home', cardHidden: false })
    expect(card()).toBeNull()
  })

  it('[E4.5][AC91] waits for the audience: a guest known at 4 seconds still sees it at 10 seconds of the page', async () => {
    audience.value = 'unknown'
    await open('/en/stories/lucerne')

    await elapse(4_000)
    await act(async () => {
      audience.value = 'guest'
    })
    await elapse(5_000)
    expect(card()).toBeNull()
    await elapse(1_100)
    expect(card()).toBeInTheDocument()
  })
})

describe('[E4.5][AC91] hiding is not a skip', () => {
  it('[E4.5][AC91] the close button hides it for the visit and the next story stays clear', async () => {
    const router = await open('/en/stories/lucerne')

    await elapse(10_000)
    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Hide for now' }))

    expect(card()).toBeNull()
    expect(getVisit()?.cardHidden).toBe(true)

    vi.useFakeTimers()
    await act(async () => {
      await router.navigate({ to: '/$lang/stories/$slug', params: { lang: 'en', slug: 'rigi' } })
    })
    await elapse(30_000)

    expect(card()).toBeNull()
  })

  it('[E4.5][AC91] Escape with focus in the card hides it for the visit', async () => {
    await open('/en/stories/lucerne')
    await elapse(10_000)
    vi.useRealTimers()
    screen.getByRole('button', { name: 'Personalize my visit' }).focus()
    await userEvent.keyboard('{Escape}')

    expect(card()).toBeNull()
    expect(getVisit()?.cardHidden).toBe(true)
  })

  it('[E4.5][AC91] hiding does not skip: the flow still opens at the next Explore opening', async () => {
    const router = await open('/en/stories/lucerne')

    await elapse(10_000)
    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Hide for now' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => {
      await router.navigate({ to: '/$lang', params: { lang: 'en' } })
    })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('[E4.5][AC36] the button opens the flow', () => {
  it('[E4.5][AC36] Personalize my visit opens the two-step flow with focus on its heading', async () => {
    await open('/en/stories/lucerne')
    await elapse(10_000)
    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Personalize my visit' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /1 of 2\. How long are you in Lucerne/ })).toHaveFocus()
  })
})

describe('[E4.5][AC91] the timer is cleaned up', () => {
  it('[E4.5][AC91] leaving at 5 seconds for the list leaves no card and no timer', async () => {
    const router = await open('/en/stories/lucerne')

    await elapse(5_000)
    await act(async () => {
      await router.navigate({ to: '/$lang/stories', params: { lang: 'en' } })
    })
    await elapse(10_000)

    expect(card()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('[E4.5][AC91] leaving at 5 seconds for another story: no card at 10 seconds of the first page, the card 10 seconds into the new one', async () => {
    const router = await open('/en/stories/lucerne')

    await elapse(5_000)
    await act(async () => {
      await router.navigate({ to: '/$lang/stories/$slug', params: { lang: 'en', slug: 'rigi' } })
    })
    await elapse(5_000)
    expect(card()).toBeNull()
    await elapse(5_000)
    expect(card()).toBeInTheDocument()
  })

  it('[E4.5][AC91] unmounting at 5 seconds clears the one timer', async () => {
    await open('/en/stories/lucerne')
    await elapse(5_000)
    cleanup()

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('[E4.5][AC91] German copy fits at 375 px', () => {
  // The lab measured these strings at 351 px wide: the title in the serif face on two lines at most, the description on
  // two lines, the button on one. jsdom has no layout, so the copy is capped at their lengths and the classes that wrap it are pinned.
  it('[E4.5][AC91] the German title, description, button and hide label are no longer than the lab strings', () => {
    expect(onboardingDe['onboarding.nudge.title'].length).toBeLessThanOrEqual(48)
    expect(onboardingDe['onboarding.nudge.description'].length).toBeLessThanOrEqual(92)
    expect(onboardingDe['onboarding.nudge.button'].length).toBeLessThanOrEqual(29)
    expect(onboardingDe['onboarding.nudge.hide'].length).toBeLessThanOrEqual(18)
  })

  it('[E4.5][AC91] the title can shrink and wrap, so a long word does not push the close button out', async () => {
    await open('/en/stories/lucerne')
    await elapse(10_000)

    expect(screen.getByText(TITLE, { selector: 'p' })).toHaveClass('min-w-0', 'flex-1', 'text-balance')
    expect(card()).toHaveClass('w-[calc(100%-1.5rem)]')
  })
})
