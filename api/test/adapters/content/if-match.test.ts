import { describe, expect, it } from 'vitest'
import { parseIfMatch } from '../../../src/modules/content/adapters/if-match.ts'

describe('parseIfMatch', () => {
  it('[E2.6] a missing header is missing', () => {
    expect(parseIfMatch(undefined)).toEqual({ kind: 'missing' })
  })

  it.each(['3', '"3"', 'W/"3"'])('[E2.6] %s is version 3', (header) => {
    expect(parseIfMatch(header)).toEqual({ kind: 'version', version: 3 })
  })

  it.each(['*', 'abc', '0', '1.5', '', '-2', '"3', '3 3', 'W/3'])('[E2.6] %j is invalid', (header) => {
    expect(parseIfMatch(header)).toEqual({ kind: 'invalid' })
  })
})
