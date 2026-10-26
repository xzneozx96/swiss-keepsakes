import type { Order } from '@sk/domain/orders'
import { readdirSync, readFileSync } from 'node:fs'

import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'
import { signInUrl } from '@/features/auth/lib/return-to'
import { orderDetailHref } from '@/features/merchant/orders/hooks/use-merchant-orders'
import { referralUrl } from '@/features/merchant/partners/components/partner-qr-sheet'

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)

    if (entry.isDirectory())
      return entry.name === 'dormant' ? [] : sourceFiles(path)

    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

// A `#/` anywhere in code, or a template that interpolates after a `#`, is a hash-history address. An SVG `href={`#${id}`}` points at an element, not a route.
const HASH_LINK = /#\/|(?<!href=\{`)#\$\{/
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/
const TRAILING_COMMENT = /\s\/\/.*$/

// Until E3.4 moves invitation and Google returns off the hash.
const UNTIL_E3_4 = [
  'features/stores/lib/invitation-token.ts', // until E3.4
  'features/auth/lib/google-return.ts', // until E3.4
]

function hashLinkLines(text: string): number[] {
  return text.split('\n').flatMap((line, n) =>
    !COMMENT_LINE.test(line) && HASH_LINK.test(line.replace(TRAILING_COMMENT, '')) ? [n + 1] : [],
  )
}

describe('[E3.2] in-app links are paths, not hash addresses', () => {
  /* eslint-disable no-template-curly-in-string -- the probes are source text, not templates */
  it('flags each way of writing a hash address, and leaves comments and SVG ids alone', () => {
    expect(hashLinkLines('const a = `${window.location.origin}/#/r/${o}`')).toEqual([1])
    expect(hashLinkLines('const a = \'/#/store\'')).toEqual([1])
    expect(hashLinkLines('const a = `#${\'/x\'}`')).toEqual([1])
    expect(hashLinkLines('// compared on #/lab\n * see #/x\nconst a = 1 // #/x')).toEqual([])
    expect(hashLinkLines('<textPath href={`#${id}`}>')).toEqual([])
  })
  /* eslint-enable no-template-curly-in-string */

  it('no live source builds a `#/` address, except the two files E3.4 replaces', () => {
    const offenders = sourceFiles(SRC)
      .filter(file => !file.endsWith('routeTree.gen.ts'))
      .filter(file => !UNTIL_E3_4.includes(relative(SRC, file)))
      .flatMap(file => hashLinkLines(readFileSync(file, 'utf8')).map(n => `${relative(SRC, file)}:${n}`))

    expect(offenders, 'files that still build `#/` links').toEqual([])
  })

  it('builds absolute path URLs for QR and sign-in addresses', () => {
    expect(referralUrl('ABC')).toBe(`${window.location.origin}/r/ABC`)
    expect(signInUrl('/cart')).toBe(`${window.location.origin}/sign-in?returnTo=%2Fcart`)
  })

  it('links an order row to its detail path', () => {
    expect(orderDetailHref({ id: 'sk-1032' } as Order)).toBe('/store/orders/sk-1032')
  })
})
