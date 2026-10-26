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

// A string or template that starts with `#/`, or an interpolation followed by `#/`, is a hash-history address.
const HASH_LINK = /['"`}]#\//
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/

describe('[E3.2] in-app links are paths, not hash addresses', () => {
  it('no live source builds a `#/` address (the app uses browser history)', () => {
    const offenders = sourceFiles(SRC)
      .filter(file => !file.endsWith('routeTree.gen.ts'))
      .flatMap(file => readFileSync(file, 'utf8').split('\n').map((line, n) => ({ line, n })).filter(({ line }) => !COMMENT_LINE.test(line) && HASH_LINK.test(line)).map(({ n }) => `${relative(SRC, file)}:${n + 1}`))

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
