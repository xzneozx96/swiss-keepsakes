import type { DeviceClass, ReferrerClass } from './closed-values'

const SEARCH_ENGINE = /(?:^|\.)(?:google|bing|duckduckgo|ecosia|yahoo|qwant|startpage|baidu|yandex)\.(?:[a-z]{2,3}\.)?[a-z]{2,}$/
const SOCIAL_HOSTS = ['instagram.com', 'facebook.com', 'fb.com', 'x.com', 'twitter.com', 't.co', 'linkedin.com', 'lnkd.in', 'tiktok.com', 'youtube.com', 'youtu.be', 'pinterest.com', 'pin.it', 'reddit.com', 'whatsapp.com', 'wa.me']
const WWW = /^www\./
const PARTNER_TAG = 'partner'

function bareHost(host: string): string {
  return host.toLowerCase().replace(WWW, '')
}

function isPartnerTagged(search: string | undefined): boolean {
  if (!search)
    return false

  const params = new URLSearchParams(search)

  return [params.get('utm_medium'), params.get('utm_source')].some(value => value?.trim().toLowerCase() === PARTNER_TAG)
}

/**
 * The class of where a visit came from, from the referrer and the query string only (no URL or host leaves the browser).
 * A `utm_medium=partner` or `utm_source=partner` tag wins over the referrer. No referrer, the site itself, or a referrer that
 * does not parse as a URL counts as `direct`.
 */
export function referrerClassOf({ referrer, search, siteHost }: { referrer?: string | null, search?: string, siteHost?: string }): ReferrerClass {
  if (isPartnerTagged(search))
    return 'partner'

  if (!referrer)
    return 'direct'

  let host: string

  try {
    host = bareHost(new URL(referrer).hostname)
  }
  catch {
    return 'direct'
  }

  if (!host || (siteHost && host === bareHost(siteHost)))
    return 'direct'
  if (SEARCH_ENGINE.test(host))
    return 'search'
  if (SOCIAL_HOSTS.some(social => host === social || host.endsWith(`.${social}`)))
    return 'social'

  return 'other'
}

const PHONE_BELOW = 640
const TABLET_BELOW = 1024

/**
 * The device class from the viewport width: phone under 640 px, tablet under 1024 px, desktop from there, `other` when the width
 * is not a positive finite number. Width alone decides (there is no touch input), so a class is never sharpened into a fingerprint.
 */
export function deviceClassOf({ width }: { width: number }): DeviceClass {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0)
    return 'other'
  if (width < PHONE_BELOW)
    return 'phone'

  return width < TABLET_BELOW ? 'tablet' : 'desktop'
}
