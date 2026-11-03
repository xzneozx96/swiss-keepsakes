import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'phc_test_key'
const ID = '3f1c2b8e-5a47-4d0e-9b6a-1c2d3e4f5a6b'

function fakePosthog() {
  return { init: vi.fn(), capture: vi.fn(), identify: vi.fn(), register: vi.fn(), opt_in_capturing: vi.fn(), opt_out_capturing: vi.fn() }
}

/** Fresh modules and a counted posthog-js module, so a test can say whether the library was ever loaded. */
async function load(fake: ReturnType<typeof fakePosthog> | 'rejects' = fakePosthog()) {
  vi.resetModules()
  const factory = vi.fn(() => {
    if (fake === 'rejects')
      throw new Error('blocked by an extension')

    return { default: fake }
  })

  vi.doMock('posthog-js', factory)

  return {
    factory,
    fake,
    track: (await import('@/lib/analytics/track')).track,
    client: await import('@/lib/analytics/client'),
    allowList: await import('@/lib/analytics/allow-list'),
    trackModule: await import('@/lib/analytics/track'),
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { value, configurable: true })
}

beforeEach(() => {
  vi.stubEnv('VITE_POSTHOG_KEY', KEY)
  vi.stubEnv('VITE_SITE_ENV', 'staging')
  vi.stubEnv('VITE_POSTHOG_ENABLED', 'true')
  window.localStorage.clear()
  setReferrer('')
  window.innerWidth = 1280
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('posthog-js')
})

describe('[E8.7][AC37][AC60][AC-3] posthogConfig', () => {
  it('is the chosen configuration of ADR-032, exactly', async () => {
    const { client, allowList } = await load()
    const config = client.posthogConfig()

    expect(config).toEqual({
      api_host: 'https://eu.i.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      capture_pageview: false,
      capture_pageleave: false,
      before_send: expect.any(Function),
      disable_external_dependency_loading: true,
      capture_performance: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      rageclick: false,
      disable_conversations: true,
      disable_product_tours: true,
      save_campaign_params: false,
      save_referrer: false,
      advanced_disable_toolbar_metrics: true,
    })
    expect(config.before_send).toBe(allowList.allowListBeforeSend)
  })
})

describe('[E8.7][AC37][AC60][AC-3] track starts PostHog once, in the browser, with that configuration', () => {
  it('imports and inits posthog-js on the first event and captures the closed properties', async () => {
    const { track, fake, factory, client } = await load()

    track('page_view', { pageType: 'home', language: 'en' })
    await settle()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(fake).not.toBe('rejects')
    const posthog = fake as ReturnType<typeof fakePosthog>

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.init).toHaveBeenCalledWith(KEY, client.posthogConfig())
    expect(posthog.capture).toHaveBeenCalledWith('page_view', { page_type: 'home', language: 'en', referrer_class: 'direct', device_class: 'desktop' })
  })

  it('inits once for any number of events', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    track('page_view', { pageType: 'home', language: 'en' })
    track('pin_open', { pageType: 'place', contentId: ID, language: 'en' })
    track('page_view', { pageType: 'map', language: 'en' })
    await settle()

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.capture.mock.calls.map(call => call[0])).toEqual(['page_view', 'pin_open', 'page_view'])
  })

  it('never loads the library at module load, and never from startAnalytics when there is no window', async () => {
    const { factory, client } = await load()

    expect(factory).not.toHaveBeenCalled()

    vi.stubGlobal('window', undefined)
    const started = await client.startAnalytics()

    vi.unstubAllGlobals()

    expect(started).toBeUndefined()
    expect(factory).not.toHaveBeenCalled()
  })

  it('never calls identify, register or an opt-in or opt-out', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    track('page_view', { pageType: 'home', language: 'en' })
    await settle()

    expect(posthog.identify).not.toHaveBeenCalled()
    expect(posthog.register).not.toHaveBeenCalled()
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled()
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled()
  })
})

describe('[E8.7][AC37][AC60][AC-4][AC-6] the closed properties that track builds', () => {
  it('adds the content id, the device class from the width and the audience read at call time', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    window.innerWidth = 500
    track('pin_open', { pageType: 'place', contentId: ID, language: 'de' })
    window.localStorage.setItem('sk.onboarding', JSON.stringify({ v: 1, segment: 'multi_day', interests: ['food-drink', 'nightlife'], answeredAt: 'x', dismissedAt: null }))
    window.innerWidth = 800
    track('pin_open', { pageType: 'place', contentId: ID, language: 'de' })
    await settle()

    expect(posthog.capture.mock.calls[0]![1]).toEqual({ page_type: 'place', content_id: ID, language: 'de', referrer_class: 'direct', device_class: 'phone' })
    expect(posthog.capture.mock.calls[1]![1]).toEqual({ page_type: 'place', content_id: ID, language: 'de', referrer_class: 'direct', device_class: 'tablet', segment: 'multi_day', interests: ['food-drink'] })
  })

  it('derives the referrer class once per visit, from the referrer and the query at the first event', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    setReferrer('https://www.google.com/')
    track('page_view', { pageType: 'home', language: 'en' })
    setReferrer('https://www.instagram.com/')
    track('page_view', { pageType: 'map', language: 'en' })
    await settle()

    expect(posthog.capture.mock.calls.map(call => (call[1] as Record<string, unknown>).referrer_class)).toEqual(['search', 'search'])
  })

  it('counts a same-site referrer as direct', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    setReferrer(`${window.location.origin}/en`)
    track('page_view', { pageType: 'home', language: 'en' })
    await settle()

    expect((posthog.capture.mock.calls[0]![1] as Record<string, unknown>).referrer_class).toBe('direct')
  })

  it('survives a localStorage that throws: the event goes out without segment and interests', async () => {
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    track('page_view', { pageType: 'home', language: 'en' })
    await settle()
    spy.mockRestore()

    expect(posthog.capture).toHaveBeenCalledWith('page_view', { page_type: 'home', language: 'en', referrer_class: 'direct', device_class: 'desktop' })
  })
})

describe('[E8.7][AC37][AC60][AC-7] the switch', () => {
  it('off in production: nothing is imported, inited or sent, and track runs without error', async () => {
    vi.stubEnv('VITE_SITE_ENV', 'production')
    const { track, factory, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    expect(() => track('page_view', { pageType: 'home', language: 'en' })).not.toThrow()
    await settle()

    expect(factory).not.toHaveBeenCalled()
    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('off when VITE_SITE_ENV is missing (counts as production), even with the key and the switch on', async () => {
    vi.stubEnv('VITE_SITE_ENV', '')
    const { track, factory, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    track('page_view', { pageType: 'home', language: 'en' })
    await settle()

    expect(factory).not.toHaveBeenCalled()
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('off by VITE_POSTHOG_ENABLED=false in staging, and off without a key', async () => {
    vi.stubEnv('VITE_POSTHOG_ENABLED', 'false')
    const first = await load()

    first.track('page_view', { pageType: 'home', language: 'en' })
    await settle()
    expect(first.factory).not.toHaveBeenCalled()

    vi.stubEnv('VITE_POSTHOG_ENABLED', 'true')
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const second = await load()

    second.track('page_view', { pageType: 'home', language: 'en' })
    await settle()
    expect(second.factory).not.toHaveBeenCalled()
  })

  it.each(['development', 'staging'])('on in %s', async (siteEnv) => {
    vi.stubEnv('VITE_SITE_ENV', siteEnv)
    const { track, fake } = await load()
    const posthog = fake as ReturnType<typeof fakePosthog>

    track('page_view', { pageType: 'home', language: 'en' })
    await settle()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
  })

  it('a test sink takes the event and nothing else happens, whatever the switch says', async () => {
    const { trackModule, factory } = await load()
    const seen: unknown[] = []

    trackModule.setTrackSink((name, props) => seen.push([name, props]))
    trackModule.track('pin_open', { pageType: 'place', contentId: ID, language: 'en' })
    await settle()

    expect(seen).toEqual([['pin_open', { page_type: 'place', content_id: ID, language: 'en', referrer_class: 'direct', device_class: 'desktop' }]])
    expect(factory).not.toHaveBeenCalled()
  })
})

describe('[E8.7][AC37][AC60][AC-10] a failing PostHog does not disturb the page', () => {
  it('swallows an init that throws and does not retry it', async () => {
    const posthog = fakePosthog()

    posthog.init.mockImplementation(() => {
      throw new Error('init failed')
    })
    const { track } = await load(posthog)

    expect(() => track('page_view', { pageType: 'home', language: 'en' })).not.toThrow()
    track('page_view', { pageType: 'map', language: 'en' })
    await settle()

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('swallows a capture that throws, and the next event is still tried', async () => {
    const posthog = fakePosthog()

    posthog.capture.mockImplementation(() => {
      throw new Error('capture failed')
    })
    const { track } = await load(posthog)

    expect(() => track('page_view', { pageType: 'home', language: 'en' })).not.toThrow()
    track('page_view', { pageType: 'map', language: 'en' })
    await settle()

    expect(posthog.capture).toHaveBeenCalledTimes(2)
  })

  it('swallows an import that rejects (blocked) and remembers the failure', async () => {
    const { track, factory } = await load('rejects')

    expect(() => track('page_view', { pageType: 'home', language: 'en' })).not.toThrow()
    track('page_view', { pageType: 'map', language: 'en' })
    await settle()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('does not let a throwing test sink out of track', async () => {
    const { trackModule } = await load()

    trackModule.setTrackSink(() => {
      throw new Error('sink failed')
    })

    expect(() => trackModule.track('page_view', { pageType: 'home', language: 'en' })).not.toThrow()
  })
})
