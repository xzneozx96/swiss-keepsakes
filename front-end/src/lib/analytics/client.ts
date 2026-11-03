import type { PostHogConfig } from 'posthog-js'
import { allowListBeforeSend } from './allow-list'
import { posthogKey } from './config'

type PostHog = (typeof import('posthog-js'))['default']

/**
 * The PostHog configuration of ADR-032: EU host, nothing kept on the device (memory), no person profiles, and every feature that
 * loads a script, sends an extra request or watches the page switched off. `before_send` is the allow-list, the only guard on what leaves.
 */
export function posthogConfig(): Partial<PostHogConfig> {
  return {
    api_host: 'https://eu.i.posthog.com',
    persistence: 'memory',
    person_profiles: 'never',
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    capture_pageview: false,
    capture_pageleave: false,
    before_send: allowListBeforeSend,
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
  }
}

let started: Promise<PostHog | undefined> | undefined

/**
 * Loads and starts PostHog once, in the browser only (never on the server, never at module load). Resolves to undefined when
 * there is no window or key, or when the import or init failed: a failure is remembered and never retried, and never thrown.
 */
export function startAnalytics(): Promise<PostHog | undefined> {
  if (typeof window === 'undefined')
    return Promise.resolve(undefined)

  const key = posthogKey()

  if (!key)
    return Promise.resolve(undefined)

  started ??= import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, posthogConfig())

      return posthog
    })
    .catch(() => undefined)

  return started
}
