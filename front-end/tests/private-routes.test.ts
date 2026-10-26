import { describe, expect, it } from 'vitest'

import { noIndexHead } from '@/lib/no-index'
import { isPrivatePath, PRIVATE_PREFIXES, privateHeaders } from '@/lib/private-routes'

describe('private routes', () => {
  it('lists the ten private prefixes', () => {
    expect(PRIVATE_PREFIXES).toEqual(['/store', '/admin', '/partner', '/lab', '/account', '/cart', '/plan', '/sign-in', '/invitation', '/r'])
  })

  it.each(PRIVATE_PREFIXES)('treats %s and its sub-paths as private', (prefix) => {
    expect(isPrivatePath(prefix)).toBe(true)
    expect(isPrivatePath(`${prefix}/x`)).toBe(true)
    expect(isPrivatePath(`${prefix}/x/y`)).toBe(true)
    expect(privateHeaders(prefix)['X-Robots-Tag']).toBe('noindex')
  })

  it.each(['/partner/abc/def', '/store/orders'])('treats %s as private', (path) => {
    expect(isPrivatePath(path)).toBe(true)
  })

  it.each(['/stories', '/store-x', '/gifts', '/', '/rx', '/labs'])('treats %s as public', (path) => {
    expect(isPrivatePath(path)).toBe(false)
    expect(privateHeaders(path)).toEqual({})
  })

  it('sends no-referrer for the partner area only', () => {
    expect(privateHeaders('/partner')).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
    expect(privateHeaders('/partner/abc')).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
    expect(privateHeaders('/store')).toEqual({ 'X-Robots-Tag': 'noindex' })
  })

  it.each(['/Partner/abc', '/PARTNER', '/PARTNER/some-token/x', '/pArTnEr/abc', '/%50artner/x', '/%70artner/x', '/partner%2Fabc'])('sends the partner headers for %s', (path) => {
    expect(privateHeaders(path)).toEqual({ 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' })
  })

  it.each(['/Store/orders', '/STORE', '/ADMIN', '/Lab', '/%53tore', '/R/abc', '/Sign-In'])('sends noindex for the case variant %s', (path) => {
    expect(isPrivatePath(path)).toBe(true)
    expect(privateHeaders(path)).toEqual({ 'X-Robots-Tag': 'noindex' })
  })

  it.each(['/Stories', '/STORE-X', '/%', '/%E0%A4%A', '/Labs'])('keeps %s public and does not throw on a bad escape', (path) => {
    expect(privateHeaders(path)).toEqual({})
  })

  it('adds a robots noindex meta', () => {
    expect(noIndexHead()).toEqual({ meta: [{ name: 'robots', content: 'noindex' }] })
  })
})
