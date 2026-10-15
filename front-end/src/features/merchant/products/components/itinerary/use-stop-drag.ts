import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { reducedMotion } from "./map-shared";

const THRESHOLD = 4;
const EDGE = 72;
const SCROLL_STEP = 14;

type Drag = {
  pointerId: number;
  from: number;
  to: number;
  startY: number;
  y: number;
  active: boolean;
  tops: number[];
  heights: number[];
  gap: number;
};

/**
 * Reorder the stops by dragging a card's handle: pointer events (mouse, touch and pen alike),
 * so the handle can own its touch (`touch-action: none`) while the rest of the card still
 * scrolls the page. Cards move by transform while dragging (no React renders per move), a
 * placeholder marks the slot the card lands in, and `onDrop(from, to)` commits the new order.
 * `onStart` runs once the pointer has moved (a tap on the handle does nothing), before the
 * cards are measured, so an open card can fold first.
 */
export function useStopDrag({
  listRef,
  placeholderRef,
  onStart,
  onDrop,
}: {
  listRef: RefObject<HTMLOListElement | null>;
  placeholderRef: RefObject<HTMLDivElement | null>;
  onStart: (index: number) => void;
  onDrop: (from: number, to: number) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const callbacks = useRef({ onStart, onDrop });

  callbacks.current = { onStart, onDrop };

  const items = () =>
    Array.from(listRef.current?.children ?? []) as HTMLElement[];

  const finish = useCallback((commit: boolean) => {
    const current = drag.current;

    drag.current = null;
    cancelAnimationFrame(frame.current);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    for (const item of items()) {
      item.style.transform = "";
      item.style.transition = "";
      item.style.zIndex = "";
      item.removeAttribute("data-lifted");
    }
    if (placeholderRef.current) placeholderRef.current.hidden = true;
    if (current?.active && commit && current.to !== current.from)
      callbacks.current.onDrop(current.from, current.to);
  }, []);

  useEffect(() => () => finish(false), [finish]);

  const layout = () => {
    const current = drag.current;
    const nodes = items();

    if (!current?.active || !nodes.length) return;
    const { from, tops, heights, gap } = current;
    const lift = heights[from] + gap;
    const dy = current.y + window.scrollY - current.startY;
    const center = tops[from] + heights[from] / 2 + dy;
    let to = from;

    // Where the dragged card's middle sits among the others' middles decides the slot.
    for (let i = 0; i < nodes.length; i++) {
      if (i === from) continue;
      const middle = tops[i] + heights[i] / 2;

      if (i < from && center < middle) to = Math.min(to, i);
      if (i > from && center > middle) to = Math.max(to, i);
    }
    current.to = to;
    nodes.forEach((node, i) => {
      node.style.transition = reducedMotion() ? "" : "transform 150ms ease-out";
      if (i === from) {
        node.style.transition = "";
        node.style.transform = `translateY(${dy}px)`;

        return;
      }
      const shift =
        to > from && i > from && i <= to
          ? -lift
          : to < from && i >= to && i < from
            ? lift
            : 0;

      node.style.transform = shift ? `translateY(${shift}px)` : "";
    });
    const slot =
      to < from
        ? tops[to]
        : to > from
          ? tops[to] + heights[to] - heights[from]
          : tops[from];
    const placeholder = placeholderRef.current;

    if (placeholder) {
      placeholder.hidden = false;
      placeholder.style.top = `${slot}px`;
      placeholder.style.height = `${heights[from]}px`;
    }
  };

  // Near the top or bottom of the screen the page scrolls and the card follows.
  const autoScroll = () => {
    const current = drag.current;

    if (!current?.active) return;
    const before = window.scrollY;

    if (current.y < EDGE) window.scrollBy(0, -SCROLL_STEP);
    else if (current.y > window.innerHeight - EDGE)
      window.scrollBy(0, SCROLL_STEP);
    if (window.scrollY !== before) layout();
    frame.current = requestAnimationFrame(autoScroll);
  };

  const measure = (current: Drag) => {
    const nodes = items();

    current.tops = nodes.map((n) => n.offsetTop);
    current.heights = nodes.map((n) => n.offsetHeight);
    current.gap =
      nodes.length > 1
        ? current.tops[1] - current.tops[0] - current.heights[0]
        : 0;
  };

  const press = (index: number) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      from: index,
      to: index,
      startY: event.clientY + window.scrollY,
      y: event.clientY,
      active: false,
      tops: [],
      heights: [],
      gap: 0,
    };
  };

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;

    if (!current || current.pointerId !== event.pointerId) return;
    current.y = event.clientY;
    if (!current.active) {
      if (Math.abs(event.clientY + window.scrollY - current.startY) < THRESHOLD)
        return;
      current.active = true;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      // The open card folds first (rendered now, so it is measured folded), and the drag is
      // measured from where the pointer is.
      flushSync(() => callbacks.current.onStart(current.from));
      measure(current);
      current.startY = current.y + window.scrollY;
      const node = items()[current.from];

      node?.setAttribute("data-lifted", "");
      if (node) node.style.zIndex = "20";
      layout();
      frame.current = requestAnimationFrame(autoScroll);

      return;
    }
    if (current.tops.length) layout();
  };

  const release = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    finish(event.type === "pointerup");
  };

  const cancel = () => finish(false);

  const handleProps = (index: number) => ({
    onPointerDown: press(index),
    onPointerMove: move,
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: cancel,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    },
  });

  return { handleProps };
}
