import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

import { ChevronDownIcon, SparkleIcon } from "@/components/icons";

/**
 * The model's thinking, as in the Vercel AI Elements Reasoning / chain-of-thought panel:
 * open and shimmering while it streams, then a one-line "Thought for N seconds" that
 * can be expanded.
 */
export function Reasoning({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState(isStreaming);
  const startedAt = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);

      return;
    }
    setSeconds(
      Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
    );
    const timer = window.setTimeout(() => setOpen(false), 500);

    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  return (
    <Collapsible
      className="not-prose ms-10 w-[calc(100%-2.5rem)] overflow-hidden rounded-2xl border border-separator bg-surface-secondary/60"
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-start text-sm text-muted outline-none focus-visible:focus-ring">
        <SparkleIcon
          aria-hidden
          className={clsx(
            "shrink-0",
            isStreaming && "animate-pulse text-accent",
          )}
          size={16}
        />
        <span
          className={clsx("flex-1 font-medium", isStreaming && "text-shimmer")}
        >
          {isStreaming
            ? "Thinking…"
            : `Thought for ${seconds} second${seconds === 1 ? "" : "s"}`}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="shrink-0 transition-transform group-aria-expanded:rotate-180"
          size={16}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="border-t border-separator px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-muted">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
