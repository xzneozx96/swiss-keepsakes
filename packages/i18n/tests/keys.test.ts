import { describe, expect, it } from 'vitest'

import { mailDe } from '../src/de'
import { mailEn } from '../src/en'
import { keyDrift } from '../src/key-drift'
import { deExtraKey, deMissingKey, en } from './fixtures'

describe('[E1.12][S11] EN and DE have the same keys', () => {
  it('names a key that EN has and DE lacks', () => {
    expect(keyDrift(en, deMissingKey)).toEqual({ onlyEn: ['mail.N01.expiry'], onlyDe: [] })
  })

  it('names a key that DE has and EN lacks', () => {
    expect(keyDrift(en, deExtraKey)).toEqual({ onlyEn: [], onlyDe: ['mail.N01.footer'] })
  })

  it('finds no drift in the shared mail copy', () => {
    expect(keyDrift(mailEn, mailDe)).toEqual({ onlyEn: [], onlyDe: [] })
  })
})
