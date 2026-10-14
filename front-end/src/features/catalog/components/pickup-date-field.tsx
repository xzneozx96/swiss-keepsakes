import type { CalendarDate, DateValue } from "@internationalized/date";

import { Calendar } from "@heroui/react";
import { useId, useState } from "react";

export interface PickupDateFieldProps {
  label: string;
  /** "Earliest Fri 16 Oct". */
  description: string;
  /** Demo-clock today: past days are disabled (struck through), per the Calendar card. */
  today: CalendarDate;
  /** First valid pickup day; the calendar opens on its month. */
  earliest: CalendarDate;
  /** Days still being prepared or closed: pale (unavailable), not disabled. */
  isUnavailable: (date: DateValue) => boolean;
  /** Why a pale day cannot be picked (YYYY-MM-DD), shown when the guest taps it. */
  reasonFor: (isoDate: string) => string | undefined;
  legend: { title: string; prep: string; closed: string };
  value: CalendarDate | null;
  onChange: (value: CalendarDate) => void;
  error?: string;
}

const paleDot = (
  <span
    aria-hidden
    className="mt-[5px] size-2 shrink-0 rounded-full bg-foreground opacity-50"
  />
);

/**
 * Pickup date on C03, picked on an inline calendar inside the add-to-cart sheet
 * (Airbnb pattern; Calendar card). Pale days carry their reason in the legend.
 */
export function PickupDateField({
  label,
  description,
  today,
  earliest,
  isUnavailable,
  reasonFor,
  legend,
  value,
  onChange,
  error,
}: PickupDateFieldProps) {
  const labelId = useId();
  const helpId = useId();
  const [tapped, setTapped] = useState<string>();
  const message = tapped ?? error;

  // React Aria ignores presses on unavailable days; answer them with the reason
  // (Calendar card: a tapped closed day gets an error message).
  // Unavailable cells have pointer-events: none (HeroUI), so a tap lands on their <td>.
  const explain = (target: EventTarget) => {
    const el = target as HTMLElement;
    const selector = '[data-unavailable="true"][data-date]';
    const cell =
      el.closest<HTMLElement>(selector) ??
      el.closest("td")?.querySelector<HTMLElement>(selector);

    if (cell?.dataset.date) setTapped(reasonFor(cell.dataset.date));
  };

  return (
    // Click and Enter only explain pale days; picking stays with the calendar grid.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="flex flex-col gap-3"
      id="gift-date"
      onClick={(e) => explain(e.target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") explain(e.target);
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-heading font-medium text-foreground" id={labelId}>
          {label}
        </span>
        <span className="text-sm text-muted" id={helpId}>
          {description}
        </span>
      </div>
      <Calendar
        aria-describedby={helpId}
        aria-labelledby={labelId}
        className="calendar--fluid"
        defaultFocusedValue={earliest}
        isDateUnavailable={isUnavailable}
        isInvalid={error !== undefined}
        minValue={today}
        value={value}
        onChange={(v) => {
          setTapped(undefined);
          onChange(v);
        }}
      >
        <Calendar.Header>
          <Calendar.Heading />
          <Calendar.NavButton slot="previous" />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>
            {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
          </Calendar.GridHeader>
          <Calendar.GridBody>
            {(date) => (
              <Calendar.Cell
                // React Aria marks the real today; the prototype marks the demo today.
                className={
                  date.compare(today) === 0 ? "calendar__cell--demo-today" : ""
                }
                data-date={date.toString()}
                date={date}
              />
            )}
          </Calendar.GridBody>
        </Calendar.Grid>
      </Calendar>
      <div className="flex flex-col gap-1 text-xs text-muted">
        <p className="font-medium text-foreground">{legend.title}</p>
        <p className="flex gap-2">
          {paleDot}
          {legend.prep}
        </p>
        <p className="flex gap-2">
          {paleDot}
          {legend.closed}
        </p>
      </div>
      {message && (
        <p data-visible className="field-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
