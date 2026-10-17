import type { Plan } from "../lib/plan";

import { Chip } from "@heroui/react";

/** The itinerary the build_itinerary tool returned: a timeline with walking legs and prices. */
export function ItineraryCard({ plan }: { plan: Plan }) {
  const isNew = (name: string) => plan.added.includes(name);

  return (
    <article className="ms-10 w-[calc(100%-2.5rem)] overflow-hidden rounded-3xl bg-surface shadow-surface">
      <header className="flex flex-col gap-1 border-b border-separator px-4 py-3">
        <h3 className="font-serif text-title">{plan.dayLabel}</h3>
        <p className="text-sm text-muted">
          {plan.summary.start} to {plan.summary.end} · {plan.summary.stops}{" "}
          stops · {plan.summary.walkMinutes} min walking
        </p>
      </header>

      <ol className="flex flex-col px-4 py-3">
        {plan.items.map((item) =>
          item.kind === "move" ? (
            <li
              key={item.id}
              className="ms-[3.25rem] border-s border-dashed border-separator ps-4 py-1.5 text-xs text-muted"
            >
              {item.name}
              {item.text && ` · ${item.text}`}
            </li>
          ) : (
            <li key={item.id} className="flex gap-3 py-2">
              <span className="w-10 shrink-0 pt-0.5 text-sm font-medium tabular-nums">
                {item.start}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-serif text-body font-semibold">
                    {item.name}
                  </h4>
                  {item.kind === "lunch" && (
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
                <p className="text-sm text-muted">{item.text}</p>
                {item.price && (
                  <p className="text-xs font-medium">{item.price}</p>
                )}
                {item.source && (
                  <a
                    className="w-fit text-xs text-muted underline underline-offset-2"
                    href={item.source}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Source
                  </a>
                )}
              </div>
            </li>
          ),
        )}
      </ol>

      {(plan.notes.length > 0 ||
        plan.removed.length > 0 ||
        plan.skipped.length > 0) && (
        <footer className="flex flex-col gap-2 border-t border-separator bg-surface-secondary/50 px-4 py-3 text-sm">
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
