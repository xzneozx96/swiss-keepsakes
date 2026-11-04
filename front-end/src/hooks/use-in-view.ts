import { useEffect, useRef, useState } from 'react'

/**
 * True once the element behind the returned ref has scrolled into view, and it stays true.
 * Use it to start an entrance animation when the guest reaches a section, not on page load.
 * `rootMargin` widens the viewport the element is measured against (`'600px'` is true from 600 px away).
 */
export function useInView<T extends Element>(threshold = 0.3, rootMargin?: string) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current

    if (!el || seen)
      return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setSeen(true)
      },
      { threshold, rootMargin },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [seen, threshold, rootMargin])

  return [ref, seen] as const
}
