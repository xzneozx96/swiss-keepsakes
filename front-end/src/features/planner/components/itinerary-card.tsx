import type { CSSProperties } from "react";
import type { Plan } from "../lib/plan";

import { Chip } from "@heroui/react";
import clsx from "clsx";

const COLS = "grid grid-cols-[2.75rem_1rem_minmax(0,1fr)] gap-x-3";
const rise = (n: number) =>
  ({ "--d": `${Math.min(n, 10) * 55}ms` }) as CSSProperties;

/** The itinerary the build_itinerary tool returned, as a timeline: time, rail, stop. */
export function ItineraryCard({ plan }: { plan: Plan }) {
  const isNew = (name: string) => plan.added.includes(name);
  const lastStop = plan.items.reduce(
    (acc, i, n) => (i.kind !== "move" ? n : acc),
    -1,
  );

  return (
    <article className="animate-rise w-full overflow-hidden rounded-3xl bg-surface shadow-surface">
      <header className="flex flex-col gap-1 px-5 pt-4 pb-3">
        <h3 className="font-serif text-title">{plan.dayLabel}</h3>
        <p className="text-sm text-muted">
          {plan.summary.start} to {plan.summary.end} · {plan.summary.stops}{" "}
          stops · {plan.summary.walkMinutes} min walking
        </p>
      </header>

      <ol className="px-5 pb-4">
        {plan.items.map((item, n) => {
          if (item.kind === "move")
            return (
              <li
                key={item.id}
                className={clsx(COLS, "animate-rise")}
                style={rise(n)}
              >
                <span />
                <span aria-hidden className="mx-auto w-px bg-separator" />
                <span className="py-2 text-xs text-muted">
                  {item.name}
                  {item.text && ` · ${item.text}`}
                </span>
              </li>
            );
          const lunch = item.kind === "lunch";

          return (
            <li
              key={item.id}
              className={clsx(COLS, "animate-rise")}
              style={rise(n)}
            >
              <span className="pt-px text-sm font-semibold tabular-nums">
                {item.start}
              </span>
              <div className="relative flex flex-col items-center">
                <span
                  aria-hidden
                  className={clsx(
                    "mt-1.5 size-3 shrink-0 rounded-full ring-4 ring-surface",
                    lunch ? "border-2 border-accent bg-surface" : "bg-accent",
                  )}
                />
                {n !== lastStop && (
                  <span aria-hidden className="w-px flex-1 bg-separator" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1 pb-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="font-serif text-body leading-snug font-semibold">
                    {item.name}
                  </h4>
                  {lunch && (
                    <Chip size="sm" variant="secondary">
                      <Chip.Label>Lunch</Chip.Label>
                    </Chip>
                  )}
                  {isNew(item.name) && (
                    <Chip color="success" size="sm" variant="soft">
                      <Chip.Label>New</Chip.Label>
                    </Chip>
                  )}
                  {item.tag && (
                    <Chip size="sm" variant="secondary">
                      <Chip.Label>{item.tag}</Chip.Label>
                    </Chip>
                  )}
                </div>
                <p className="text-sm leading-snug text-muted">{item.text}</p>
                {(item.price || item.source) && (
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    {item.price && (
                      <span className="font-medium">{item.price}</span>
                    )}
                    {item.source && (
                      <a
                        className="text-muted underline underline-offset-2"
                        href={item.source}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Source
                      </a>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {(plan.notes.length > 0 ||
        plan.removed.length > 0 ||
        plan.skipped.length > 0) && (
        <footer className="flex flex-col gap-3 border-t border-separator bg-surface-secondary/50 px-5 py-4 text-sm">
          {plan.removed.length > 0 && (
            <p>
              <span className="font-medium">Removed:</span>{" "}
              <span className="text-muted line-through">
                {plan.removed.join(", ")}
              </span>
            </p>
          )}
          {plan.notes.length > 0 && (
            <div>
              <p className="font-medium">Good to know</p>
              <ul className="list-disc ps-5 text-muted">
                {plan.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {plan.skipped.length > 0 && (
            <div>
              <p className="font-medium">Left out for this day</p>
              <ul className="list-disc ps-5 text-muted">
                {plan.skipped.map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
