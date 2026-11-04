import { useInView } from './use-in-view'

/** How far below or above the viewport an element counts as near (px). */
const NEAR_MARGIN = 600

/** True once the element behind the returned ref is within about 600 px of the viewport, and it stays true. For parts that load heavy code only when the guest is about to reach them. */
export function useNearViewport<T extends Element>() {
  return useInView<T>(0, `${NEAR_MARGIN}px`)
}
