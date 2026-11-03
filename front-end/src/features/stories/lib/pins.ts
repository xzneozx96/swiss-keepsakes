import type { PinListItem } from '@sk/api-contract'
import type { StoryLanguage } from './search-params'

import { thumbOf } from '@/features/media/lib/rules'

export interface PinOption {
  id: string
  name: string
  status: 'published' | 'draft' | 'hidden'
  website: string | null
  photo: string | null
}

type RowLineKey = 'storyMedia.pin.onMap' | 'storyMedia.pin.draft' | 'storyMedia.pin.hidden'

const WWW = /^www\./
const TRAILING_SLASH = /\/$/
const SCHEME = /^https?:\/\//

/** A list row as a choice. An ended pin is published: its dates are over, its page is live. */
export function pinOptionOf(item: PinListItem, language: StoryLanguage, untitled: string): PinOption {
  const other = language === 'en' ? 'de' : 'en'

  return {
    id: item.id,
    name: item.title[language] || item.title[other] || untitled,
    status: item.status === 'ended' ? 'published' : item.status,
    website: item.outboundUrl,
    photo: item.cover ? thumbOf(item.cover, 160) : null,
  }
}

/** The host of an http or https address, lower case and without a leading `www.`. Empty for anything else. */
export function hostOf(href: string): string {
  try {
    const url = new URL(href)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname.toLowerCase().replace(WWW, '') : ''
  }
  catch {
    return ''
  }
}

/** `zyt.example/tower`: no scheme, no trailing slash. */
export function websiteLabel(url: string): string {
  return url.replace(SCHEME, '').replace(TRAILING_SLASH, '')
}

export function pinRowLine(t: (key: RowLineKey) => string, pin: PinOption): string {
  if (pin.status === 'draft')
    return t('storyMedia.pin.draft')
  if (pin.status === 'hidden')
    return t('storyMedia.pin.hidden')

  return pin.website ? websiteLabel(pin.website) : t('storyMedia.pin.onMap')
}

/** The published pin whose website is on the same host as `href`. A draft or hidden pin shows as plain text to guests, so it never matches. */
export function pinForHost(pins: PinOption[], href: string): PinOption | undefined {
  const host = hostOf(href)

  return host === '' ? undefined : pins.find(pin => pin.status === 'published' && pin.website !== null && hostOf(pin.website) === host)
}
