import type { PickerFormat } from "./model";

/** A pill as the Morning / Afternoon switch draws it: 44px, fully rounded, dark ink when chosen. */
export function pillClass(active: boolean, muted = false) {
  return `flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:focus-ring ${
    active
      ? "bg-foreground text-background"
      : `bg-default hover:bg-default-hover ${muted ? "text-muted" : "text-foreground"}`
  }`;
}

/** Visually hidden, polite: what the last tap did. */
export function LiveRegion({ text }: { text: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}

/** Dot, amber dot and struck-through number: the key for the month grid. */
export function Legend({ f }: { f: PickerFormat }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-foreground" />
        {f.t("legendOpen")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-(--status-warning-fill)" />
        {f.t("legendLow")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="line-through">12</span>
        {f.t("legendFull")}
      </li>
    </ul>
  );
}
