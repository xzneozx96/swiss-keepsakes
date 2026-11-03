import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

interface Recorded { via: string, url: string, body: string }

const requests: Recorded[] = []
const ID = '3f1c2b8e-5a47-4d0e-9b6a-1c2d3e4f5a6b'
const analyticsDir = join(__dirname, '../src/lib/analytics')

function bodyText(body: unknown): string {
  if (typeof body === 'string')
    return body
  if (body instanceof URLSearchParams)
    return body.toString()

  return body === undefined || body === null ? '' : `[${Object.prototype.toString.call(body)}]`
}

function sentProperties(): Array<Record<string, unknown>> {
  return requests.flatMap((request) => {
    try {
      // The batch endpoint takes { api_key, batch: [event, ...] }; compression is off so the body can be read.
      const parsed = JSON.parse(request.body) as { batch?: Array<{ properties: Record<string, unknown> }> }

      return (parsed.batch ?? []).map(item => item.properties)
    }
    catch {
      return []
    }
  })
}

beforeAll(async () => {
  vi.useFakeTimers()
  // The network is replaced before the library is loaded or started: nothing can leave this test.
  vi.stubGlobal('fetch', vi.fn((url: unknown, init?: { body?: unknown }) => {
    requests.push({ via: 'fetch', url: String(url), body: bodyText(init?.body) })

    return Promise.resolve(new Response('{}', { status: 200 }))
  }))
  class RecordingXhr {
    private url = ''
    status = 200
    responseText = '{}'
    readyState = 4
    onreadystatechange: (() => void) | null = null
    open(_method: string, url: string) {
      this.url = url
    }

    setRequestHeader() {}
    addEventListener() {}
    send(body?: unknown) {
      requests.push({ via: 'xhr', url: this.url, body: bodyText(body) })
      this.onreadystatechange?.()
    }
  }
  vi.stubGlobal('XMLHttpRequest', RecordingXhr)
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (url: string, data?: unknown) => {
      requests.push({ via: 'beacon', url, body: bodyText(data) })

      return true
    },
  })
  window.localStorage.clear()
  window.sessionStorage.clear()

  const { default: posthog } = await vi.importActual<typeof import('posthog-js')>('posthog-js')
  const { posthogConfig } = await import('@/lib/analytics/client')

  posthog.init('phc_real_test_key', { ...posthogConfig(), disable_compression: true })
  posthog.capture('page_view', { page_type: 'home', language: 'en' })
  posthog.capture('pin_open', { page_type: 'place', content_id: ID, language: 'de', device_class: 'phone', segment: 'multi_day', interests: ['food-drink'] })
  // Two events that the allow-list must refuse.
  posthog.capture('order_submit', { page_type: 'other' })
  posthog.capture('page_view', { page_type: 'home', email: 'a@b.ch' })
  await vi.advanceTimersByTimeAsync(10_000)
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('[E8.7][AC37][AC60][AC-2] the real posthog-js with the chosen configuration', () => {
  it('leaves nothing in localStorage, sessionStorage or cookies', () => {
    expect(Object.keys(window.localStorage)).toEqual([])
    expect(Object.keys(window.sessionStorage)).toEqual([])
    expect(document.cookie).toBe('')
  })

  it('sends only to eu.i.posthog.com, and never asks for flags, config or a script', () => {
    expect(requests.length).toBeGreaterThan(0)
    for (const request of requests) {
      expect(new URL(request.url, 'https://placeholder.invalid').host).toBe('eu.i.posthog.com')
      expect(request.url).not.toMatch(/\/flags|\/decide|\/array\/|config\.js|\/static\//)
    }
  })

  it('sends the two allowed events and drops the two others', () => {
    const sent = requests.map(request => request.body).join('')

    expect(sent).toContain('"event":"page_view"')
    expect(sent).toContain('"event":"pin_open"')
    expect(sent).not.toContain('order_submit')
    expect(sent).not.toContain('a@b.ch')
    expect(sentProperties()).toHaveLength(2)
  })

  it('sends only the closed properties plus token, distinct_id and $process_person_profile', () => {
    const [view, pin] = sentProperties()

    expect(Object.keys(view!).sort()).toEqual(['$process_person_profile', 'distinct_id', 'language', 'page_type', 'token'])
    expect(Object.keys(pin!).sort()).toEqual(['$process_person_profile', 'content_id', 'device_class', 'distinct_id', 'interests', 'language', 'page_type', 'segment', 'token'])
    expect(view!.$process_person_profile).toBe(false)
    expect(view!.token).toBe('phc_real_test_key')
  })

  it('carries no $set, $set_once, URL, referrer or user agent', () => {
    const sent = requests.map(request => request.body).join('')

    expect(sent).not.toMatch(/\$set|\$current_url|\$referrer|\$user_agent|\$pathname|\$host/)
  })
})

describe('[E8.7][AC37][AC-2] our code never identifies or opts anyone in or out', () => {
  const files = [
    ...readdirSync(analyticsDir).filter(name => name.endsWith('.ts')).map(name => join(analyticsDir, name)),
    join(__dirname, '../src/features/analytics/components/analytics-root.tsx'),
  ]

  it.each(files)('%s calls none of identify, register, set_person_properties, opt_in, opt_out, group, alias', (file) => {
    const source = readFileSync(file, 'utf8')

    expect(source).not.toMatch(/\.(?:identify|register|register_once|setPersonProperties|set_person_properties|setPersonPropertiesForFlags|opt_in_capturing|opt_out_capturing|group|alias)\s*\(/)
  })
})
