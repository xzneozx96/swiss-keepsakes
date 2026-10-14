import type { CartLineOptionProps, LabCartLine } from "./cart-line-options";

import { Checkbox, Label } from "@heroui/react";
import { useState } from "react";

import { RoomyItem } from "./cart-line-options";
import { CartSummarySheet } from "./cart-summary-sheet";

import { PayLaterIcon, PickupIcon } from "@/components/icons";

/** Lab only: an order in the cart, with its lines already formatted. */
export interface LabCartOrder {
  id: string;
  title: string;
  policy: string;
  pickup: string;
  lines: (LabCartLine & { cents: number })[];
}

export interface CartSelectLabels {
  selectAll: string;
  totalLabel: string;
  nothingNow: string;
  continueLabel: (orders: number) => string;
  money: (rappen: number) => string;
  gifts: (count: number) => string;
}

/** Checkbox with a visible or hidden label (HeroUI Checkbox: control, indicator, content). */
function Check({
  label,
  hideLabel = false,
  isSelected,
  isIndeterminate,
  onChange,
  children,
}: {
  label: string;
  hideLabel?: boolean;
  isSelected: boolean;
  isIndeterminate?: boolean;
  onChange: (selected: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Checkbox
      aria-label={hideLabel ? label : undefined}
      className="items-center"
      isIndeterminate={isIndeterminate}
      isSelected={isSelected}
      onChange={onChange}
    >
      {/* Content is the clickable label that holds the input; the box goes inside it. */}
      <Checkbox.Content className="flex-row items-center gap-2">
        {/* 24px box (HeroUI default 16px is hard to hit on a phone), 16px tick. */}
        <Checkbox.Control className="size-6 rounded-lg">
          <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4 [&_[data-slot$=indeterminate]]:size-3.5" />
        </Checkbox.Control>
        {!hideLabel && <Label>{label}</Label>}
        {children}
      </Checkbox.Content>
    </Checkbox>
  );
}

/**
 * Round 3: the cart with selection (owner request 13.10.2026). `mode` "order" puts one
 * checkbox on each order; "item" also puts one on each gift (Klook cart), and the order
 * checkbox selects all its gifts. The bottom box holds each selected order's subtotal,
 * the total for reference and Continue, as in the owner's reference.
 */
export function CartSelectDemo({
  orders: initial,
  labels,
  mode,
  LineComponent,
  itemSurface = "card",
}: {
  orders: LabCartOrder[];
  labels: CartSelectLabels;
  mode: "order" | "item";
  LineComponent?: (props: CartLineOptionProps) => React.ReactNode;
  itemSurface?: "card" | "open" | "component";
}) {
  const [orders, setOrders] = useState(initial);
  const allIds = orders.flatMap((o) => o.lines.map((l) => l.id));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));

  const isOn = (id: string) => selected.has(id);
  const setMany = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);

      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));

      return next;
    });

  const update = (
    lineId: string,
    change: (
      l: LabCartOrder["lines"][number],
    ) => LabCartOrder["lines"][number] | null,
  ) =>
    setOrders((os) =>
      os
        .map((o) => ({
          ...o,
          lines: o.lines.flatMap((l) => {
            if (l.id !== lineId) return [l];
            const next = change(l);

            return next ? [next] : [];
          }),
        }))
        .filter((o) => o.lines.length > 0),
    );

  const chosen = orders
    .map((o) => ({ order: o, lines: o.lines.filter((l) => isOn(l.id)) }))
    .filter((c) => c.lines.length > 0);
  const Item = LineComponent ?? RoomyItem;
  const selectedCount = allIds.filter(isOn).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Check
          isIndeterminate={selectedCount > 0 && selectedCount < allIds.length}
          isSelected={selectedCount === allIds.length && allIds.length > 0}
          label={labels.selectAll}
          onChange={(on) => setMany(allIds, on)}
        />
        <span className="text-sm text-muted">
          {labels.gifts(allIds.length)}
        </span>
      </div>

      {orders.map((order) => {
        const ids = order.lines.map((l) => l.id);
        const on = ids.filter(isOn).length;

        return (
          <section key={order.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="pt-1">
                <Check
                  hideLabel
                  isIndeterminate={on > 0 && on < ids.length}
                  isSelected={on === ids.length}
                  label={order.title}
                  onChange={(value) => setMany(ids, value)}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-serif text-card-title">{order.title}</h3>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <PayLaterIcon aria-hidden className="shrink-0" size={16} />
                  {order.policy}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <PickupIcon aria-hidden className="shrink-0" size={16} />
                  {order.pickup}
                </p>
              </div>
            </div>
            <ul
              className={
                itemSurface === "open"
                  ? "flex flex-col divide-y divide-separator"
                  : "flex flex-col gap-3"
              }
            >
              {order.lines.map((line) => (
                <li
                  key={line.id}
                  className={
                    itemSurface === "card"
                      ? "flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-surface"
                      : "flex items-center gap-3"
                  }
                >
                  {mode === "item" && (
                    <Check
                      hideLabel
                      isSelected={isOn(line.id)}
                      label={line.name}
                      onChange={(value) => setMany([line.id], value)}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Item
                      line={line}
                      onQuantity={(q) =>
                        update(line.id, (l) => ({
                          ...l,
                          quantity: q,
                          cents: (l.cents / l.quantity) * q,
                          total: labels.money((l.cents / l.quantity) * q),
                        }))
                      }
                      onRemove={() => update(line.id, () => null)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <CartSummarySheet
        labels={labels}
        orders={chosen.map(({ order, lines }) => ({
          id: order.id,
          title: order.title,
          gifts: lines.length,
          subtotal: lines.reduce((sum, line) => sum + line.cents, 0),
        }))}
      />
    </div>
  );
}
