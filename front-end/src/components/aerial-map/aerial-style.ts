import type {
  LayerSpecification,
  RasterDEMSourceSpecification,
  StyleSpecification,
} from 'maplibre-gl'

/** Free tiles, no keys: swisstopo SWISSIMAGE photo and AWS Terrarium elevation. */
const PHOTO_TILES
  = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'
const DEM_TILES
  = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const DEM_MAX_ZOOM = 12

export const demSource: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: [DEM_TILES],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: DEM_MAX_ZOOM,
}

const aerialStyle: StyleSpecification = {
  version: 8,
  sources: {
    photo: {
      type: 'raster',
      tiles: [PHOTO_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© swisstopo',
    },
    dem: demSource,
  },
  layers: [{ id: 'photo', type: 'raster', source: 'photo' }],
  sky: {
    'sky-color': '#8fb8e8',
    'horizon-color': '#e8eef5',
    'sky-horizon-blend': 0.6,
  },
}

const LABELS_FROM = 'https://tiles.openfreemap.org/styles/liberty'
const LABEL_LAYERS = /^(?:waterway_line_label|water_name_|highway-name-|label_)/

/**
 * The photo with OpenFreeMap's place, road and water names on top. Only text layers are
 * kept (no shields, arrows or POI icons) and recoloured to read on a photo. If the labels
 * cannot be fetched the photo still works without them.
 */
async function fetchAerialStyle(): Promise<StyleSpecification> {
  const response = await fetch(LABELS_FROM)
  const liberty = (await response.json()) as StyleSpecification
  const labels = liberty.layers
    .filter(layer => LABEL_LAYERS.test(layer.id))
    .map((layer) => {
      const layout = { ...(layer.layout as Record<string, unknown>) }

      delete layout['icon-image']

      return {
        ...layer,
        layout,
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.65)',
          'text-halo-width': 1.5,
        },
      } as LayerSpecification
    })

  return {
    ...aerialStyle,
    glyphs: liberty.glyphs,
    sources: {
      ...aerialStyle.sources,
      openmaptiles: liberty.sources.openmaptiles,
    },
    layers: [...aerialStyle.layers, ...labels],
  }
}

let loaded: Promise<StyleSpecification> | undefined

/**
 * One fetch per page load; a failed fetch is not kept, so the next map tries again. Each map
 * gets its own copy, because MapLibre may keep and change the style it is given.
 */
export function loadAerialStyle(): Promise<StyleSpecification> {
  loaded ??= fetchAerialStyle().catch(() => {
    loaded = undefined

    return aerialStyle
  })

  return loaded.then(style => structuredClone(style))
}

function tileAt(lng: number, lat: number, zoom: number) {
  const n = 2 ** zoom
  const rad = (lat * Math.PI) / 180

  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
    ),
  }
}

// The tiles a pitched view of one stop needs: the ring of photo tiles around it at the view
// zoom and the two below, and the elevation tiles that terrain waits for.
const WARM: [template: string, zoom: number, radius: number][] = [
  [DEM_TILES, DEM_MAX_ZOOM, 1],
  [PHOTO_TILES, 16, 2],
  [PHOTO_TILES, 15, 1],
  [PHOTO_TILES, 14, 1],
]

/**
 * Pulls a stop's tiles into the browser cache before the camera flies there, so the flight
 * lands on a drawn map instead of waiting for tiles. Resolves when they are in, or after
 * `timeout` ms so a slow connection never blocks the flight for long.
 */
export async function warmAerialTiles(
  [lng, lat]: [number, number],
  timeout: number,
) {
  const requests = WARM.flatMap(([template, zoom, radius]) => {
    const { x, y } = tileAt(lng, lat, zoom)
    const urls: string[] = []

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        urls.push(
          template
            .replace('{z}', String(zoom))
            .replace('{x}', String(x + dx))
            .replace('{y}', String(y + dy)),
        )
      }
    }

    return urls.map(url => fetch(url).then(response => response.blob()))
  })

  await Promise.race([
    Promise.allSettled(requests),
    new Promise(resolve => setTimeout(resolve, timeout)),
  ])
}
