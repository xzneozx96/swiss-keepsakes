import type { CalendarDate } from "@internationalized/date";

import { Button, Calendar, Drawer } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import clsx from "clsx";
import { useId, useState } from "react";

import { INTERESTS, type Interest } from "../data/places";
import { WINDOW_FROM, WINDOW_TO, shortDay } from "../lib/hours";

import {
  ArrowUpRightIcon,
  PickupDateIcon,
  SelectedIcon,
} from "@/components/icons";
import { QuantityStepper } from "@/components/quantity-stepper";

type Submit = (output: Record<string, unknown>) => void;

interface PickerProps {
  input: Record<string, unknown>;
  disabled: boolean;
  onSubmit: Submit;
}

/**
 * Options sit on the guest's side as white cards with the app's surface shadow (no borders).
 * They fill one even grid. A chosen one follows the gift option style (C03): a red ring and
 * a check on the top edge, so nothing shifts when it is picked.
 */
const optionBase =
  "animate-rise card-hover min-h-12 rounded-2xl bg-surface text-[15px] text-foreground shadow-surface outline-none transition-[background-color,box-shadow,scale] duration-150 focus-visible:focus-ring disabled:pointer-events-none disabled:text-muted motion-safe:active:scale-[0.98]";

const chosen = "ring-2 ring-accent";

const delay = (i = 0) =>
  ({ "--d": `${Math.min(i, 8) * 45}ms` }) as React.CSSProperties;

/** Options sit on the right, under the question, as one block of equal width. */
export function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();

  return (
    <div className="ms-auto flex w-full max-w-[92%] flex-col gap-2">
      <span className="animate-rise self-end text-xs text-muted" id={id}>
        {label}
      </span>
      <div aria-labelledby={id} className="flex flex-col gap-2" role="group">
        {children}
      </div>
    </div>
  );
}

const Grid = ({
  cols,
  children,
}: {
  cols: 2 | 4;
  children: React.ReactNode;
}) => (
  <div
    className={clsx("grid gap-2", cols === 4 ? "grid-cols-4" : "grid-cols-2")}
  >
    {children}
  </div>
);

/** A centred cell for a grid of choices. */
export function Chip({
  selected = false,
  hint,
  index = 0,
  className,
  children,
  ...props
}: {
  selected?: boolean;
  hint?: string;
  index?: number;
  children: React.ReactNode;
} & React.ComponentProps<"button">) {
  return (
    <button
      aria-pressed={selected || undefined}
      className={clsx(
        optionBase,
        "relative flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-center font-medium tabular-nums",
        selected && chosen,
        className,
      )}
      style={delay(index)}
      type="button"
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {selected && (
        <SelectedIcon
          aria-hidden
          className="animate-pop absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent"
          weight="Filled"
        />
      )}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </button>
  );
}

/** A full-width choice with a trailing arrow, for lists of unequal text. */
export function Row({
  hint,
  index = 0,
  children,
  ...props
}: {
  hint?: string;
  index?: number;
  children: React.ReactNode;
} & React.ComponentProps<"button">) {
  return (
    <button
      className={clsx(
        optionBase,
        "group flex w-full items-center gap-3 px-4 py-2.5 text-start",
      )}
      style={delay(index)}
      type="button"
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{children}</span>
        {hint && (
          <span className="line-clamp-1 text-sm text-muted">{hint}</span>
        )}
      </span>
      <ArrowUpRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
      />
    </button>
  );
}

const Continue = ({
  disabled,
  onPress,
  children = "Continue",
}: {
  disabled?: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) => (
  <Button
    fullWidth
    className="animate-rise min-h-12"
    isDisabled={disabled}
    size="lg"
    onPress={onPress}
  >
    {children}
  </Button>
);

export function StayPicker({ input, disabled, onSubmit }: PickerProps) {
  const options = input.options as {
    id: string;
    label: string;
    hint: string;
  }[];

  return (
    <Group label="Choose one">
      {options.map((o, i) => (
        <Row
          key={o.id}
          disabled={disabled}
          hint={o.hint}
          index={i}
          onClick={() => onSubmit({ id: o.id, label: o.label })}
        >
          {o.label}
        </Row>
      ))}
    </Group>
  );
}

export function PartyPicker({ disabled, onSubmit }: PickerProps) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const label = `${adults} adult${adults === 1 ? "" : "s"}${
    children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
  }`;

  return (
    <Group label="Set the numbers">
      <div className="animate-rise flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-surface">
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
      <Continue
        disabled={disabled}
        onPress={() => onSubmit({ adults, children, label })}
      >
        Continue · {label}
      </Continue>
    </Group>
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
    <Group label="Choose one">
      <Grid cols={2}>
        {SUGGESTED.map((s, i) => (
          <Chip
            key={s.date}
            disabled={disabled}
            hint={s.hint}
            index={i}
            onClick={() => pick(s.date)}
          >
            {shortDay(s.date)}
          </Chip>
        ))}
        <Chip
          className="col-span-2 flex-row gap-2"
          disabled={disabled}
          index={SUGGESTED.length}
          onClick={() => setOpen(true)}
        >
          <PickupDateIcon aria-hidden size={18} />
          Pick another date
        </Chip>
      </Grid>
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
    </Group>
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
    <Group label="Pick a start time and a length">
      <Grid cols={4}>
        {STARTS.map((s, i) => (
          <Chip
            key={s}
            disabled={disabled}
            index={i}
            selected={start === s}
            onClick={() => setStart(s)}
          >
            {s}
          </Chip>
        ))}
      </Grid>
      <Grid cols={2}>
        {LENGTHS.map((l, i) => (
          <Chip
            key={l.id}
            disabled={disabled}
            hint={l.hint}
            index={STARTS.length + i}
            selected={length === l.id}
            onClick={() => setLength(l.id)}
          >
            {l.label}
          </Chip>
        ))}
      </Grid>
      {start && length && (
        <Continue
          disabled={disabled}
          onPress={() =>
            onSubmit({
              start,
              length,
              label: `${start}, ${length === "full" ? "full day" : "half day"}`,
            })
          }
        />
      )}
    </Group>
  );
}

export function InterestsPicker({ disabled, onSubmit }: PickerProps) {
  const [picked, setPicked] = useState<Interest[]>([]);
  const toggle = (id: Interest) =>
    setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Group label="Choose any">
      <Grid cols={2}>
        {INTERESTS.map((it, n) => (
          <Chip
            key={it.id}
            className={
              n === INTERESTS.length - 1 && INTERESTS.length % 2
                ? "col-span-2"
                : undefined
            }
            disabled={disabled}
            index={n}
            selected={picked.includes(it.id)}
            onClick={() => toggle(it.id)}
          >
            {it.label}
          </Chip>
        ))}
      </Grid>
      {picked.length > 0 && (
        <Continue
          disabled={disabled}
          onPress={() =>
            onSubmit({
              interests: picked,
              label: picked
                .map((c) => INTERESTS.find((i) => i.id === c)?.label)
                .join(", "),
            })
          }
        >
          Continue · {picked.length}
        </Continue>
      )}
    </Group>
  );
}

export function DietPicker({ disabled, onSubmit }: PickerProps) {
  return (
    <Group label="Choose one">
      <Grid cols={2}>
        {[
          { id: "any", label: "No preference" },
          { id: "veg", label: "Vegetarian" },
        ].map((d, i) => (
          <Chip
            key={d.id}
            disabled={disabled}
            index={i}
            onClick={() => onSubmit({ diet: d.id, label: d.label })}
          >
            {d.label}
          </Chip>
        ))}
      </Grid>
    </Group>
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
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <Group key={g} label={g === "Adjust" ? "Adjust the plan" : "Next step"}>
          {options
            .filter((o) => o.group === g)
            .map((o, n) => (
              <Row
                key={o.id}
                disabled={disabled}
                index={n}
                onClick={() => onSubmit({ id: o.id, label: o.label })}
              >
                {o.label}
              </Row>
            ))}
        </Group>
      ))}
    </div>
  );
}
