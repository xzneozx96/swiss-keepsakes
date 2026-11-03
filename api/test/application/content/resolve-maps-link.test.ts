import type { Actor } from '@sk/domain/identity'
import type { MapsLinks, MapsLinkStep } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeResolveMapsLink } from '../../../src/modules/content/application/resolve-maps-link.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const short = 'https://maps.app.goo.gl/AbCdEf123'
const place = 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3074,17z/data=!3d47.0507!4d8.3068'

const redirect = (location: string): MapsLinkStep => ({ status: 302, location })

// A web of answers by URL. Every URL asked is recorded, with the time left it was given.
function setup(answers: Record<string, MapsLinkStep | undefined>, options: { advance?: number, timeoutMs?: number } = {}) {
  const clock = createManualClock(new Date('2026-10-30T10:00:00Z'))
  const asked: { url: string, timeoutMs: number }[] = []
  const links: MapsLinks = {
    step: async (url, timeoutMs) => {
      asked.push({ url: url.href, timeoutMs })
      clock.advance(options.advance ?? 0)
      return answers[url.href]
    },
  }
  return { asked, resolve: makeResolveMapsLink({ links, clock, ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }) }) }
}

describe('resolving a Google Maps short link', () => {
  it('follows the short link to a Google address and reads the position without asking the final page', async () => {
    const s = setup({ [short]: redirect(place) })
    expect(await s.resolve(owner, store, short)).toEqual({ ok: true, value: { latitude: 47.0507, longitude: 8.3068 } })
    expect(s.asked.map(a => a.url)).toEqual([short])
  })

  it('follows several hops through Google hosts, a relative Location included', async () => {
    const s = setup({
      'https://goo.gl/maps/abc': redirect('https://maps.app.goo.gl/abc'),
      'https://maps.app.goo.gl/abc': redirect('/xyz'),
      'https://maps.app.goo.gl/xyz': redirect('https://www.google.ch/maps?q=47.05,8.31'),
    })
    expect(await s.resolve(owner, store, 'https://goo.gl/maps/abc')).toEqual({ ok: true, value: { latitude: 47.05, longitude: 8.31 } })
  })

  it('refuses a hop to a host that is not Google\'s, at the first hop and at a later one, and never asks it', async () => {
    const first = setup({ [short]: redirect('https://evil.example/maps/@47.0,8.0,1z') })
    expect(await first.resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(first.asked.map(a => a.url)).toEqual([short])

    const later = setup({
      [short]: redirect('https://www.google.com/maps/hop1'),
      'https://www.google.com/maps/hop1': redirect('https://169.254.169.254/latest/meta-data'),
    })
    expect(await later.resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(later.asked.map(a => a.url)).toEqual([short, 'https://www.google.com/maps/hop1'])
  })

  it.each([
    ['plain http', 'http://www.google.com/maps/hop'],
    ['credentials', 'https://user:pass@www.google.com/maps/hop'],
    ['a port', 'https://www.google.com:8443/maps/hop'],
    ['another scheme', 'ftp://www.google.com/maps/hop'],
  ])('refuses a hop with %s', async (_name, location) => {
    const s = setup({ [short]: redirect(location) })
    expect(await s.resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(s.asked).toHaveLength(1)
  })

  it('follows at most 5 redirects: the 5th target is read, a 6th redirect is not followed', async () => {
    const hops = Array.from({ length: 7 }, (_, i) => `https://www.google.com/maps/hop${i}`)
    const chain = { [short]: redirect(hops[0]!), ...Object.fromEntries(hops.map((url, i) => [url, redirect(hops[i + 1] ?? 'https://www.google.com/end')])) }
    const tooMany = setup(chain)
    expect(await tooMany.resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(tooMany.asked).toHaveLength(5)

    const five = setup({ ...chain, [hops[3]!]: redirect(place) })
    expect(await five.resolve(owner, store, short)).toMatchObject({ ok: true })
  })

  it('answers unreadable when the final page holds no position, answers with an error, or the request fails', async () => {
    expect(await setup({ [short]: redirect('https://www.google.com/maps/place/Lucerne') }).resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(await setup({ [short]: { status: 404, location: null } }).resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(await setup({ [short]: { status: 302, location: null } }).resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(await setup({}).resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
  })

  it('gives each hop only the time that is left of one deadline, and stops when it is spent', async () => {
    const hops = ['https://www.google.com/maps/hop1', 'https://www.google.com/maps/hop2']
    const s = setup({ [short]: redirect(hops[0]!), [hops[0]!]: redirect(hops[1]!), [hops[1]!]: redirect(place) }, { advance: 1500, timeoutMs: 3000 })
    expect(await s.resolve(owner, store, short)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(s.asked.map(a => a.timeoutMs)).toEqual([3000, 1500])
  })

  it.each([
    ['plain http', 'http://maps.app.goo.gl/abc'],
    ['another host', 'https://www.google.com/maps/@47.0,8.0,1z'],
    ['nonsense', 'not a url'],
  ])('refuses a pasted link that is %s without asking anyone', async (_name, text) => {
    const s = setup({})
    expect(await s.resolve(owner, store, text)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(s.asked).toEqual([])
  })

  it('is forbidden for a member of another store and for anyone not signed in as staff, and asks no one', async () => {
    const s = setup({ [short]: redirect(place) })
    expect(await s.resolve(elsewhere, store, short)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.resolve({ kind: 'anonymous' }, store, short)).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.asked).toEqual([])
  })
})
