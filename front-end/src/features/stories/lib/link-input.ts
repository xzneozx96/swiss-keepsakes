import { isSafeLinkHref } from '@sk/domain/content'

import { LINK_HREF_MAX } from './body'

const MAILTO = /^mailto:/i

/**
 * The address to link, or nothing when the server would refuse it: a real `new URL()` parse and https, http or mailto
 * (`isSafeLinkHref`), at most 2000 characters, and a mailto that names an address.
 */
export function linkHref(input: string): string | undefined {
  const href = input.trim()

  if (href.length > LINK_HREF_MAX || !isSafeLinkHref(href))
    return undefined
  if (MAILTO.test(href) && href.slice('mailto:'.length).split('?')[0]!.trim() === '')
    return undefined

  return href
}
