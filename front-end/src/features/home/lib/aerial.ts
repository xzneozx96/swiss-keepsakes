/**
 * The static aerial of "First time in Lucerne?": swisstopo SWISSIMAGE tiles, the same imagery as the guest map, cut to a fixed
 * 3:2 window over the old town, with a few curated photos where those places are. A picture, not a live map (home-design.md §1):
 * every position is a percentage of the frame, so it scales with the width.
 */
const TILE_URL = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857'
const ZOOM = 15
const TILE = 256
const WORLD = TILE * 2 ** ZOOM
/** The window in zoom-15 pixels: 3:2, about 1.6 km by 1.1 km. */
const WIDTH = 720
const HEIGHT = 480
const CENTRE: LngLat = [8.3076, 47.055]

type LngLat = [lng: number, lat: number]

/** Curated photos of places inside the window (library files, `src/assets/photos`). Where they sit is approximate and drawn, not read from a pin. */
const SPOTS: { photo: string, at: LngLat }[] = [
  { photo: 'lucerne-water-tower', at: [8.3074, 47.0517] },
  { photo: 'jesuit-church', at: [8.3058, 47.0531] },
  { photo: 'hofkirche', at: [8.3118, 47.0536] },
  { photo: 'zytturm', at: [8.3012, 47.0546] },
  { photo: 'lion-monument', at: [8.3112, 47.0583] },
]

function toWorld([lng, lat]: LngLat) {
  const sin = Math.sin(lat * Math.PI / 180)

  return { x: (lng + 180) / 360 * WORLD, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD }
}

export interface AerialView {
  tiles: { key: string, src: string, left: number, top: number, width: number, height: number }[]
  spots: { photo: string, left: number, top: number }[]
}

export function aerialView(): AerialView {
  const centre = toWorld(CENTRE)
  const left = centre.x - WIDTH / 2
  const top = centre.y - HEIGHT / 2
  const tiles: AerialView['tiles'] = []

  for (let x = Math.floor(left / TILE); x <= Math.floor((left + WIDTH) / TILE); x++) {
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + HEIGHT) / TILE); y++) {
      tiles.push({
        key: `${x}-${y}`,
        src: `${TILE_URL}/${ZOOM}/${x}/${y}.jpeg`,
        left: (x * TILE - left) / WIDTH * 100,
        top: (y * TILE - top) / HEIGHT * 100,
        width: TILE / WIDTH * 100,
        height: TILE / HEIGHT * 100,
      })
    }
  }

  const spots = SPOTS.map(({ photo, at }) => {
    const point = toWorld(at)

    return { photo, left: (point.x - left) / WIDTH * 100, top: (point.y - top) / HEIGHT * 100 }
  })

  return { tiles, spots }
}
