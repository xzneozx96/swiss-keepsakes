import { describe, expect, it } from 'vitest'
import { analyticsEnabled, posthogKey } from '@/lib/analytics/config'

const KEY = 'phc_test_key'

describe('[E8.7][AC37][AC60][AC-7] analyticsEnabled (fail closed)', () => {
  it.each(['development', 'staging', 'test', ' Staging '])('is on for the %j environment with a key and VITE_POSTHOG_ENABLED=true', (siteEnv) => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_POSTHOG_ENABLED: 'true', VITE_SITE_ENV: siteEnv })).toBe(true)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_POSTHOG_ENABLED: ' TRUE ', VITE_SITE_ENV: siteEnv })).toBe(true)
  })

  it.each(['production', ' Production ', '', 'prod', 'preview', 'dev', 'anything'])('is off for the %j environment, even with a key and the switch on', (siteEnv) => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_POSTHOG_ENABLED: 'true', VITE_SITE_ENV: siteEnv })).toBe(false)
  })

  it('is off when VITE_SITE_ENV is missing, as production is (the host forgot to set it)', () => {
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
  })

  it('is off unless VITE_POSTHOG_ENABLED is exactly true', () => {
    for (const enabled of [undefined, '', 'false', '1', 'yes', 'on'])
      expect(analyticsEnabled({ VITE_POSTHOG_KEY: KEY, VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: enabled })).toBe(false)
  })

  it('is off without a key, whatever else says', () => {
    expect(analyticsEnabled({ VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: '', VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
    expect(analyticsEnabled({ VITE_POSTHOG_KEY: '   ', VITE_SITE_ENV: 'staging', VITE_POSTHOG_ENABLED: 'true' })).toBe(false)
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
