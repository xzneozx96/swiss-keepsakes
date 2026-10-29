import type { StyleSpecification } from 'maplibre-gl'

import { loadAerialStyle } from './aerial-style'

/**
 * The aerial photo with OpenFreeMap names, without the 3D parts: no elevation source, no sky
 * (decision G11, ADR-006). Each call returns its own copy, so a map may change it.
 */
export async function loadFlatAerialStyle(): Promise<StyleSpecification> {
  const style = await loadAerialStyle()

  delete style.sources.dem
  delete style.sky

  return style
}
