import { useEffect, useRef } from "react";

/**
 * A ref that always holds the latest value, for callbacks that outlive a render: map events,
 * drag listeners. It is updated after the render commits, never during it.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}
