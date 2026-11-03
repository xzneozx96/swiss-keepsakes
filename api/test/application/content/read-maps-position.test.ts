import type { MapsLinks, MapsLinkStep } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeReadMapsPosition } from '../../../src/modules/content/application/read-maps-position.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const short = 'https://maps.app.goo.gl/AbCdEf123'
const place = 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3074,17z/data=!3d47.0507!4d8.3068'

// Reading a stored Google Maps link for another module (gate G-S8-PICKUP-MAPS): a full link or a short one, no actor.
function setup(answers: Record<string, MapsLinkStep | undefined> = {}) {
  const clock = createManualClock(new Date('2026-11-03T10:00:00Z'))
  const asked: string[] = []
  const links: MapsLinks = {
    step: async (url) => {
      asked.push(url.href)
      return answers[url.href]
    },
  }
  return { asked, read: makeReadMapsPosition({ links, clock }) }
}

describe('reading the position of a stored Google Maps link', () => {
  it('reads a full link without asking anyone', async () => {
    const s = setup()
    expect(await s.read(place)).toEqual({ latitude: 47.0507, longitude: 8.3068 })
    expect(await s.read('https://www.google.ch/maps?q=47.05,8.31')).toEqual({ latitude: 47.05, longitude: 8.31 })
    expect(s.asked).toEqual([])
  })

  it('follows a short link through Google hosts like the place lookup does', async () => {
    const s = setup({ [short]: { status: 302, location: place } })
    expect(await s.read(short)).toEqual({ latitude: 47.0507, longitude: 8.3068 })
    expect(s.asked).toEqual([short])
  })

  it.each([
    ['plain http', 'http://www.google.com/maps/@47.0,8.0,1z'],
    ['another host', 'https://evil.example/maps/@47.0,8.0,1z'],
    ['a lookalike host', 'https://www.google.com.evil.example/maps/@47.0,8.0,1z'],
    ['a Google page that is not Maps', 'https://www.google.com/search?q=47.0,8.0'],
    ['credentials', 'https://user:pass@www.google.com/maps/@47.0,8.0,1z'],
    ['a port', 'https://www.google.com:8443/maps/@47.0,8.0,1z'],
    ['nonsense', 'not a url'],
  ])('answers undefined for %s, and asks no one', async (_name, text) => {
    const s = setup()
    expect(await s.read(text)).toBeUndefined()
    expect(s.asked).toEqual([])
  })

  it('asks the Google page once when a full link holds no position, and follows its redirect if it sends one', async () => {
    const bare = 'https://www.google.com/maps/place/Lucerne'
    const none = setup({ [bare]: { status: 200, location: null } })
    expect(await none.read(bare)).toBeUndefined()
    expect(none.asked).toEqual([bare])
    expect(await setup({ [bare]: { status: 302, location: place } }).read(bare)).toEqual({ latitude: 47.0507, longitude: 8.3068 })
  })

  it('answers undefined when a short link leaves Google or holds no position', async () => {
    expect(await setup({ [short]: { status: 302, location: 'https://evil.example/maps/@47.0,8.0,1z' } }).read(short)).toBeUndefined()
    expect(await setup({ [short]: { status: 302, location: 'https://www.google.com/maps/place/Lucerne' } }).read(short)).toBeUndefined()
    expect(await setup({}).read(short)).toBeUndefined()
  })
})
