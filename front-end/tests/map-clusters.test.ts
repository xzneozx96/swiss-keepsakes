import { describe, expect, it } from 'vitest'

import { boundsOf, clusterPins } from '@/features/map/lib/clusters'

// One degree is 1000 px here, so pins closer than 0.034 degrees merge.
const project = ([lng, lat]: [number, number]) => ({ x: lng * 1000, y: lat * 1000 })
const pin = (id: string, lng: number, lat: number) => ({ id, coordinates: [lng, lat] as [number, number] })

describe('[E4.6][AC93] pin clusters', () => {
  const pins = [pin('a', 8.3, 47), pin('b', 8.31, 47), pin('c', 8.5, 47), pin('d', 8.505, 47)]

  it('merges pins that are close on screen, led by the best ranked one', () => {
    const { groups, taken } = clusterPins(project, pins, undefined)

    expect([...groups.keys()]).toEqual(['a', 'c'])
    expect(groups.get('a')?.map(member => member.id)).toEqual(['a', 'b'])
    expect(groups.get('c')?.map(member => member.id)).toEqual(['c', 'd'])
    expect([...taken].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('leaves a lone pin alone', () => {
    const { groups, taken } = clusterPins(project, [pin('a', 8.3, 47), pin('c', 8.5, 47)], undefined)

    expect(groups.size).toBe(0)
    expect(taken.size).toBe(0)
  })

  it('never merges the selected pin', () => {
    const { groups, taken } = clusterPins(project, pins, 'b')

    expect(taken.has('b')).toBe(false)
    expect(taken.has('a')).toBe(false)
    expect([...groups.keys()]).toEqual(['c'])
  })

  it('finds the box around a set of points', () => {
    expect(boundsOf([[8.3, 47.1], [8.5, 47.0]])).toEqual([[8.3, 47.0], [8.5, 47.1]])
  })
})
