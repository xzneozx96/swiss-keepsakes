export interface RankedRow {
  id: string;
  label: string;
  value: number;
  valueText: string;
  /** "42%" of the list's whole. */
  share: string;
  colour: string;
  /** Under the bar on the left: "12 sold", "−24% dropped off". */
  detail?: string | null;
}

/**
 * A ranked list in P02's "By product group" shape (1.17r): the name wraps to two lines at
 * most (phones have no hover for a truncated name) and never runs into the amount, which
 * stays right-aligned on the first line; the bar sits under them, details in small text.
 * Plain HTML, so screen readers read it as a list.
 * `scale` draws every bar against one total (a funnel); default the largest row.
 */
export function RankedList({
  rows,
  label,
  scale,
}: {
  rows: RankedRow[];
  label: string;
  scale?: number;
}) {
  const max = scale ?? Math.max(...rows.map((r) => r.value), 0);

  return (
    <ul aria-label={label} className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id} className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 text-sm" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {row.valueText}
            </span>
          </div>
          <span
            aria-hidden
            className="mt-1.5 block h-2 overflow-hidden rounded-full bg-(--chart-track)"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${max ? Math.max(0, (row.value / max) * 100) : 0}%`,
                background: row.colour,
              }}
            />
          </span>
          <span className="mt-1 flex justify-between gap-3 text-xs text-muted tabular-nums">
            <span className="min-w-0">{row.detail ?? ""}</span>
            <span className="shrink-0">{row.share}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
