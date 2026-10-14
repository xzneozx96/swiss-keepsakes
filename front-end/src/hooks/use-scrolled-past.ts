import { useEffect, useRef, useState } from "react";

/**
 * True once the element behind the returned ref has scrolled out above the viewport.
 * Put the ref on a 1px marker at the bottom of a screen's banner to drive the
 * collapsing header.
 */
export function useScrolledPast<T extends Element>() {
  const ref = useRef<T>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return [ref, past] as const;
}
