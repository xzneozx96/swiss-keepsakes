import { Description, Label, NumberField } from "@heroui/react";

interface QuantityProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

interface QuantityStepperProps extends QuantityProps {
  label: string;
  /** Muted line under the label, e.g. "4 available". */
  hint?: string;
}

// One quantity control for C03 and C04 (owner request 13.10.2026): the cart's box.
const stepButton =
  "flex size-11 items-center justify-center rounded-lg border-0 bg-transparent outline-none transition-colors hover:bg-default focus-visible:focus-ring active:bg-default-hover disabled:opacity-30";

/** The boxed − n +; must sit inside a NumberField. */
function StepperGroup() {
  return (
    <NumberField.Group className="inline-flex h-auto w-auto items-center rounded-xl border border-border bg-surface shadow-none">
      <NumberField.DecrementButton className={stepButton} />
      <NumberField.Input className="w-7 p-0 text-center text-sm font-semibold tabular-nums" />
      <NumberField.IncrementButton className={stepButton} />
    </NumberField.Group>
  );
}

/**
 * Quantity as a row (Airbnb guests picker, owner choice 13.10.2026, Lab option B):
 * label and hint on the left, the boxed − n + on the right. HeroUI NumberField
 * underneath, so typing and arrow keys work as usual.
 */
export function QuantityStepper({
  label,
  hint,
  value,
  min = 1,
  max,
  onChange,
}: QuantityStepperProps) {
  return (
    <NumberField
      className="quantity-stepper flex-row items-center justify-between gap-4"
      maxValue={max}
      minValue={min}
      value={value}
      onChange={(v) => onChange(Number.isNaN(v) ? min : v)}
    >
      <div className="flex flex-col">
        <Label className="text-heading">{label}</Label>
        {hint && <Description className="px-0">{hint}</Description>}
      </div>
      <StepperGroup />
    </NumberField>
  );
}

/**
 * The same boxed − n + without a visible label, for rows that already say what it is
 * (a cart line). `label` is the accessible name, e.g. "Quantity".
 */
export function QuantityBox({
  label,
  value,
  min = 1,
  max,
  onChange,
}: QuantityProps & { label: string }) {
  return (
    <NumberField
      aria-label={label}
      className="quantity-stepper w-auto"
      maxValue={max}
      minValue={min}
      value={value}
      onChange={(v) => onChange(Number.isNaN(v) ? min : v)}
    >
      <StepperGroup />
    </NumberField>
  );
}

const largeStepButton =
  "flex size-16 shrink-0 items-center justify-center rounded-2xl border-0 bg-transparent outline-none transition-colors hover:bg-default focus-visible:focus-ring active:bg-default-hover disabled:opacity-30 [&_svg]:size-6";

/**
 * The same − n + at full width with a large number to type into, for a screen that asks
 * one count at a time (C21). `label` is the accessible name; the screen's heading shows it.
 */
export function QuantityLarge({
  label,
  value,
  min = 0,
  max,
  onChange,
}: QuantityProps & { label: string }) {
  return (
    <NumberField
      aria-label={label}
      className="quantity-stepper w-full"
      maxValue={max}
      minValue={min}
      value={value}
      onChange={(v) => onChange(Number.isNaN(v) ? min : v)}
    >
      <NumberField.Group className="flex h-auto w-full items-center rounded-3xl border border-border bg-surface p-2 shadow-none">
        <NumberField.DecrementButton className={largeStepButton} />
        <NumberField.Input className="h-16 min-w-0 flex-1 p-0 text-center text-display font-semibold tabular-nums" />
        <NumberField.IncrementButton className={largeStepButton} />
      </NumberField.Group>
    </NumberField>
  );
}
