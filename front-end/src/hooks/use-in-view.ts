import { useEffect, useRef, useState } from 'react'

/**
 * True once the element behind the returned ref has scrolled into view, and it stays true.
 * Use it to start an entrance animation when the guest reaches a section, not on page load.
 */
export function useInView<T extends Element>(threshold = 0.3) {
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
      { threshold },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [seen, threshold])

  return [ref, seen] as const
}
