import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

/**
 * A text input that mirrors a URL search param. Typing stays instant on local state, the heavy
 * results read a deferred copy, and the URL follows after a short pause inside a transition, so
 * a keystroke never waits on the router. A change to the URL from outside (back button, a
 * link) replaces the text.
 */
export function useUrlInput(
  urlValue: string,
  commit: (value: string) => void,
  delay = 250,
) {
  const [value, setValue] = useState(urlValue);
  const deferred = useDeferredValue(value);
  const sent = useRef(urlValue);
  const send = useEffectEvent((next: string) => {
    sent.current = next;
    startTransition(() => commit(next));
  });

  useEffect(() => {
    if (urlValue === sent.current) return;
    sent.current = urlValue;
    setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (value === sent.current) return;
    const timer = window.setTimeout(() => send(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return { value, setValue, deferred };
}
