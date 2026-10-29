export type LngLat = [lng: number, lat: number]

/** Pins this close on screen (px) merge into one cluster. The selected pin never does. */
const CLUSTER_RADIUS = 34

export function boundsOf(points: readonly LngLat[]): [LngLat, LngLat] {
  const lngs = points.map(point => point[0])
  const lats = points.map(point => point[1])

  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

interface Located {
  id: string
  coordinates: LngLat
}

/**
 * Greedy screen-space clustering in rank order, so a cluster is led by its best-ranked pin.
 * `project` turns a coordinate into screen pixels. `groups` maps a leader's id to its members,
 * and `taken` holds every id that sits inside a cluster, leaders included.
 */
export function clusterPins<T extends Located>(
  project: (point: LngLat) => { x: number, y: number },
  pins: readonly T[],
  selectedId: string | undefined,
) {
  const points = pins.map(pin => ({ pin, at: project(pin.coordinates) }))
  const taken = new Set<string>()
  const groups = new Map<string, T[]>()

  for (const { pin, at } of points) {
    if (taken.has(pin.id) || pin.id === selectedId)
      continue
    const members = points.filter(other =>
      other.pin.id !== selectedId
      && !taken.has(other.pin.id)
      && Math.hypot(other.at.x - at.x, other.at.y - at.y) < CLUSTER_RADIUS,
    )

    if (members.length > 1) {
      members.forEach(member => taken.add(member.pin.id))
      groups.set(pin.id, members.map(member => member.pin))
    }
  }

  return { groups, taken }
}
