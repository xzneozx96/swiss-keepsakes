interface AnalyticsEnv {
  VITE_POSTHOG_KEY?: string
  VITE_POSTHOG_ENABLED?: string
  VITE_SITE_ENV?: string
}

/** The PostHog project key, trimmed; undefined when unset or blank. */
export function posthogKey(env: AnalyticsEnv = import.meta.env): string | undefined {
  return env.VITE_POSTHOG_KEY?.trim() || undefined
}

/** The only environments that may send. A missing or any other `VITE_SITE_ENV` counts as production. */
const SENDING_ENVIRONMENTS: readonly string[] = ['development', 'staging']

/**
 * The one sender switch (ADR-032, gate G-S8-CONSENT), fail closed. It sends only when all three hold: a key is set,
 * `VITE_POSTHOG_ENABLED` is exactly `true` (compared without case or spaces), and `VITE_SITE_ENV` is `development` or `staging`.
 * A missing, empty, `production` or unknown `VITE_SITE_ENV` counts as production and sends nothing, whatever the other two say.
 * Off means the caller never loads or starts PostHog.
 */
export function analyticsEnabled(env: AnalyticsEnv = import.meta.env): boolean {
  if (!posthogKey(env))
    return false
  if (env.VITE_POSTHOG_ENABLED?.trim().toLowerCase() !== 'true')
    return false

  return SENDING_ENVIRONMENTS.includes(env.VITE_SITE_ENV?.trim().toLowerCase() ?? '')
}
