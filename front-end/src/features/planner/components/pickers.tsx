import type { CalendarDate } from "@internationalized/date";

import { Button, Calendar, Drawer } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import clsx from "clsx";
import { useState } from "react";

import { INTERESTS, type Interest } from "../data/places";
import { WINDOW_FROM, WINDOW_TO, shortDay } from "../lib/hours";

import { PickupDateIcon } from "@/components/icons";
import { QuantityStepper } from "@/components/quantity-stepper";

type Submit = (output: Record<string, unknown>) => void;

interface PickerProps {
  input: Record<string, unknown>;
  disabled: boolean;
  onSubmit: Submit;
}

const chip = (selected: boolean) =>
  clsx(
    "rounded-2xl border-2 bg-surface px-3.5 py-2.5 text-start font-medium outline-none transition-colors focus-visible:focus-ring disabled:opacity-50",
    selected
      ? "border-accent bg-default"
      : "border-transparent shadow-surface hover:bg-surface-secondary",
  );

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 ps-10">{children}</div>;
}

export function StayPicker({ input, disabled, onSubmit }: PickerProps) {
  const options = input.options as {
    id: string;
    label: string;
    hint: string;
  }[];

  return (
    <Wrap>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            className={`${chip(false)} flex flex-col gap-0.5`}
            disabled={disabled}
            type="button"
            onClick={() => onSubmit({ id: o.id, label: o.label })}
          >
            <span>{o.label}</span>
            <span className="text-xs font-normal text-muted">{o.hint}</span>
          </button>
        ))}
      </div>
    </Wrap>
  );
}

export function PartyPicker({ disabled, onSubmit }: PickerProps) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const label = `${adults} adult${adults === 1 ? "" : "s"}${
    children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
  }`;

  return (
    <Wrap>
      <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-surface">
        <QuantityStepper
          label="Adults"
          max={8}
          min={1}
          value={adults}
          onChange={setAdults}
        />
        <QuantityStepper
          label="Children"
          max={6}
          min={0}
          value={children}
          onChange={setChildren}
        />
      </div>
      <Button
        fullWidth
        isDisabled={disabled}
        size="lg"
        onPress={() => onSubmit({ adults, children, label })}
      >
        Continue
      </Button>
    </Wrap>
  );
}

const SUGGESTED = [
  { date: "2026-10-17", hint: "Today" },
  { date: "2026-10-31", hint: "Last day of the Zytturm" },
  { date: "2026-11-21", hint: "Advent opens" },
  { date: "2026-12-15", hint: "Pilatus is open" },
];

export function DatePicker({ disabled, onSubmit }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<CalendarDate | null>(null);
  const pick = (iso: string) => onSubmit({ date: iso, label: shortDay(iso) });

  return (
    <Wrap>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((s) => (
          <button
            key={s.date}
            className={`${chip(false)} flex flex-col`}
            disabled={disabled}
            type="button"
            onClick={() => pick(s.date)}
          >
            <span>{shortDay(s.date)}</span>
            <span className="text-xs font-normal text-muted">{s.hint}</span>
          </button>
        ))}
        <button
          className={`${chip(false)} flex items-center gap-2`}
          disabled={disabled}
          type="button"
          onClick={() => setOpen(true)}
        >
          <PickupDateIcon aria-hidden size={18} />
          Pick another date
        </button>
      </div>
      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog className="flex sheet-max flex-col">
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading className="text-title">
                Choose a day
              </Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Close" />
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-3 overflow-y-auto">
              <p className="text-sm text-muted">
                Opening hours are checked from 17 Oct 2026 to 31 Mar 2027.
              </p>
              <Calendar
                aria-label="Choose a day"
                className="calendar--fluid"
                defaultFocusedValue={parseDate(WINDOW_FROM)}
                maxValue={parseDate(WINDOW_TO)}
                minValue={parseDate(WINDOW_FROM)}
                value={date}
                onChange={setDate}
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
                    {(d) => <Calendar.Cell date={d} />}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </Drawer.Body>
            <Drawer.Footer className="pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <Button
                fullWidth
                className="h-14 text-base"
                isDisabled={!date}
                onPress={() => {
                  if (date) {
                    setOpen(false);
                    pick(date.toString());
                  }
                }}
              >
                Use this day
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Wrap>
  );
}

const STARTS = ["08:30", "10:00", "12:00", "14:00"];
const LENGTHS = [
  { id: "half", label: "Half day", hint: "about 4 hours" },
  { id: "full", label: "Full day", hint: "about 7 hours" },
];

export function TimePicker({ disabled, onSubmit }: PickerProps) {
  const [start, setStart] = useState<string | null>(null);
  const [length, setLength] = useState<string | null>(null);

  return (
    <Wrap>
      <div
        aria-label="Start time"
        className="flex flex-wrap gap-2"
        role="group"
      >
        {STARTS.map((s) => (
          <button
            key={s}
            aria-pressed={start === s}
            className={chip(start === s)}
            disabled={disabled}
            type="button"
            onClick={() => setStart(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div aria-label="Length" className="flex flex-wrap gap-2" role="group">
        {LENGTHS.map((l) => (
          <button
            key={l.id}
            aria-pressed={length === l.id}
            className={`${chip(length === l.id)} flex flex-col`}
            disabled={disabled}
            type="button"
            onClick={() => setLength(l.id)}
          >
            <span>{l.label}</span>
            <span className="text-xs font-normal text-muted">{l.hint}</span>
          </button>
        ))}
      </div>
      <Button
        fullWidth
        isDisabled={disabled || !start || !length}
        size="lg"
        onPress={() =>
          onSubmit({
            start,
            length,
            label: `${start}, ${length === "full" ? "full day" : "half day"}`,
          })
        }
      >
        Continue
      </Button>
    </Wrap>
  );
}

export function InterestsPicker({ disabled, onSubmit }: PickerProps) {
  const [chosen, setChosen] = useState<Interest[]>([]);
  const toggle = (id: Interest) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Wrap>
      <div aria-label="Interests" className="flex flex-wrap gap-2" role="group">
        {INTERESTS.map((i) => (
          <button
            key={i.id}
            aria-pressed={chosen.includes(i.id)}
            className={chip(chosen.includes(i.id))}
            disabled={disabled}
            type="button"
            onClick={() => toggle(i.id)}
          >
            {i.label}
          </button>
        ))}
      </div>
      <Button
        fullWidth
        isDisabled={disabled || chosen.length === 0}
        size="lg"
        onPress={() =>
          onSubmit({
            interests: chosen,
            label: chosen
              .map((c) => INTERESTS.find((i) => i.id === c)?.label)
              .join(", "),
          })
        }
      >
        Continue
      </Button>
    </Wrap>
  );
}

export function DietPicker({ disabled, onSubmit }: PickerProps) {
  return (
    <Wrap>
      <div className="flex flex-wrap gap-2">
        {[
          { id: "any", label: "No preference" },
          { id: "veg", label: "Vegetarian" },
        ].map((d) => (
          <button
            key={d.id}
            className={chip(false)}
            disabled={disabled}
            type="button"
            onClick={() => onSubmit({ diet: d.id, label: d.label })}
          >
            {d.label}
          </button>
        ))}
      </div>
    </Wrap>
  );
}

export function NextPicker({ input, disabled, onSubmit }: PickerProps) {
  const options = input.options as {
    id: string;
    label: string;
    group: string;
  }[];
  const groups = [...new Set(options.map((o) => o.group))];

  return (
    <Wrap>
      {groups.map((g) => (
        <div key={g} className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            {g === "Adjust" ? "Adjust the plan" : "Next step"}
          </span>
          <div className="flex flex-wrap gap-2">
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <button
                  key={o.id}
                  className={chip(false)}
                  disabled={disabled}
                  type="button"
                  onClick={() => onSubmit({ id: o.id, label: o.label })}
                >
                  {o.label}
                </button>
              ))}
          </div>
        </div>
      ))}
    </Wrap>
  );
}
