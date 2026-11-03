import { describe, expect, it } from 'vitest'
import { analyticsEnabled, posthogKey } from '@/lib/analytics/config'

const KEY = 'phc_test_key'

describe('[E8.7][AC37][AC60][AC-7] analyticsEnabled', () => {
  it('is off in production by default', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'production' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: ' Production ' })).toBe(false)
  })

  it.each(['development', 'dev', 'staging', 'preview', ''])('is on for the %j environment', (siteEnv) => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: siteEnv })).toBe(true)
  })

  it('is on when VITE_SITE_ENV is unset (local dev)', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY })).toBe(true)
  })

  it('lets an explicit VITE_POSTHOG_ENABLED=true turn it on in production', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'production', VITE_POSTHOG_ENABLED: 'true' })).toBe(true)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'production', VITE_POSTHOG_ENABLED: ' TRUE ' })).toBe(true)
  })

  it('lets an explicit VITE_POSTHOG_ENABLED=false turn it off in dev and staging', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: 'false' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_POSTHOG_ENABLED: 'False' })).toBe(false)
  })

  it('ignores an override that is neither true nor false', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'production', VITE_POSTHOG_ENABLED: '1' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: 'yes' })).toBe(true)
  })

  it('is off without a key, whatever else says', () => {
    expect(analyticsEnabled({ VITE_SITE_ENV: 'staging' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: '', VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: '   ', VITE_SITE_ENV: 'staging' })).toBe(false)
  })
})

describe('[E8.7][AC37][AC60][AC-7] posthogKey', () => {
  it('returns the trimmed key', () => {
    expect(posthogKey({ VITE_POSTHOG_KEY: ` ${KEY} ` })).toBe(KEY)
  })

  it('returns undefined when the key is unset or blank', () => {
    expect(posthogKey({})).toBeUndefined()
    expect(posthogKey({ VITE_POSTHOG_KEY: '' })).toBeUndefined()
    expect(posthogKey({ VITE_POSTHOG_KEY: '  ' })).toBeUndefined()
  })
})
