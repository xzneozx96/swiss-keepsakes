import type { Key } from "@heroui/react";

import {
  Description,
  Label,
  ListBox,
  NumberField,
  Select,
  Tag,
  TagGroup,
} from "@heroui/react";
import { useState } from "react";

import { QuantityStepper } from "@/components/quantity-stepper";

/** Lab only: quantity pickers for the C03 sheet. Each option keeps its own value. */
export interface QuantityOptionProps {
  label: string;
  /** Units the guest can request, e.g. 4. */
  max: number;
  /** "Up to 4 available". */
  hint: string;
}

function useQuantity() {
  return useState(1);
}

/** A · Current: HeroUI NumberField, boxed, label above. */
export function QuantityBoxed({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();

  return (
    <NumberField
      className="w-40"
      maxValue={max}
      minValue={1}
      value={value}
      onChange={setValue}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
      <Description>{hint}</Description>
    </NumberField>
  );
}

/** B · Airbnb guest row (chosen 13.10.2026): the shared QuantityStepper. */
export function QuantityRow({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();

  return (
    <QuantityStepper
      hint={hint}
      label={label}
      max={max}
      value={value}
      onChange={setValue}
    />
  );
}

/** C · Klook pill: one soft pill holding − n +, next to the label. */
export function QuantityPill({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();
  const step =
    "size-10 rounded-full border-0 bg-transparent text-foreground disabled:opacity-30";

  return (
    <NumberField
      className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1"
      maxValue={max}
      minValue={1}
      value={value}
      onChange={setValue}
    >
      <Label className="text-base font-semibold">{label}</Label>
      <NumberField.Group className="flex h-10 items-center rounded-full border-0 bg-surface-secondary shadow-none">
        <NumberField.DecrementButton className={step} />
        <NumberField.Input className="w-8 bg-transparent p-0 text-center text-base font-semibold" />
        <NumberField.IncrementButton className={step} />
      </NumberField.Group>
      <Description className="w-full px-0 text-end">{hint}</Description>
    </NumberField>
  );
}

/** D · Quick chips (Booking.com rooms): tap 1, 2, 3 or 4; fits small stock. */
export function QuantityChips({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();
  const onChange = (keys: "all" | Set<Key>) => {
    const [first] = keys === "all" ? [] : [...keys];

    if (first !== undefined) setValue(Number(first));
  };

  return (
    <TagGroup
      selectedKeys={new Set([String(value)])}
      selectionMode="single"
      size="lg"
      onSelectionChange={onChange}
    >
      <Label className="text-base font-semibold">{label}</Label>
      <TagGroup.List className="grid grid-cols-4 gap-2 pt-2">
        {Array.from({ length: max }, (_, i) => String(i + 1)).map((n) => (
          <Tag
            key={n}
            className="h-11 justify-center rounded-2xl text-base"
            id={n}
            textValue={n}
          >
            {n}
          </Tag>
        ))}
      </TagGroup.List>
      <Description>{hint}</Description>
    </TagGroup>
  );
}

/** E · Big centred stepper (Apple Store bag): large round buttons, large number. */
export function QuantityLarge({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();
  const round =
    "size-12 rounded-full border-0 bg-surface-secondary text-foreground disabled:opacity-30";

  return (
    <NumberField
      className="items-center gap-2"
      maxValue={max}
      minValue={1}
      value={value}
      onChange={setValue}
    >
      <Label className="text-base font-semibold">{label}</Label>
      <NumberField.Group className="flex h-auto items-center gap-6 overflow-visible border-0 bg-transparent shadow-none">
        <NumberField.DecrementButton className={round} />
        <NumberField.Input className="w-12 p-0 text-center font-serif text-[34px] leading-none" />
        <NumberField.IncrementButton className={round} />
      </NumberField.Group>
      <Description>{hint}</Description>
    </NumberField>
  );
}

/** F · Dropdown (Amazon): "Quantity 1 ▾", compact; one more tap to change. */
export function QuantitySelect({ label, max, hint }: QuantityOptionProps) {
  const [value, setValue] = useQuantity();

  return (
    <Select
      className="w-40"
      selectedKey={String(value)}
      onSelectionChange={(key) => key !== null && setValue(Number(key))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Description>{hint}</Description>
      <Select.Popover>
        <ListBox>
          {Array.from({ length: max }, (_, i) => String(i + 1)).map((n) => (
            <ListBox.Item key={n} id={n} textValue={n}>
              {n}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
