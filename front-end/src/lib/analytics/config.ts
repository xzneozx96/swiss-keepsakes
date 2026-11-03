interface AnalyticsEnv {
  VITE_POSTHOG_KEY?: string
  VITE_POSTHOG_ENABLED?: string
  VITE_SITE_ENV?: string
}

/** The PostHog project key, trimmed; undefined when unset or blank. */
export function posthogKey(env: AnalyticsEnv = import.meta.env): string | undefined {
  return env.VITE_POSTHOG_KEY?.trim() || undefined
}

/**
 * The one sender switch (ADR-032, gate G-S8-CONSENT). Off without a key. Otherwise `VITE_POSTHOG_ENABLED` `true` or `false`
 * wins; any other value is ignored. Without an override it is on for every environment except production (`VITE_SITE_ENV`
 * `production`, compared without case or spaces, so `Production` is also off).
 * Off means the caller never loads or starts PostHog.
 */
export function analyticsEnabled(env: AnalyticsEnv = import.meta.env): boolean {
  if (!posthogKey(env))
    return false

  const override = env.VITE_POSTHOG_ENABLED?.trim().toLowerCase()

  if (override === 'true' || override === 'false')
    return override === 'true'

  return env.VITE_SITE_ENV?.trim().toLowerCase() !== 'production'
}
