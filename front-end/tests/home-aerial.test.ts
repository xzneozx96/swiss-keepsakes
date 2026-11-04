import { describe, expect, it } from 'vitest'
import { aerialView } from '@/features/home/lib/aerial'
import { photoUrl } from '@/lib/photos'

describe('[E4.13][AC95] the map invitation aerial', () => {
  const view = aerialView()

  it('covers the whole 3:2 frame with swisstopo tiles', () => {
    const left = Math.min(...view.tiles.map(tile => tile.left))
    const top = Math.min(...view.tiles.map(tile => tile.top))
    const right = Math.max(...view.tiles.map(tile => tile.left + tile.width))
    const bottom = Math.max(...view.tiles.map(tile => tile.top + tile.height))

    expect(left).toBeLessThanOrEqual(0)
    expect(top).toBeLessThanOrEqual(0)
    expect(right).toBeGreaterThanOrEqual(100)
    expect(bottom).toBeGreaterThanOrEqual(100)
    expect(view.tiles.every(tile => tile.src.startsWith('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/'))).toBe(true)
  })

  it('places every curated photo inside the frame, with a file that exists in the photo library', () => {
    expect(view.spots.length).toBeGreaterThanOrEqual(4)
    for (const spot of view.spots) {
      expect(spot.left, spot.photo).toBeGreaterThan(6)
      expect(spot.left, spot.photo).toBeLessThan(94)
      expect(spot.top, spot.photo).toBeGreaterThan(8)
      expect(spot.top, spot.photo).toBeLessThan(88)
      expect(photoUrl(spot.photo), spot.photo).toBeTruthy()
    }
  })
})
