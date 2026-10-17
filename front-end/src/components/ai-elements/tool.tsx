import type { ReactNode } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

import {
  ChevronDownIcon,
  ClockIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from "@/components/icons";

export type ToolState =
  "input-streaming" | "input-available" | "output-available" | "output-error";

const STATUS: Record<ToolState, { label: string; icon: ReactNode }> = {
  "input-streaming": {
    label: "Pending",
    icon: <ClockIcon aria-hidden size={14} />,
  },
  "input-available": {
    label: "Running",
    icon: <ClockIcon aria-hidden className="animate-pulse" size={14} />,
  },
  "output-available": {
    label: "Completed",
    icon: <StatusSuccessIcon aria-hidden className="text-success" size={14} />,
  },
  "output-error": {
    label: "Error",
    icon: <StatusDangerIcon aria-hidden className="text-danger" size={14} />,
  },
};

/** A tool call: name and status in the header, input and result when expanded. */
export function Tool({
  title,
  state,
  input,
  output,
  children,
}: {
  title: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  children?: ReactNode;
}) {
  const status = STATUS[state];

  return (
    <Collapsible className="not-prose ms-10 w-[calc(100%-2.5rem)] overflow-hidden rounded-2xl border border-separator bg-surface">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-start outline-none focus-visible:focus-ring">
        <span className="flex-1 truncate text-xs font-medium">{title}</span>
        <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
          {status.icon}
          {status.label}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="shrink-0 text-muted transition-transform group-aria-expanded:rotate-180"
          size={16}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t border-separator p-3">
          {children}
          {input !== undefined && <Json label="Parameters" value={input} />}
          {output !== undefined && <Json label="Result" value={output} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </h4>
      <pre className="max-h-56 overflow-auto rounded-lg bg-surface-secondary p-2 text-[11px] leading-snug">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
